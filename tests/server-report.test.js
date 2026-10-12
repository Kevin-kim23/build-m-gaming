import test from 'node:test';
import assert from 'node:assert/strict';
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
  return {records,report,reports:()=>[...records].filter(([key])=>key.startsWith('nicknameReports/'))};
}

test('server resolves an existing prohibited nickname and keeps report identity private',async()=>{
  const {report,reports}=fixture();
  assert.deepEqual(await report('reporter',{nickname:'씨발병사',reason:'abuse',reporterUid:'forged',targetUid:'forged',email:'synthetic@example.invalid',details:'not stored'}),{submitted:true});
  assert.equal(reports().length,1);
  assert.deepEqual(reports()[0][1],{reporterUid:'reporter',targetUid:'target',nickname:'씨발병사',reason:'abuse',createdAt:1000,status:'pending'});
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
