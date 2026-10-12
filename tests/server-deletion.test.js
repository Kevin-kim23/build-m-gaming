import test from 'node:test';
import assert from 'node:assert/strict';
import {createDeletionService} from '../server/deletion-service.js';
import {createDeletionMaintenance,createCompletedDeletionPurger} from '../server/deletion-maintenance.js';
import {createRateLimitPurger,createRateLimiter} from '../server/request-security.js';
import {SECURITY_POLICY} from '../server/security-policy.js';
function fixture(){const records=new Map();let clock=1000;const transact=async op=>{
  const draft=new Map(records);const result=await op({get:async p=>draft.get(p),set:(p,v)=>draft.set(p,v),delete:p=>draft.delete(p)});
  records.clear();for(const [p,v]of draft)records.set(p,v);return result;};
  return {records,transact,now:()=>clock,advance:ms=>{clock+=ms;}};
}

test('account deletion clears account identifiers from maintenance counter cursors',async()=>{
  const f=fixture();
  for(const collection of ['rateLimits','reportDaily'])f.records.set(`${collection}/test-a`,{expiresAt:500});
  for(const job of ['deletion-retry','expired-records'])f.records.set(`maintenanceRuns/${job}`,{
    leaseToken:'keep-lease',cursors:{
      rateLimits:{id:'test-a',expiresAt:500,updatedAt:900},
      reportDaily:{id:'test-a',expiresAt:500,updatedAt:900},
      nicknameReports:{id:'unrelated',expiresAt:500,updatedAt:900},
    },
  });
  await createDeletionService({...f,deleteAuth:async()=>{}})('test-a');
  for(const job of ['deletion-retry','expired-records']){
    const record=f.records.get(`maintenanceRuns/${job}`);
    assert.equal(record.cursors.rateLimits?.id,undefined);
    assert.equal(record.cursors.reportDaily?.id,undefined);
    assert.equal(record.cursors.nicknameReports.id,'unrelated');
    assert.equal(record.leaseToken,'keep-lease');
  }
});
test('repeated deletion cannot extend the completed record retention deadline',async()=>{
  const f=fixture();const remove=createDeletionService({...f,deleteAuth:async()=>{}});
  await remove('test-a');const completedAt=f.records.get('deletions/test-a').completedAt;
  f.advance(10_000);await remove('test-a');
  assert.equal(f.records.get('deletions/test-a').completedAt,completedAt);
  assert.equal(f.records.get('deletions/test-a').expiresAt,completedAt+SECURITY_POLICY.deletionRetentionMs);
});
test('related report cleanup failure leaves a pending deletion for retry',async()=>{
  const f=fixture();let fail=true,authCalls=0;
  const remove=createDeletionService({...f,deleteAuth:async()=>{authCalls++;},deleteRelated:async()=>{if(fail)throw Error('temporary');}});
  await assert.rejects(remove('test-a'),{code:'deletion-pending'});
  assert.equal(f.records.get('deletions/test-a').status,'pending');
  assert.equal(authCalls,0);
  assert.equal(f.records.get('deletions/test-a').expiresAt,undefined);
  fail=false;await remove('test-a');assert.equal(authCalls,1);
  assert.equal(f.records.get('deletions/test-a').status,'completed');
});

test('Auth deletion failure is retried after related cleanup and user-not-found completes safely',async()=>{
  const f=fixture();let fail=true,cleanups=0;
  f.records.set('rateLimits/test-a',{read:[1],write:[],expiresAt:99});
  const remove=createDeletionService({...f,deleteRelated:async()=>{cleanups++;},deleteAuth:async()=>{
    throw Object.assign(Error('private detail'),{code:fail?'auth/internal-error':'auth/user-not-found'});
  }});
  await assert.rejects(remove('test-a'),{code:'deletion-pending'});
  assert.equal(f.records.has('rateLimits/test-a'),true);
  f.advance(1_000);fail=false;await remove('test-a');
  const record=f.records.get('deletions/test-a');
  assert.equal(record.requestedAt,1000);assert.equal(record.completedAt,2000);
  assert.equal(record.attempts,2);assert.equal(cleanups,2);
  assert.equal(f.records.has('rateLimits/test-a'),false);
  assert.equal(JSON.stringify(record).includes('private detail'),false);
});

test('failed deletion retries cannot reset the shared write rate limit',async()=>{
  const f=fixture(),limit=createRateLimiter(f);
  const remove=createDeletionService({...f,deleteAuth:async()=>{throw Error('temporary');}});
  for(let attempt=0;attempt<10;attempt++){
    await limit('test-a','write');await assert.rejects(remove('test-a'),{code:'deletion-pending'});
  }
  await assert.rejects(limit('test-a','write'),{code:'rate-limit'});
});

test('maintenance continues past failed deletions, paginates, and emits aggregate counts only',async()=>{
  const visited=[];
  const run=createDeletionMaintenance({
    pendingPage:async cursor=>cursor?{ids:['last'],next:null}:{ids:['fails','works'],next:'page2'},
    expiredPage:async()=>({ids:['expired','still-active','transient'],next:null}),
    remove:async uid=>{visited.push(uid);if(uid==='fails')throw Error('sensitive');},
    purge:async uid=>{if(uid==='transient')throw Error('sensitive');return uid==='expired';},
  });
  assert.deepEqual(await run(),{retried:3,completed:2,retryFailed:1,purged:1,retained:1,purgeFailed:1});
  assert.deepEqual(visited,['fails','works','last']);
});

test('only completed records past 90 days with absent Auth accounts can be purged',async()=>{
  const f=fixture();const completedAt=f.now();
  f.records.set('deletions/test-a',{status:'completed',completedAt});
  let account='missing';
  const purge=createCompletedDeletionPurger({...f,getUser:async()=>{
    if(account==='active')return {};
    throw Object.assign(Error('private'),{code:account==='missing'?'auth/user-not-found':'auth/internal-error'});
  }});
  f.advance(SECURITY_POLICY.deletionRetentionMs-1);
  assert.equal(await purge('test-a'),false);
  f.advance(1);account='active';assert.equal(await purge('test-a'),false);
  account='error';await assert.rejects(purge('test-a'));assert.equal(f.records.has('deletions/test-a'),true);
  account='missing';f.records.set('deletions/test-a',{status:'pending',requestedAt:completedAt});
  assert.equal(await purge('test-a'),false);
  f.records.set('deletions/test-a',{status:'completed',completedAt});
  assert.equal(await purge('test-a'),true);assert.equal(f.records.has('deletions/test-a'),false);
});

test('expired rate records are checked again so concurrent new requests retain their window',async()=>{
  const f=fixture(),purge=createRateLimitPurger(f);
  f.records.set('rateLimits/test-a',{expiresAt:f.now()+1});
  assert.equal(await purge('test-a'),false);
  f.advance(1);assert.equal(await purge('test-a'),true);
  assert.equal(await purge('test-a'),false);
});
