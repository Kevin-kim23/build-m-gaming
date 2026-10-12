import test from 'node:test';
import assert from 'node:assert/strict';
import {createModeratorVerifier} from '../server/moderation-auth.js';
import {createModerationHandler} from '../server/moderation-handler.js';
import {createModerationService} from '../server/moderation-service.js';
const audience='https://private-admin.example.test',subject='12345678901234567890';
const token='Bearer '+'synthetic-token-'.repeat(4);
const payload={iss:'https://accounts.google.com',aud:audience,sub:subject,email_verified:true};
const verifier=(overrides={},config={})=>createModeratorVerifier({audience,subject,...config,
  verifyIdToken:async options=>{assert.equal(options.audience,audience);return {getPayload:()=>({...payload,...overrides})};}});
test('only a verified Google identity with exact subject and audience can moderate',async()=>{
  assert.match((await verifier()(token)).actorHash,/^[a-f0-9]{64}$/);
  for(const override of [{sub:'99999999999999999'},{aud:'https://other.example.test'},
    {iss:'https://securetoken.google.com/player-project'},{email_verified:false}])
    await assert.rejects(verifier(override)(token),/admin-unauthorized/);
  await assert.rejects(verifier()('Bearer bad'),/admin-unauthorized/);
  await assert.rejects(verifier({}, {subject:''})(token),/admin-unconfigured/);
});
test('verification errors never expose credentials or SDK detail',async()=>{
  const verify=createModeratorVerifier({audience,subject,verifyIdToken:async()=>{throw Error('sensitive-token-details');}});
  await assert.rejects(verify(token),error=>error.message==='admin-unauthorized');
});
function response() {
  return {code:0,body:null,headers:{},set(k,v){this.headers[k]=v;return this;},
    status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
}
test('private handler rejects unverified callers before any DB access',async()=>{
  const handler=createModerationHandler({verifyModerator:async()=>{throw Error('no');},
    service:new Proxy({}, {get(){assert.fail('no data access');}})});
  const res=response();await handler({method:'POST',get:()=>token,body:{operation:'list',admin:true}},res);
  assert.equal(res.code,403);assert.deepEqual(res.body,{error:'admin-access-denied'});
  assert.equal(res.headers['Cache-Control'],'no-store');
});
test('handler cannot dispatch approval, suspension, ranking or arbitrary method names',async()=>{
  const handler=createModerationHandler({verifyModerator:async()=>({actorHash:'test'}),service:{}});
  for(const operation of ['approveRanking','ban','deleteAccount','constructor','__proto__']){
    const res=response();await handler({method:'POST',get:()=>token,body:{operation}},res);
    assert.equal(res.code,400);
  }
});
test('the private HTTP protocol passes only operation arguments to the real moderation service',async()=>{
  const id='1'.repeat(64),actionId='11111111-1111-4111-8111-111111111111',undoId='22222222-2222-4222-8222-222222222222';
  const records=new Map([
    [`nicknameReports/${id}`,{reporterUid:'synthetic-reporter',targetUid:'synthetic-target',nickname:'테스트닉네임',
      reason:'abuse',createdAt:100,status:'pending',nicknameRevision:0}],
    ['profiles/synthetic-target',{nickname:'테스트닉네임',nicknameKey:'테스트닉네임',createdAt:1,rankingStatus:'pending-review'}],
  ]);
  const service=createModerationService({now:()=>1000,cleanupDedup:async()=>{},
    listPending:async()=>({items:[{id,...records.get(`nicknameReports/${id}`)}],nextCursor:null}),
    transact:async operation=>{
      const staged=new Map();let wrote=false;
      const result=await operation({get:async key=>{assert.equal(wrote,false);return structuredClone(records.get(key)??null);},
        set:(key,value)=>{wrote=true;staged.set(key,value);},delete:key=>{wrote=true;staged.set(key,null);}});
      for(const [key,value] of staged){if(value===null)records.delete(key);else records.set(key,value);}
      return result;
    },
  });
  const handler=createModerationHandler({verifyModerator:verifier(),service});
  async function call(body) {
    const res=response();await handler({method:'POST',get:()=>token,body},res);return res;
  }
  assert.equal((await call({operation:'list'})).code,200);
  assert.equal((await call({operation:'inspect',reportId:id})).body.result.target.nickname,'테스트닉네임');
  const resolved=await call({operation:'resolve',reportId:id,actionId,decision:'warn',expectedVersion:0});
  assert.equal(resolved.code,200);assert.equal(resolved.body.result.status,'resolved');
  const reverted=await call({operation:'revert',reportId:id,actionId:undoId,originalActionId:actionId,expectedVersion:1});
  assert.equal(reverted.code,200);assert.equal(reverted.body.result.status,'pending');
  assert.equal(records.get('profiles/synthetic-target').moderationVersion,2);
});
test('cleanup failures tell the administrator the action applied and preserve no sensitive error details',async()=>{
  const handler=createModerationHandler({verifyModerator:verifier(),service:{resolve:async()=>{
    throw {code:'moderation-cleanup-pending',message:'private token and profile details',targetUid:'sensitive-target'};
  }}});
  const res=response();await handler({method:'POST',get:()=>token,body:{operation:'resolve'}},res);
  assert.equal(res.code,503);assert.equal(res.body.actionApplied,true);assert.equal(res.body.retryWithSameActionId,true);
  assert.match(res.body.message,/이미 반영/);assert.doesNotMatch(JSON.stringify(res.body),/private token|sensitive-target/);
});
test('service conflict codes remain actionable while unknown exceptions and malformed bodies are sanitized',async()=>{
  for(const [code,status] of [['moderation-report-changed',409],['moderation-target-changed',409],
    ['moderation-nickname-conflict',409],['moderation-action-conflict',409],
    ['moderation-report-unavailable',404],['invalid-moderation-request',400],['unknown-private-error',500],['__proto__',500]]){
    const handler=createModerationHandler({verifyModerator:verifier(),service:{inspect:async()=>{throw {code,message:'secret-bearer-token'};}}});
    const res=response();await handler({method:'POST',get:()=>token,body:{operation:'inspect'}},res);
    assert.equal(res.code,status);assert.equal(res.body.error,status===500?'moderation-failed':code);
    assert.doesNotMatch(JSON.stringify(res.body),/secret-bearer/);
  }
  const handler=createModerationHandler({verifyModerator:verifier(),service:new Proxy({}, {get(){assert.fail('invalid body must not dispatch');}})});
  const circular={operation:'list'};circular.self=circular;
  for(const body of [null,[],{operation:'list',extra:'가'.repeat(700)},circular,Object.create({operation:'list'})]){
    const res=response();await handler({method:'POST',get:()=>token,body},res);assert.equal(res.code,400);
  }
});
