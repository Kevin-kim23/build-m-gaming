import test from 'node:test';
import assert from 'node:assert/strict';
import {createMaintenanceCoordinator,createBoundedMaintenanceJob,createExpiredRecordPurger,createModerationCleanupRetrier,createCompletedDeletionPurger} from '../server/deletion-maintenance.js';
import {MAINTENANCE_POLICY,MAINTENANCE_FUNCTION_OPTIONS} from '../server/maintenance-policy.js';
import {createScheduledMaintenance} from '../server/scheduled-maintenance.js';

function fixture(policy=MAINTENANCE_POLICY) {
  const records=new Map();let clock=1000,serial=Promise.resolve(),token=0;
  const transact=operation=>{
    const pending=serial.then(async()=>{
      const draft=structuredClone(records);
      const result=await operation({get:async key=>draft.get(key),set:(key,value)=>draft.set(key,structuredClone(value)),delete:key=>draft.delete(key)});
      records.clear();for(const entry of draft)records.set(...entry);return result;
    });serial=pending.catch(()=>{});return pending;
  };
  const now=()=>clock,advance=ms=>{clock+=ms;};
  return {records,transact,now,advance,policy,queue:(...args)=>queue(records,...args),
    coordinator:createMaintenanceCoordinator({transact,now,policy,token:()=>String(++token)})};
}
function queue(records,name,size,limit,visit=async()=>{}) {
  const items=new Map(Array.from({length:size},(_,i)=>[String(i).padStart(3,'0'),true]));
  const expiry=name!=='deletions';
  for(const id of items.keys())records.set(`${name}/${id}`,{status:'pending',expiresAt:1000});
  return {name,limit,items,expiryCursor:expiry,
    readPage:async(cursor,count)=>({items:[...items.keys()].filter(id=>!cursor||(cursor.id?id>cursor.id:1000>=cursor.expiresAt)).sort().slice(0,count).map(id=>({id,cursor:{id,...(expiry?{expiresAt:1000}:{})}}))}),
    visit:async id=>{await visit(id);items.delete(id);if(expiry)records.delete(`${name}/${id}`);else records.set(`${name}/${id}`,{status:'completed'});return true;}};
}

test('100-item cap, durable cursor and scan wrap pass a permanently failed pending deletion',async()=>{
  const f=fixture(),visited=[];
  const source=f.queue('deletions',250,100,async id=>{visited.push(id);if(id==='000')throw Error('private UID and SDK detail');});
  const run=createBoundedMaintenanceJob({...f,job:'deletion-retry',sources:[source]});
  const first=await run('first');assert.equal(first.visited,100);assert.equal(first.failed,1);assert.equal(first.limitReached,true);
  const second=await run('second');assert.equal(second.visited,100);assert.equal(second.failed,0);
  const third=await run('third');assert.equal(third.visited,50);assert.equal(third.limitReached,false);
  assert.deepEqual(f.records.get('maintenanceRuns/deletion-retry').cursors,{});
  const fourth=await run('fourth');assert.equal(fourth.visited,1);assert.equal(fourth.failed,1);
  assert.deepEqual([...source.items.keys()],['000'],'A failed pending request is not discarded');
  assert.ok(visited.includes('249'));
  assert.doesNotMatch(JSON.stringify([first,second,third,fourth]),/private|UID|SDK|000/);
});

test('each expiry queue keeps its own cap and cannot purge the separate report dedup collection',async()=>{
  const f=fixture();
  const sources=['deletions','rateLimits','reportDaily','nicknameReports','moderationActions'].map(name=>f.queue(name,30,20));
  const result=await createBoundedMaintenanceJob({...f,job:'expired-records',sources})('one');
  assert.equal(result.visited,100);
  for(const counts of Object.values(result.collections))assert.equal(counts.visited,20);
  assert.throws(()=>createExpiredRecordPurger({...f,collection:'reportDedup'}),/maintenance-invalid-collection/);
});

test('expiry processes at most 10 concurrently and checkpoints after the entire ordered wave settles',async()=>{
  const f=fixture();let active=0,maximum=0;
  const source=f.queue('rateLimits',35,25,async id=>{
    active++;maximum=Math.max(active,maximum);await new Promise(resolve=>setImmediate(resolve));active--;
    if(id==='004')throw Error('temporary');
  });source.concurrency=MAINTENANCE_POLICY.expiryConcurrency;
  const run=createBoundedMaintenanceJob({...f,job:'expired-records',sources:[source]});
  const first=await run('first');assert.equal(first.visited,25);assert.equal(first.failed,1);assert.equal(maximum,10);
  assert.equal(f.records.get('maintenanceRuns/expired-records').cursors.rateLimits.id,undefined);
  assert.equal(f.records.get('maintenanceRuns/expired-records').cursors.rateLimits.expiresAt,1000);
  assert.equal((await run('second')).visited,11);
  assert.deepEqual([...source.items.keys()],['004']);
  assert.equal((await run('third')).failed,1);
  assert.deepEqual(MAINTENANCE_POLICY.expiryLimits,{deletions:1000,rateLimits:12000,reportDaily:12000,nicknameReports:1000,moderationActions:1000});
});

test('timestamp-only expiry cursor resumes every remaining document tied at the cap without persisting deleted IDs',async()=>{
  const f=fixture(),source=f.queue('rateLimits',13,10);source.concurrency=10;
  const run=createBoundedMaintenanceJob({...f,job:'expired-records',sources:[source]});
  assert.equal((await run('one')).visited,10);
  assert.deepEqual(f.records.get('maintenanceRuns/expired-records').cursors.rateLimits,{expiresAt:1000,updatedAt:f.now()});
  assert.equal((await run('two')).visited,3);assert.equal(source.items.size,0);
});

test('mixed failed/purged expiry waves resume fairly after a time-budget interruption',async()=>{
  const f=fixture({...MAINTENANCE_POLICY,workerBudgetMs:5});
  const source=f.queue('rateLimits',13,10,async id=>{f.advance(1);if(['000','003'].includes(id))throw Error('retry');});
  source.concurrency=5;
  const run=createBoundedMaintenanceJob({...f,job:'expired-records',sources:[source]});
  const first=await run('one');assert.equal(first.visited,5);assert.equal(first.budgetReached,true);
  assert.equal(f.records.get('maintenanceRuns/expired-records').cursors.rateLimits.id,'003');
  for(let i=0;i<4;i++)await run(String(i+2));
  assert.deepEqual([...source.items.keys()],['000','003']);
});

test('90-day completed deletion purge clears both jobs and cannot retain the deleted UID for another 90 days',async()=>{
  const f=fixture(),uid='completed-synthetic';
  f.records.set(`deletions/${uid}`,{status:'completed',completedAt:f.now()-MAINTENANCE_POLICY.cursorRetentionMs,expiresAt:f.now()});
  f.records.set('maintenanceRuns/deletion-retry',{cursors:{deletions:{id:uid,updatedAt:f.now()}}});
  const purge=createCompletedDeletionPurger({...f,getUser:async()=>{throw Object.assign(Error('missing'),{code:'auth/user-not-found'});}});
  const source={name:'deletions',expiryCursor:true,limit:1,visit:purge,
    readPage:async()=>({items:f.records.has(`deletions/${uid}`)?[{id:uid,cursor:{id:uid,expiresAt:f.now()}}]:[]})};
  await createBoundedMaintenanceJob({...f,job:'expired-records',sources:[source]})('first');
  assert.equal(f.records.has(`deletions/${uid}`),false);
  assert.equal(JSON.stringify([...f.records]).includes(uid),false);
  f.advance(89*24*60*60*1000);
  await f.coordinator.claim('expired-records','later');
  assert.equal(JSON.stringify([...f.records]).includes(uid),false);
});

test('checkpoint cannot resurrect an ID cleared by another purger while retaining its own lease',async()=>{
  const f=fixture(),uid='stale-synthetic';
  f.records.set(`rateLimits/${uid}`,{expiresAt:f.now()});
  const lease=await f.coordinator.claim('expired-records','one');
  const cached={rateLimits:{id:uid,expiresAt:f.now(),updatedAt:f.now()}};
  await f.coordinator.checkpoint('expired-records',lease.leaseToken,cached);
  await createExpiredRecordPurger({...f,collection:'rateLimits'})(uid);
  await f.coordinator.checkpoint('expired-records',lease.leaseToken,cached);
  assert.equal(JSON.stringify([...f.records]).includes(uid),false);
  assert.equal(f.records.get('maintenanceRuns/expired-records').leaseToken,lease.leaseToken);
});

test('time budget saves progress and rotates queues rather than starving later collections',async()=>{
  const f=fixture({...MAINTENANCE_POLICY,workerBudgetMs:5});
  const sources=['deletions','rateLimits','reportDaily'].map(name=>f.queue(name,10,20,async()=>f.advance(6)));
  const run=createBoundedMaintenanceJob({...f,job:'expired-records',sources});
  for(let i=0;i<3;i++){
    const result=await run(String(i));assert.equal(result.visited,1);assert.equal(result.budgetReached,true);
    assert.equal(result.collections[sources[i].name].visited,1);
  }
  for(const source of sources)assert.equal(source.items.size,9);
});

test('lease rejects overlap, expires safely, and prevents an old owner from checkpointing or releasing a new owner',async()=>{
  const f=fixture(),c=f.coordinator;
  const first=await c.claim('deletion-retry','a');
  await assert.rejects(c.claim('deletion-retry','b'),/maintenance-busy/);
  f.advance(MAINTENANCE_POLICY.leaseMs);
  const second=await c.claim('deletion-retry','b');
  await assert.rejects(c.checkpoint('deletion-retry',first.leaseToken,{}),/maintenance-lease-lost/);
  await c.release('deletion-retry',first.leaseToken,true);
  assert.equal(f.records.get('maintenanceRuns/deletion-retry').leaseToken,second.leaseToken);
  await c.release('deletion-retry',second.leaseToken,true);
  assert.deepEqual(await c.claim('deletion-retry','b'),{skipped:'duplicate'});
});

test('duplicate success costs no repeated work; failed delivery stops after three attempts and a later schedule can try again',async()=>{
  const f=fixture();let queries=0;
  const run=createBoundedMaintenanceJob({...f,job:'deletion-retry',sources:[{name:'deletions',limit:100,
    readPage:async()=>{queries++;throw Error('sensitive query');},visit:async()=>true}]});
  for(let i=0;i<3;i++)await assert.rejects(run('same'),/sensitive query/);
  assert.equal((await run('same')).skipped,'retry-limit');assert.equal(queries,3);
  await assert.rejects(run('later'),/sensitive query/);assert.equal(queries,4);
  const successful=createBoundedMaintenanceJob({...f,job:'deletion-retry',sources:[f.queue('deletions',1,100)]});
  assert.equal((await successful('success')).visited,1);
  assert.equal((await successful('success')).skipped,'duplicate');
});

test('aborted page resumes after durable progress and expired cursor IDs are cleared on the next claim',async()=>{
  const f=fixture({...MAINTENANCE_POLICY,pageSize:1});let query=0;
  const source=f.queue('deletions',3,100),read=source.readPage;
  source.readPage=async(...args)=>{if(++query===2)throw Error('temporary');return read(...args);};
  const run=createBoundedMaintenanceJob({...f,job:'deletion-retry',sources:[source]});
  await assert.rejects(run('one'),/temporary/);
  assert.equal(f.records.get('maintenanceRuns/deletion-retry').cursors.deletions.id,'000');
  assert.equal((await run('one')).visited,2);
  f.records.set('maintenanceRuns/expired-records',{cursors:{rateLimits:{id:'private-old-id',updatedAt:f.now()}}});
  f.advance(MAINTENANCE_POLICY.cursorRetentionMs);
  assert.deepEqual((await f.coordinator.claim('expired-records','two')).cursors,{});
});

test('expiry rechecks deadline and moderation status transactionally and preserves pending/undone reports',async()=>{
  const f=fixture();
  const report=createExpiredRecordPurger({...f,collection:'nicknameReports',eligible:r=>['resolved','dismissed'].includes(r.status)});
  for(const status of ['pending','unknown','resolved','dismissed']){
    f.records.set('nicknameReports/test',{status,expiresAt:f.now()});
    assert.equal(await report('test'),['resolved','dismissed'].includes(status));
  }
  f.records.set('nicknameReports/test',{status:'resolved',expiresAt:f.now()+1});
  assert.equal(await report('test'),false);
  f.records.set('nicknameReports/test',{status:'pending'});assert.equal(await report('test'),false);
  for(const collection of ['reportDaily','moderationActions']){
    const purge=createExpiredRecordPurger({...f,collection});
    f.records.set(`${collection}/test`,{expiresAt:f.now()+1});assert.equal(await purge('test'),false);
    f.advance(1);assert.equal(await purge('test'),true);assert.equal(await purge('test'),false);
  }
});

test('minimal moderation cleanup retries survive expired audit deletion and never recreate original reports',async()=>{
  const f=fixture(),job={targetUid:'target',reporterUid:'reporter',obsoleteRevision:3,createdAt:f.now()};
  let failure=true,calls=0;
  f.records.set('moderationCleanup/action',job);
  f.records.set('moderationActions/action',{...job,cleanupObsoleteRevision:3,cleanupPending:true,expiresAt:f.now()});
  const retry=createModerationCleanupRetrier({...f,cleanupDedup:async(uid,revision)=>{
    assert.equal(uid,'target');assert.equal(revision,3);calls++;if(failure)throw Error('partial cleanup');
  }});
  await assert.rejects(retry('action'),/partial cleanup/);
  assert.ok(f.records.has('moderationCleanup/action'));
  f.records.delete('moderationActions/action');failure=false;
  assert.equal(await retry('action'),true);assert.equal(calls,2);
  assert.equal(f.records.has('moderationCleanup/action'),false);
  assert.equal(f.records.has('moderationActions/action'),false);
  assert.equal(await retry('action'),false);
});

test('moderation cleanup marks existing audit done but cannot consume a replaced or mismatched retry job',async()=>{
  const f=fixture(),job={targetUid:'target',reporterUid:'reporter',obsoleteRevision:3,createdAt:f.now()};
  const audit={...job,cleanupObsoleteRevision:3,cleanupPending:true,expiresAt:99};
  f.records.set('moderationCleanup/action',job);f.records.set('moderationActions/action',audit);
  assert.equal(await createModerationCleanupRetrier({...f,cleanupDedup:async()=>{}})('action'),true);
  assert.equal(f.records.get('moderationActions/action').cleanupPending,false);
  assert.equal(f.records.get('moderationActions/action').expiresAt,99);
  f.records.set('moderationCleanup/action',job);
  const raced=createModerationCleanupRetrier({...f,cleanupDedup:async()=>{
    f.records.set('moderationCleanup/action',{...job,obsoleteRevision:4});
  }});
  await assert.rejects(raced('action'),/maintenance-cleanup-changed/);
  assert.equal(f.records.get('moderationCleanup/action').obsoleteRevision,4);
});

test('scheduled exports are internal schedule triggers, never player callables, and use bounded retry/resource candidates',()=>{
  const scheduled=createScheduledMaintenance();
  assert.deepEqual(Object.keys(scheduled),['retryAccountDeletions','purgeExpiredServerRecords']);
  for(const [name,fn] of Object.entries(scheduled)){
    const endpoint=fn.__endpoint;
    assert.equal(endpoint.platform,'gcfv2');assert.equal(endpoint.ingressSettings,'ALLOW_INTERNAL_ONLY');
    assert.equal(endpoint.callableTrigger,undefined);assert.equal(endpoint.httpsTrigger,undefined);
    assert.equal(endpoint.scheduleTrigger.timeZone,'Asia/Seoul');
    assert.equal(endpoint.scheduleTrigger.schedule,name==='retryAccountDeletions'?'0 0,6,12,18 * * *':'0 3 * * *');
    assert.equal(endpoint.scheduleTrigger.retryConfig.retryCount,2);assert.equal(endpoint.scheduleTrigger.retryConfig.maxRetrySeconds,0);
    assert.equal(endpoint.maxInstances,1);assert.equal(endpoint.minInstances,0);assert.equal(endpoint.concurrency,1);
    assert.equal(endpoint.timeoutSeconds,300);assert.equal(endpoint.availableMemoryMb,256);
  }
  assert.ok(MAINTENANCE_POLICY.leaseMs>MAINTENANCE_FUNCTION_OPTIONS.timeoutSeconds*1000);
});

test('scheduled log and SDK rethrow contain aggregate counts only, never UID or raw failures',async()=>{
  const logs=[],invocations=[];
  const log=Object.fromEntries(['info','warn','error'].map(level=>[level,(...args)=>logs.push([level,...args])]));
  const schedule=(options,handler)=>handler;
  const ok=createScheduledMaintenance({schedule,log,runtime:async request=>{
    invocations.push(request);return {visited:1,failed:1,collections:{secretUid:{nickname:'private'}}};
  }});
  await ok.retryAccountDeletions({scheduleTime:'2026-10-12T00:00:00Z'});
  await ok.retryAccountDeletions({scheduleTime:'2026-10-12T00:00:00Z'});
  assert.equal(invocations[0].invocationId,invocations[1].invocationId);
  assert.match(invocations[0].invocationId,/^[a-f0-9]{64}$/);
  const bad=createScheduledMaintenance({schedule,log,runtime:async()=>{throw Error('private SDK token and UID');}});
  await assert.rejects(bad.purgeExpiredServerRecords({scheduleTime:'2026-10-12T03:00:00Z'}),{message:'maintenance-failed'});
  assert.doesNotMatch(JSON.stringify(logs),/secretUid|private|SDK|token|UID/);
});
