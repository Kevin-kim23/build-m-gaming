import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createPolicy}=require('../tools/firebase-guard/request-policy.cjs');
const {createDeployGuard,validateDeployArguments}=require('../tools/firebase-guard/deploy-guard.cjs');
const {PROJECT,REGION,FUNCTIONS,USER_FUNCTIONS,SCHEDULES}=require('../tools/firebase-guard/constants.cjs');
const parent=`projects/${PROJECT}/locations/${REGION}`,cf=`https://cloudfunctions.googleapis.com/v2/${parent}/functions`;
const list={url:'https://firebase.googleapis.com/v1beta1/projects?pageSize=100',method:'GET'};
// Synthetic identities only; these are not account credentials.
function fixture() {
  const plan={project:PROJECT,region:REGION,projectNumber:'000000000000',allowManagedAgents:true,
    moderationRuntime:'fixture-admin@example.invalid',defaultRuntime:'fixture-runtime@example.invalid',functions:{},services:{},jobs:{},uris:{}};
  for(const id of FUNCTIONS) {
    plan.functions[id]={name:`${parent}/functions/${id}`,buildConfig:{runtime:'nodejs22',entryPoint:id},serviceConfig:{minInstanceCount:0,
      maxInstanceCount:USER_FUNCTIONS.includes(id)?2:1,maxInstanceRequestConcurrency:1,
      serviceAccountEmail:id==='moderateNicknames'?plan.moderationRuntime:plan.defaultRuntime,ingressSettings:id in SCHEDULES?'ALLOW_INTERNAL_ONLY':'ALLOW_ALL'}};
    plan.services[id]=`${parent}/services/${id.toLowerCase()}`;
  }
  for(const [id,schedule] of Object.entries(SCHEDULES)) {
    plan.uris[id]=`https://${id.toLowerCase()}.example.invalid`;
    plan.jobs[id]={name:`${parent}/jobs/firebase-schedule-${id}-${REGION}`,schedule,timeZone:'Asia/Seoul',
      httpTarget:{uri:plan.uris[id],httpMethod:'POST',oidcToken:{serviceAccountEmail:plan.defaultRuntime}},retryConfig:{retryCount:2}};
  }
  return plan;
}
const creation=(plan,id)=>({url:cf+'?functionId='+id,method:'POST',body:structuredClone(plan.functions[id])});
async function blocked(request,policy=createPolicy()) {
  let sent=0;
  await assert.rejects(()=>policy.dispatch(request,async()=>{sent++;return {status:200,body:{}};}),/GUARD/);
  assert.equal(sent,0,'must block before transport');assert.equal(policy.isStopped(),true);
  await assert.rejects(()=>policy.dispatch(list,async()=>{sent++;}),/GUARD/);assert.equal(sent,0);
}
test('guard projects pagination passes and HTTP errors latch stop',async()=>{
  const policy=createPolicy();let sent=0;
  for(const url of [list.url,list.url+'&pageToken=fixture-next'])await policy.dispatch({...list,url},async()=>{sent++;return {status:200,body:{results:[]}};});
  assert.equal(sent,2);
  await assert.rejects(()=>policy.dispatch(list,async()=>({status:403,body:{error:'fixture-token'}})),/GUARD/);
  assert.equal(policy.isStopped(),true);
});
test('guard documented dev inventory routes pass only in inventory mode',async()=>{
  for(const url of [`https://firebase.googleapis.com/v1beta1/projects/${PROJECT}`,
    `https://cloudfunctions.googleapis.com/v1/projects/${PROJECT}/locations/-/functions`,
    `https://cloudfunctions.googleapis.com/v2/projects/${PROJECT}/locations/-/functions?filter=environment%3D%22GEN_2%22`,
    `https://run.googleapis.com/v1/projects/${PROJECT}/locations?pageSize=100`]) {
    assert.ok(createPolicy({mode:'inventory'}).assert({url,method:'GET'}));await blocked({url,method:'GET'});
  }
});
for(const [name,request] of Object.entries({
  'unknown route':{...list,url:'https://firebase.googleapis.com/v1beta1/unknown'},
  'unknown host':{...list,url:'https://fixture.example.invalid/v1beta1/projects?pageSize=100'},
  'POST projects':{...list,method:'POST'},'GET body':{...list,body:{}},
  'extra query':{...list,url:list.url+'&access_token=fixture-token'},'duplicate query':{...list,url:list.url+'&pageSize=100'},
  'traversal':{...list,url:'https://firebase.googleapis.com/v1beta1/other/../projects?pageSize=100'},
  'encoded slash':{...list,url:'https://firebase.googleapis.com/v1beta1%2fprojects?pageSize=100'},
  'fragment':{...list,url:list.url+'#fixture-session'},
  'userinfo':{...list,url:'https://fixture@firebase.googleapis.com/v1beta1/projects?pageSize=100'},
  'HTTP':{...list,url:list.url.replace('https:','http:')},
  'prod':{...list,url:'https://firebase.googleapis.com/v1beta1/projects/budae-kiugi-prod'},
}))test(`guard denies ${name} before transmission`,()=>blocked(request));
test('guard refresh validates route/method/body and pinned OAuth client marker',async()=>{
  const r={url:'https://www.googleapis.com/oauth2/v3/token',method:'POST',authRefresh:true,
    body:{refresh_token:'fixture-refresh',client_id:'fixture-client',client_secret:'fixture-secret',grant_type:'refresh_token',scope:'fixture-scope'}};
  assert.equal(createPolicy().assert(r),'token-refresh');await blocked({...r,authRefresh:false});
  await blocked({...r,body:{...r.body,grant_type:'authorization_code'}});await blocked({...r,body:{...r.body,extra:'fixture'}});
});
test('guard permits nine exact planned creates',()=>{
  const plan=fixture(),guard=createDeployGuard(plan);assert.equal(FUNCTIONS.length,9);
  for(const id of FUNCTIONS)assert.equal(guard.assert(creation(plan,id)),'function-create');
});
test('guard required safety settings remain enforced even in malformed approved plans',async()=>{
  for(const mutate of [f=>f.buildConfig.runtime='nodejs24',f=>f.serviceConfig.minInstanceCount=1,
    f=>f.serviceConfig.maxInstanceCount=100,f=>f.buildConfig.entryPoint='unexpected',f=>f.eventTrigger={},
    f=>f.serviceConfig.secretEnvironmentVariables=[{key:'fixture'}]]) {
    const p=fixture();mutate(p.functions.readProfile);await blocked(creation(p,'readProfile'),createDeployGuard(p));
  }
  const p=fixture();p.functions.moderateNicknames.serviceConfig.serviceAccountEmail=p.defaultRuntime;
  await blocked(creation(p,'moderateNicknames'),createDeployGuard(p));
});
test('guard denies modified bodies/projects/regions/functions and PATCH/DELETE',async()=>{
  const p=fixture(),r=creation(p,'readProfile');
  for(const request of [{...r,body:{...r.body,extra:true}},{...r,url:r.url.replace(PROJECT,'budae-kiugi-prod')},
    {...r,url:r.url.replace(REGION,'us-central1')},{...r,url:cf+'?functionId=costControl'},
    {...r,method:'PATCH'},{...r,method:'DELETE'}])await blocked(request,createDeployGuard(p));
});
test('guard snapshots plan and denies absent plans',async()=>{
  const p=fixture(),guard=createDeployGuard(p);p.functions.readProfile.serviceConfig.maxInstanceCount=100;
  await blocked(creation(p,'readProfile'),guard);assert.throws(()=>createDeployGuard(),/GUARD_PLAN_REQUIRED/);
  await blocked(creation(p,'readProfile'),createPolicy({mode:'deploy'}));
});
test('guard denies API activation/project IAM/cleanup/topics/budget/account creation',async()=>{
  for(const url of ['https://serviceusage.googleapis.com/v1/projects/000000000000/services/run.googleapis.com:enable',
    `https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT}:setIamPolicy`,
    `https://artifactregistry.googleapis.com/v1/${parent}/repositories/gcf-artifacts`,
    `https://pubsub.googleapis.com/v1/projects/${PROJECT}/topics/cost-control`,
    'https://billingbudgets.googleapis.com/v1/billingAccounts/fixture/budgets',
    `https://iam.googleapis.com/v1/projects/${PROJECT}/serviceAccounts`])await blocked({url,method:'POST',body:{}},createDeployGuard(fixture()));
});
test('guard allows exactly two opted-in managed identities',async()=>{
  for(const api of ['pubsub.googleapis.com','eventarc.googleapis.com']) {
    const p=fixture(),r={url:`https://serviceusage.googleapis.com/v1beta1/projects/${p.projectNumber}/services/${api}:generateServiceIdentity`,method:'POST',body:{}};
    assert.equal(createDeployGuard(p).assert(r),'managed-identity');p.allowManagedAgents=false;await blocked(r,createDeployGuard(p));
  }
  await blocked({url:'https://serviceusage.googleapis.com/v1beta1/projects/000000000000/services/other.googleapis.com:generateServiceIdentity',method:'POST',body:{}},createDeployGuard(fixture()));
});
const invoker=(p,id,member)=>({url:'https://run.googleapis.com/v1/'+p.services[id]+':setIamPolicy',method:'POST',
  body:{policy:{bindings:[{role:'roles/run.invoker',members:[member]}],etag:'',version:3},updateMask:'bindings,etag,version'}});
test('guard public invoker only six users; two exact scheduled identities; no admin',async()=>{
  const p=fixture();for(const id of USER_FUNCTIONS)assert.equal(createDeployGuard(p).assert(invoker(p,id,'allUsers')),'service-invoker');
  for(const id of Object.keys(SCHEDULES)) {
    assert.equal(createDeployGuard(p).assert(invoker(p,id,'serviceAccount:'+p.defaultRuntime)),'service-invoker');
    await blocked(invoker(p,id,'allUsers'),createDeployGuard(p));
  }
  await blocked(invoker(p,'moderateNicknames','allUsers'),createDeployGuard(p));
  await blocked(invoker(p,'moderateNicknames','serviceAccount:fixture-caller@example.invalid'),createDeployGuard(p));
  const r=invoker(p,'readProfile','allUsers');r.body.policy.bindings.push({role:'roles/owner',members:['allUsers']});await blocked(r,createDeployGuard(p));
});
test('guard source upload requires exact minted URL, not arbitrary or altered URLs',async()=>{
  const p=fixture(),g=createDeployGuard(p),url='https://storage.googleapis.com/fixture-upload/source.zip?GoogleAccessId=fixture&Signature=fixture';
  const r={url:cf+':generateUploadUrl',method:'POST'};g.observe(r,{status:200,body:{uploadUrl:url}});
  assert.equal(g.assert({url,method:'PUT',uploadStream:true}),'source-upload');
  await blocked({url:url+'&extra=1',method:'PUT',uploadStream:true},g);
  await blocked({url,method:'PUT',uploadStream:true},createDeployGuard(p));
  assert.throws(()=>createDeployGuard(p).observe(r,{status:200,body:{uploadUrl:'https://fixture.example.invalid/upload?x=1'}}),/GUARD/);
});
test('guard operation polls only exact observed operation',async()=>{
  const p=fixture(),g=createDeployGuard(p),name=parent+'/operations/fixture-operation';
  g.observe(creation(p,'readProfile'),{status:200,body:{name}});
  assert.equal(g.assert({url:'https://cloudfunctions.googleapis.com/v2/'+name,method:'GET'}),'operation-poll');
  await blocked({url:'https://cloudfunctions.googleapis.com/v2/'+name+'-other',method:'GET'},g);
});
test('guard two exact schedules pass and timing/target/identity/retry changes stop',async()=>{
  const p=fixture();for(const id of Object.keys(SCHEDULES)) {
    const r={url:`https://cloudscheduler.googleapis.com/v1/${parent}/jobs`,method:'POST',body:p.jobs[id]};
    assert.equal(createDeployGuard(p).assert(r),'scheduler-create');
    for(const mutate of [j=>j.schedule='* * * * *',j=>j.timeZone='UTC',j=>j.httpTarget.uri='https://fixture.example.invalid',
      j=>j.httpTarget.oidcToken.serviceAccountEmail='other@example.invalid',j=>j.retryConfig.retryCount=20,j=>j.pubsubTarget={}]) {
      const copy=structuredClone(r);mutate(copy.body);await blocked(copy,createDeployGuard(p));
    }
  }
});
test('guard exact deployment arguments reject force/prod/interactive/unknown options',()=>{
  const args=['deploy','--project',PROJECT,'--config','firebase.json','--only',FUNCTIONS.map(id=>'functions:game:'+id).join(','),'--non-interactive'];
  assert.equal(validateDeployArguments(args),true);
  for(const invalid of [[...args,'--force'],args.slice(0,-1),args.map(a=>a===PROJECT?'budae-kiugi-prod':a),['deploy']])assert.throws(()=>validateDeployArguments(invalid),/GUARD/);
});
