import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createModerationService} from '../server/moderation-service.js';
import {REPORT_POLICY} from '../server/report-policy.js';

const T=1800000000000,ID='1'.repeat(64),SECOND='2'.repeat(64),ADMIN={actorHash:'a'.repeat(64)};
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333';
const request=(decision='warn',actionId=A,reportId=ID,expectedVersion=0)=>({reportId,actionId,decision,expectedVersion});
const undo=(originalActionId=A,actionId=B,reportId=ID,expectedVersion=1)=>({reportId,actionId,originalActionId,expectedVersion});
const candidate=(uid,actionId,attempt)=>'유저'+createHash('sha256').update(JSON.stringify([uid,actionId,attempt])).digest('hex').slice(0,8);
function fixture() {
  const report={reporterUid:'synthetic-reporter',targetUid:'synthetic-target',nickname:'원래닉네임',nicknameRevision:0,
    reason:'abuse',createdAt:T-100,status:'pending'};
  const records=new Map([
    [`nicknameReports/${ID}`,report],['profiles/synthetic-target',{nickname:'원래닉네임',nicknameKey:'원래닉네임',createdAt:T-1000,rankingStatus:'pending-review'}],
    ['nicknames/원래닉네임',{uid:'synthetic-target'}],
  ]);
  let queue=Promise.resolve(),cleanupFail=false,clock=T,failJobDelete=false;
  const cleanups=[],writes=[],pages=[];
  const transact=operation=>{
    const work=queue.then(async()=>{
      const staged=new Map();let writing=false;
      const result=await operation({
        get:async key=>{assert.equal(writing,false,'Firestore requires all reads before writes');return structuredClone(records.get(key)??null);},
        set:(key,value)=>{writing=true;staged.set(key,structuredClone(value));},
        delete:key=>{if(failJobDelete&&key.startsWith('moderationCleanup/'))throw Error('synthetic job-clear failure');writing=true;staged.set(key,null);},
      });
      for(const [key,value] of staged){writes.push(key);if(value===null)records.delete(key);else records.set(key,value);}
      return result;
    });queue=work.catch(()=>{});return work;
  };
  const service=createModerationService({transact,now:()=>clock,
    cleanupDedup:async(...args)=>{cleanups.push(args);if(cleanupFail)throw Error('synthetic cleanup failure');},
    listPending:async options=>{pages.push(options);return {items:[...records].filter(([key,value])=>key.startsWith('nicknameReports/')&&value.status==='pending').map(([key,value])=>({id:key.split('/')[1],...value})),nextCursor:null};},
  });
  return {service,records,writes,cleanups,pages,report,failCleanup:value=>{cleanupFail=value;},
    failJobClear:value=>{failJobDelete=value;},time:value=>{clock=value;}};
}
test('private moderation requires a verified actor hash and rejects player-chosen UID or free notes',async()=>{
  const h=fixture();
  for(const method of ['list','inspect','resolve','revert']){
    await assert.rejects(h.service[method]({},{}),{code:'admin-auth-required'});
    await assert.rejects(h.service[method]({actorHash:['a'.repeat(64)]},{}),{code:'admin-auth-required'});
  }
  for(const extra of [{targetUid:'someone-else'},{reporterUid:'someone'},{nickname:'직접설정'},{note:'free text'}]){
    await assert.rejects(h.service.resolve(ADMIN,{...request(),...extra}),{code:'invalid-moderation-request'});
  }
  for(const data of [request('suspend'),request('ranking-exclusion'),{...request(),reportId:'../profiles/target'},
    {...request(),actionId:'not-a-uuid'},{...request(),expectedVersion:-1}]){
    await assert.rejects(h.service.resolve(ADMIN,data),{code:'invalid-moderation-request'});
  }
  assert.equal(h.writes.length,0);
});
test('bounded private list and inspect omit UIDs and arbitrary provider or save fields',async()=>{
  const h=fixture();h.records.get(`nicknameReports/${ID}`).email='synthetic@example.invalid';
  h.records.get('profiles/synthetic-target').raw='synthetic-save-content';
  const page=await h.service.list(ADMIN,{}),inspected=await h.service.inspect(ADMIN,{reportId:ID});
  assert.deepEqual(h.pages,[{limit:20,cursor:null}]);assert.equal(page.items[0].version,0);
  assert.equal(inspected.target.nickname,'원래닉네임');assert.equal(inspected.target.moderationVersion,0);
  assert.doesNotMatch(JSON.stringify([page,inspected]),/reporterUid|targetUid|synthetic@example|synthetic-save-content/);
  for(const data of [{limit:51},{limit:0},{cursor:[ID]},{uid:'someone'}])await assert.rejects(h.service.list(ADMIN,data),{code:'invalid-moderation-request'});
  assert.equal(h.writes.length,0);
});
test('warning closes a report for 90 days and stores a minimal authenticated action audit',async()=>{
  const h=fixture();h.records.get('profiles/synthetic-target').gold='123456789012345678901234567890';
  const result=await h.service.resolve(ADMIN,request());
  assert.equal(result.status,'resolved');assert.equal(result.version,1);
  const profile=h.records.get('profiles/synthetic-target'),report=h.records.get(`nicknameReports/${ID}`),action=h.records.get(`moderationActions/${A}`);
  assert.deepEqual(profile.moderationNotice,{kind:'warning',issuedAt:T});assert.equal(profile.nickname,'원래닉네임');
  assert.equal(profile.nicknameRevision,0);assert.equal(profile.moderationVersion,1);assert.equal(profile.rankingStatus,'pending-review');
  assert.equal(report.completedAt,T);assert.equal(report.expiresAt,T+REPORT_POLICY.completedRetentionMs);
  assert.equal(action.expiresAt,report.expiresAt);assert.equal(action.actorHash,ADMIN.actorHash);
  assert.doesNotMatch(JSON.stringify(action),/gold|email|token|raw|123456789012345678901234567890/);
  assert.equal(h.cleanups.length,0);
});
test('same action retry is idempotent and reused IDs with different decision, version or actor fail',async()=>{
  const h=fixture(),first=await h.service.resolve(ADMIN,request()),writes=h.writes.length;
  assert.deepEqual(await h.service.resolve(ADMIN,request()),first);assert.equal(h.writes.length,writes);
  for(const [context,data] of [[ADMIN,request('dismiss')],[ADMIN,request('warn',A,ID,1)],[{actorHash:'b'.repeat(64)},request()]]){
    await assert.rejects(h.service.resolve(context,data),{code:'moderation-action-conflict'});
  }
});
test('simultaneous decisions for one pending report apply only one complete transaction',async()=>{
  const h=fixture();const results=await Promise.allSettled([
    h.service.resolve(ADMIN,request('warn',A)),h.service.resolve(ADMIN,request('dismiss',B)),
  ]);
  assert.equal(results.filter(item=>item.status==='fulfilled').length,1);
  assert.equal(results.find(item=>item.status==='rejected').reason.code,'moderation-report-changed');
  assert.equal([...h.records.keys()].filter(key=>key.startsWith('moderationActions/')).length,1);
});
test('forced rename assigns a deterministic available default and leaves ranking unchanged',async()=>{
  const h=fixture(),first=candidate('synthetic-target',A,0),second=candidate('synthetic-target',A,1);
  h.records.set(`nicknames/${first}`,{uid:'another-account'});
  const result=await h.service.resolve(ADMIN,request('default-rename'));
  assert.equal(result.cleanupPending,false);
  const profile=h.records.get('profiles/synthetic-target');
  assert.equal(profile.nickname,second);assert.equal(profile.nicknameRevision,1);assert.equal(profile.moderationVersion,1);
  assert.deepEqual(profile.moderationNotice,{kind:'renamed',issuedAt:T});
  assert.equal(profile.rankingStatus,'pending-review');assert.equal(h.records.has('nicknames/원래닉네임'),false);
  assert.deepEqual(h.records.get(`nicknames/${first}`),{uid:'another-account'});
  assert.deepEqual(h.records.get(`nicknames/${second}`),{uid:'synthetic-target'});
  assert.deepEqual(h.cleanups,[['synthetic-target',0]]);
});
test('three default nickname collisions stop the entire decision and preserve every claim',async()=>{
  const h=fixture();for(let i=0;i<3;i++)h.records.set(`nicknames/${candidate('synthetic-target',A,i)}`,{uid:`another-${i}`});
  const before=structuredClone(h.records);
  await assert.rejects(h.service.resolve(ADMIN,request('default-rename')),{code:'moderation-nickname-conflict'});
  assert.deepEqual(h.records,before);assert.equal(h.writes.length,0);
});
test('forced rename never deletes an old nickname claim now owned by somebody else',async()=>{
  const h=fixture();h.records.set('nicknames/원래닉네임',{uid:'another-account'});
  await h.service.resolve(ADMIN,request('default-rename'));
  assert.deepEqual(h.records.get('nicknames/원래닉네임'),{uid:'another-account'});
});
test('nickname cleanup failure is visibly pending and the same action retries cleanup without repeating rename',async()=>{
  const h=fixture();h.failCleanup(true);
  await assert.rejects(h.service.resolve(ADMIN,request('default-rename')),{code:'moderation-cleanup-pending'});
  const profile=structuredClone(h.records.get('profiles/synthetic-target'));
  assert.equal(h.records.get(`moderationActions/${A}`).cleanupPending,true);
  assert.deepEqual(h.records.get(`moderationCleanup/${A}`),{
    reporterUid:'synthetic-reporter',targetUid:'synthetic-target',obsoleteRevision:0,createdAt:T,
  });
  assert.equal(h.records.get(`nicknameReports/${ID}`).status,'resolved');
  h.failCleanup(false);const result=await h.service.resolve(ADMIN,request('default-rename'));
  assert.equal(result.cleanupPending,false);assert.deepEqual(h.records.get('profiles/synthetic-target'),profile);
  assert.equal(h.records.has(`moderationCleanup/${A}`),false);
  assert.deepEqual(h.cleanups,[['synthetic-target',0],['synthetic-target',0]]);
});
test('reverting a warning restores its prior notice and reopens the report without an expiry',async()=>{
  const h=fixture();h.records.get('profiles/synthetic-target').moderationNotice={kind:'renamed',issuedAt:T-300};
  await h.service.resolve(ADMIN,request());h.time(T+10);
  const result=await h.service.revert(ADMIN,undo());
  const profile=h.records.get('profiles/synthetic-target'),report=h.records.get(`nicknameReports/${ID}`);
  assert.equal(result.status,'pending');assert.equal(result.version,2);
  assert.deepEqual(profile.moderationNotice,{kind:'renamed',issuedAt:T-300});assert.equal(profile.moderationVersion,2);
  for(const key of ['expiresAt','completedAt','actionId','decision'])assert.equal(Object.hasOwn(report,key),false);
  assert.equal(h.records.get(`moderationActions/${A}`).revertedBy,B);
  assert.equal(h.records.get(`moderationActions/${B}`).expiresAt,T+10+REPORT_POLICY.completedRetentionMs);
  assert.deepEqual(await h.service.revert(ADMIN,undo()),result);
  assert.equal((await h.service.resolve(ADMIN,request())).status,'reverted');
});
test('rename reversal restores the old name with a new generation and can be reviewed again',async()=>{
  const h=fixture();await h.service.resolve(ADMIN,request('default-rename'));
  const changed=h.records.get('profiles/synthetic-target').nickname;
  await h.service.revert(ADMIN,undo());
  const profile=h.records.get('profiles/synthetic-target'),report=h.records.get(`nicknameReports/${ID}`);
  assert.equal(profile.nickname,'원래닉네임');assert.equal(profile.nicknameRevision,2);assert.equal(profile.moderationVersion,2);
  assert.equal(Object.hasOwn(profile,'moderationNotice'),false);assert.equal(h.records.has(`nicknames/${changed}`),false);
  assert.equal(h.records.get('nicknames/원래닉네임').uid,'synthetic-target');assert.equal(report.nicknameRevision,2);
  assert.deepEqual(h.cleanups,[['synthetic-target',0],['synthetic-target',1]]);
  await h.service.resolve(ADMIN,request('warn',C,ID,2));
  assert.equal(h.records.get(`nicknameReports/${ID}`).version,3);
});
test('rename reversal cannot take a name claimed by another player',async()=>{
  const h=fixture();await h.service.resolve(ADMIN,request('default-rename'));
  h.records.set('nicknames/원래닉네임',{uid:'new-owner'});const before=structuredClone(h.records);
  await assert.rejects(h.service.revert(ADMIN,undo()),{code:'moderation-nickname-conflict'});
  assert.deepEqual(h.records,before);
});
test('later action or nickname change blocks undoing an older decision even if its report is unchanged',async()=>{
  for(const mode of ['warning','nickname']){
    const h=fixture();await h.service.resolve(ADMIN,request());
    if(mode==='warning'){
      h.records.set(`nicknameReports/${SECOND}`,{...h.report});
      await h.service.resolve(ADMIN,request('warn',B,SECOND));
    }else h.records.get('profiles/synthetic-target').nicknameRevision=1;
    const before=structuredClone(h.records);
    await assert.rejects(h.service.revert(ADMIN,undo(A,C)),{code:'moderation-target-changed'});
    assert.deepEqual(h.records,before);
  }
});
test('dismissal can be undone without changing the visible nickname or notice',async()=>{
  const h=fixture();await h.service.resolve(ADMIN,request('dismiss'));
  assert.equal(h.records.get(`nicknameReports/${ID}`).status,'dismissed');
  assert.equal(h.records.get('profiles/synthetic-target').moderationNotice,undefined);
  await h.service.revert(ADMIN,undo());
  assert.equal(h.records.get(`nicknameReports/${ID}`).status,'pending');
  assert.equal(h.records.get('profiles/synthetic-target').nickname,'원래닉네임');assert.equal(h.cleanups.length,0);
});
test('reporter and target deletion barriers block new, repeated and reversal operations',async()=>{
  for(const uid of ['synthetic-reporter','synthetic-target']){
    let h=fixture();h.records.set(`deletions/${uid}`,{status:'pending'});
    await assert.rejects(h.service.resolve(ADMIN,request()),{code:'account-deleting'});
    assert.equal(h.writes.length,0);
    h=fixture();await h.service.resolve(ADMIN,request());h.records.set(`deletions/${uid}`,{status:'pending'});
    const before=structuredClone(h.records);
    await assert.rejects(h.service.resolve(ADMIN,request()),{code:'account-deleting'});
    await assert.rejects(h.service.revert(ADMIN,undo()),{code:'account-deleting'});
    assert.deepEqual(h.records,before);
  }
});
test('stale report nickname generations cannot warn or rename the current nickname',async()=>{
  for(const decision of ['warn','default-rename']){
    const h=fixture();h.records.get('profiles/synthetic-target').nicknameRevision=1;
    await assert.rejects(h.service.resolve(ADMIN,request(decision)),{code:'moderation-target-changed'});
    assert.equal(h.writes.length,0);
  }
});
test('undo cleanup failure preserves its durable marker and retry does not advance nickname generation again',async()=>{
  const h=fixture();await h.service.resolve(ADMIN,request('default-rename'));
  h.failCleanup(true);
  await assert.rejects(h.service.revert(ADMIN,undo()),{code:'moderation-cleanup-pending'});
  assert.equal(h.records.get('profiles/synthetic-target').nicknameRevision,2);
  assert.equal(h.records.get(`moderationActions/${B}`).cleanupPending,true);
  h.failCleanup(false);assert.equal((await h.service.revert(ADMIN,undo())).cleanupPending,false);
  assert.equal(h.records.get('profiles/synthetic-target').nicknameRevision,2);
  assert.deepEqual(h.cleanups,[['synthetic-target',0],['synthetic-target',1],['synthetic-target',1]]);
});
test('concurrent reversals have exactly one winner and never reapply a previously undone operation',async()=>{
  const h=fixture();await h.service.resolve(ADMIN,request('default-rename'));
  const results=await Promise.allSettled([h.service.revert(ADMIN,undo(A,B)),h.service.revert(ADMIN,undo(A,C))]);
  assert.equal(results.filter(item=>item.status==='fulfilled').length,1);
  assert.equal(results.find(item=>item.status==='rejected').reason.code,'moderation-action-reverted');
  assert.equal(h.records.get('profiles/synthetic-target').nicknameRevision,2);
  const count=h.writes.length;
  assert.equal((await h.service.resolve(ADMIN,request('default-rename'))).status,'reverted');
  assert.equal(h.writes.length,count);
});
test('undo never deletes its current default nickname claim if ownership was independently changed',async()=>{
  const h=fixture();await h.service.resolve(ADMIN,request('default-rename'));
  const defaultName=h.records.get('profiles/synthetic-target').nickname;
  h.records.set(`nicknames/${defaultName}`,{uid:'another-account'});
  await h.service.revert(ADMIN,undo());
  assert.deepEqual(h.records.get(`nicknames/${defaultName}`),{uid:'another-account'});
  assert.equal(h.records.get('nicknames/원래닉네임').uid,'synthetic-target');
});
test('unsafe stored versions and missing reports fail closed without partial action writes',async()=>{
  for(const field of ['version','nicknameRevision']){
    const h=fixture();h.records.get(`nicknameReports/${ID}`)[field]=Number.MAX_SAFE_INTEGER+1;
    await assert.rejects(h.service.resolve(ADMIN,request()),{code:'moderation-record-invalid'});
    assert.equal(h.writes.length,0);
  }
  const h=fixture();h.records.delete(`nicknameReports/${ID}`);
  await assert.rejects(h.service.resolve(ADMIN,request()),{code:'moderation-report-unavailable'});
  await assert.rejects(h.service.inspect(ADMIN,{reportId:ID}),{code:'moderation-report-unavailable'});
  assert.equal(h.writes.length,0);
});
test('minimal cleanup jobs survive audit expiry without retaining nickname text or report reason',async()=>{
  const h=fixture();h.failCleanup(true);
  await assert.rejects(h.service.resolve(ADMIN,request('default-rename')),{code:'moderation-cleanup-pending'});
  h.time(T+REPORT_POLICY.completedRetentionMs+1);
  h.records.delete(`moderationActions/${A}`);h.records.delete(`nicknameReports/${ID}`);
  const job=h.records.get(`moderationCleanup/${A}`);
  assert.deepEqual(Object.keys(job).sort(),['createdAt','obsoleteRevision','reporterUid','targetUid']);
  assert.doesNotMatch(JSON.stringify(job),/원래닉네임|abuse|actorHash|expiresAt/);
  await assert.rejects(h.service.resolve(ADMIN,request('default-rename')),{code:'moderation-report-unavailable'});
  assert.equal(h.records.get('profiles/synthetic-target').nicknameRevision,1);
});
test('failure clearing a completed cleanup job retains retry state without repeating the main action',async()=>{
  const h=fixture();h.failJobClear(true);
  await assert.rejects(h.service.resolve(ADMIN,request('default-rename')),{code:'moderation-cleanup-pending'});
  assert.equal(h.records.has(`moderationCleanup/${A}`),true);
  assert.equal(h.records.get(`moderationActions/${A}`).cleanupPending,true);
  h.failJobClear(false);const result=await h.service.resolve(ADMIN,request('default-rename'));
  assert.equal(result.cleanupPending,false);assert.equal(h.records.has(`moderationCleanup/${A}`),false);
  assert.equal(h.records.get('profiles/synthetic-target').nicknameRevision,1);
});
