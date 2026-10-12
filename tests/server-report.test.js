import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createNicknameReportService} from '../server/report-service.js';

function fixture() {
  const records=new Map([
    ['profiles/reporter',{nickname:'신고병사',nicknameKey:'신고병사'}],
    ['nicknames/신고병사',{uid:'reporter'}],
    ['profiles/target',{nickname:'씨발병사',nicknameKey:'씨발병사'}],
    ['nicknames/씨발병사',{uid:'target'}],
  ]);
  let clock=1000,queue=Promise.resolve();
  const report=createNicknameReportService({now:()=>clock++,transact:operation=>{
    const work=queue.then(async()=>{
      const writes=new Map();let wrote=false;
      const result=await operation({get:async path=>{assert.equal(wrote,false,'Firestore reads precede writes');return records.get(path);},set:(path,value)=>{wrote=true;writes.set(path,value);}});
      for(const [path,value] of writes)records.set(path,value);
      return result;
    });queue=work.catch(()=>{});return work;
  }});
  return {records,report,setClock:value=>{clock=value;},reports:()=>[...records].filter(([key])=>key.startsWith('nicknameReports/'))};
}

function addTarget(records,index) {
  const uid=`target-${index}`,nickname=`대상${index}`;
  records.set(`profiles/${uid}`,{nickname,nicknameKey:nickname});
  records.set(`nicknames/${nickname}`,{uid});
  return nickname;
}

test('server resolves an existing prohibited nickname and keeps report identity private',async()=>{
  const {report,reports}=fixture();
  assert.deepEqual(await report('reporter',{nickname:'씨발병사',reason:'abuse',reporterUid:'forged',targetUid:'forged',email:'synthetic@example.invalid',details:'not stored'}),{submitted:true});
  assert.equal(reports().length,1);
  assert.deepEqual(reports()[0][1],{reporterUid:'reporter',targetUid:'target',nickname:'씨발병사',nicknameRevision:0,reason:'abuse',createdAt:1000,status:'pending'});
  assert.match(reports()[0][0],/^nicknameReports\/[a-f0-9]{64}$/);
});

test('parallel and retried reports remain one pending item and never ban a profile',async()=>{
  const {report,reports,records}=fixture();
  const originalProfile={...records.get('profiles/target')};
  const payload={nickname:'씨발병사',reason:'abuse'};
  await Promise.all([report('reporter',payload),report('reporter',payload),report('reporter',payload)]);
  assert.equal(reports().length,1);assert.equal(reports()[0][1].createdAt,1000);
  assert.deepEqual(records.get('profiles/target'),originalProfile);
  const [path,item]=reports()[0];records.set(path,{...item,status:'reviewed'});
  await report('reporter',payload);assert.equal(reports().length,1);assert.equal(records.get(path).status,'reviewed');
});

test('unauthenticated, malformed, self, missing and unprofiled reports do not write',async()=>{
  const {report,reports}=fixture();
  for(const [uid,data,code] of [
    [null,{nickname:'씨발병사',reason:'abuse'},'unauthenticated'],
    ['reporter',{nickname:'a/b',reason:'abuse'},'invalid-nickname'],
    ['reporter',{nickname:'씨발병사',reason:'arbitrary free text'},'invalid-report-reason'],
    ['reporter',{nickname:'신고병사',reason:'abuse'},'self-report'],
    ['reporter',{nickname:'없는병사',reason:'abuse'},'report-target-unavailable'],
    ['missing',{nickname:'씨발병사',reason:'abuse'},'profile-required'],
  ])await assert.rejects(report(uid,data),{code});
  assert.equal(reports().length,0);
});

test('deletion tombstones on either account block report creation and re-creation',async()=>{
  for(const uid of ['reporter','target']){
    const {report,reports,records}=fixture();
    records.set(`deletions/${uid}`,{status:'pending'});
    await assert.rejects(report('reporter',{nickname:'씨발병사',reason:'abuse'}),{code:uid==='reporter'?'account-deleting':'report-target-unavailable'});
    assert.equal(reports().length,0);
  }
});

test('a stale nickname claim cannot report a different or missing profile',async()=>{
  for(const profile of [null,{nickname:'새병사',nicknameKey:'새병사'}]){
    const {report,reports,records}=fixture();
    if(profile)records.set('profiles/target',profile);else records.delete('profiles/target');
    await assert.rejects(report('reporter',{nickname:'씨발병사',reason:'abuse'}),{code:'report-target-unavailable'});
    assert.equal(reports().length,0);
  }
});

test('changing the reason cannot create another report of the same nickname generation',async()=>{
  const {report,reports,records}=fixture();
  await report('reporter',{nickname:'씨발병사',reason:'abuse'});
  await report('reporter',{nickname:'씨발병사',reason:'hate'});
  assert.equal(reports().length,1);
  assert.equal(reports()[0][1].reason,'abuse');
  assert.equal(records.get('reportDaily/reporter').count,1);
});

test('only five new reports per reporter are accepted within a Korean calendar day',async()=>{
  const {report,reports,records}=fixture();
  for(let i=1;i<=5;i++)await report('reporter',{nickname:addTarget(records,i),reason:'abuse'});
  await assert.rejects(report('reporter',{nickname:addTarget(records,6),reason:'abuse'}),{code:'report-daily-limit'});
  assert.equal(reports().length,5);
  assert.equal(records.get('reportDaily/reporter').count,5);
});

test('Korean midnight starts a new allowance without trusting client day or counters',async()=>{
  const {report,records,setClock}=fixture();
  setClock(Date.parse('2026-10-12T14:59:59.900Z'));
  for(let i=1;i<=5;i++)await report('reporter',{nickname:addTarget(records,i),reason:'abuse'});
  assert.deepEqual(records.get('reportDaily/reporter'),{day:'2026-10-12',count:5,expiresAt:Date.parse('2026-10-12T15:00:00Z')});
  const nickname=addTarget(records,6);
  await assert.rejects(report('reporter',{nickname,reason:'abuse',day:'2026-10-13',count:0}),{code:'report-daily-limit'});
  setClock(Date.parse('2026-10-12T15:00:00Z'));
  await report('reporter',{nickname,reason:'abuse'});
  assert.deepEqual(records.get('reportDaily/reporter'),{day:'2026-10-13',count:1,expiresAt:Date.parse('2026-10-13T15:00:00Z')});
});

test('parallel reports cannot exceed the allowance and a retry does not consume another slot',async()=>{
  const {report,reports,records}=fixture();
  const names=Array.from({length:7},(_,i)=>addTarget(records,i));
  const results=await Promise.allSettled(names.map(nickname=>report('reporter',{nickname,reason:'abuse'})));
  assert.equal(results.filter(item=>item.status==='fulfilled').length,5);
  assert.deepEqual(results.filter(item=>item.status==='rejected').map(item=>item.reason.code),['report-daily-limit','report-daily-limit']);
  assert.equal(reports().length,5);
  await report('reporter',{nickname:names[0],reason:'hate'});
  assert.equal(records.get('reportDaily/reporter').count,5);
});

test('daily counters are isolated by authenticated reporter rather than supplied identity',async()=>{
  const {report,records}=fixture();
  records.set('profiles/second-reporter',{nickname:'두번째신고자',nicknameKey:'두번째신고자'});
  for(let i=1;i<=5;i++)await report('reporter',{nickname:addTarget(records,i),reason:'abuse'});
  const nickname=addTarget(records,6);
  await assert.rejects(report('reporter',{nickname,reason:'abuse',reporterUid:'second-reporter'}),{code:'report-daily-limit'});
  await report('second-reporter',{nickname,reason:'abuse',reporterUid:'reporter'});
  assert.equal(records.get('reportDaily/reporter').count,5);
  assert.equal(records.get('reportDaily/second-reporter').count,1);
});

test('minimal duplicate guards survive report retention cleanup without retaining the nickname or reason',async()=>{
  const {report,reports,records,setClock}=fixture();
  await report('reporter',{nickname:'씨발병사',reason:'abuse'});
  records.delete(reports()[0][0]);
  records.delete('reportDaily/reporter');
  setClock(1000+91*24*60*60*1000);
  await report('reporter',{nickname:'씨발병사',reason:'hate'});
  assert.equal(reports().length,0);
  assert.equal(records.has('reportDaily/reporter'),false);
  const guards=[...records].filter(([path])=>path.startsWith('reportDedup/'));
  assert.equal(guards.length,1);
  assert.deepEqual(Object.keys(guards[0][1]).sort(),['nicknameKeyHash','nicknameRevision','reporterUid','targetUid']);
  assert.match(guards[0][1].nicknameKeyHash,/^[a-f0-9]{64}$/);
});

test('server-owned nickname revision and target UID determine whether a report is new',async()=>{
  const {report,reports,records}=fixture();
  await report('reporter',{nickname:'씨발병사',reason:'abuse'});
  await report('reporter',{nickname:'씨발병사',reason:'hate',nicknameRevision:999});
  assert.equal(reports().length,1);
  records.set('profiles/target',{...records.get('profiles/target'),nicknameRevision:1});
  await report('reporter',{nickname:'씨발병사',reason:'hate'});
  assert.equal(reports().length,2);
  assert.equal(reports()[1][1].nicknameRevision,1);
  records.set('profiles/next-target',{nickname:'씨발병사',nicknameKey:'씨발병사'});
  records.set('nicknames/씨발병사',{uid:'next-target'});
  await report('reporter',{nickname:'씨발병사',reason:'abuse'});
  assert.equal(reports().length,3);
});

test('corrupt current-day quota fails closed and old-day quota is replaced',async()=>{
  for(const count of [-1,0.5,'0',NaN]){
    const {report,reports,records}=fixture();
    records.set('reportDaily/reporter',{day:'1970-01-01',count,expiresAt:1});
    await assert.rejects(report('reporter',{nickname:'씨발병사',reason:'abuse'}),{code:'report-limit-unavailable'});
    assert.equal(reports().length,0);
    assert.equal([...records.keys()].some(path=>path.startsWith('reportDedup/')),false);
  }
  const {report,records}=fixture();
  records.set('reportDaily/reporter',{day:'1969-12-31',count:5,expiresAt:1});
  await report('reporter',{nickname:'씨발병사',reason:'abuse'});
  assert.equal(records.get('reportDaily/reporter').count,1);
});

test('an invalid server nickname revision fails closed without report or counter writes',async()=>{
  for(const nicknameRevision of [-1,0.5,'0',Number.MAX_SAFE_INTEGER+1]){
    const {report,reports,records}=fixture();
    records.set('profiles/target',{...records.get('profiles/target'),nicknameRevision});
    await assert.rejects(report('reporter',{nickname:'씨발병사',reason:'abuse'}),{code:'report-target-unavailable'});
    assert.equal(reports().length,0);
    assert.equal(records.has('reportDaily/reporter'),false);
  }
});

test('the earlier reason-keyed draft is preserved and gains a minimal duplicate guard',async()=>{
  const {report,reports,records}=fixture();
  const id=createHash('sha256').update(JSON.stringify(['reporter','target','abuse'])).digest('hex');
  const legacy={reporterUid:'reporter',targetUid:'target',nickname:'씨발병사',reason:'abuse',createdAt:50,status:'dismissed'};
  records.set(`nicknameReports/${id}`,legacy);
  await report('reporter',{nickname:'씨발병사',reason:'hate'});
  assert.equal(reports().length,1);
  assert.deepEqual(records.get(`nicknameReports/${id}`),legacy);
  assert.equal(records.has('reportDaily/reporter'),false);
  assert.equal([...records.keys()].filter(path=>path.startsWith('reportDedup/')).length,1);
});

test('an old draft report of another nickname generation does not suppress a new report',async()=>{
  for(const change of ['key','revision']){
    const {report,reports,records}=fixture();
    const id=createHash('sha256').update(JSON.stringify(['reporter','target','abuse'])).digest('hex');
    records.set(`nicknameReports/${id}`,{reporterUid:'reporter',targetUid:'target',nickname:change==='key'?'옛이름':'씨발병사',reason:'abuse',createdAt:50,status:'dismissed'});
    if(change==='revision')records.set('profiles/target',{...records.get('profiles/target'),nicknameRevision:1});
    await report('reporter',{nickname:'씨발병사',reason:'hate'});
    assert.equal(reports().length,2);
    assert.equal(records.get('reportDaily/reporter').count,1);
  }
});
