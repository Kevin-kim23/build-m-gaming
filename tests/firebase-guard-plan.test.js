import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const template=require('../tools/firebase-guard/deployment-template.json');
const {PROJECT,REGION,FUNCTIONS,USER_FUNCTIONS,SCHEDULES}=require('../tools/firebase-guard/constants.cjs');
const {createSession,CONFIRMATION,validateTemplate}=require('../tools/firebase-guard/deployment-session.cjs');
const {runPrepared,requestHumanConfirmation}=require('../tools/firebase-guard/deployment-runner.cjs');
const parent='projects/'+PROJECT+'/locations/'+REGION;
const values={PROJECT_NUMBER:'123456789012',ADMIN_RUNTIME:'moderation-runtime@'+PROJECT+'.iam.gserviceaccount.com',DEFAULT_RUNTIME:'123456789012'+'-compute'+'@'+'developer.gserviceaccount.com',FIREBASE_CONFIG:JSON.stringify({projectId:PROJECT})};
const options=()=>({template:structuredClone(template),privateValues:structuredClone(values),confirmation:CONFIRMATION,archiveHash:'a'.repeat(64)});
function response(r) {
  if(r.url.endsWith('functions:generateUploadUrl'))return {status:200,body:{uploadUrl:'https://storage.googleapis.com/fixture/source.zip?Signature=fake',storageSource:{bucket:'fixture',object:'source.zip',generation:'1'}}};
  if(r.method==='GET'&&r.url.includes('cloudscheduler.googleapis.com'))return {status:404,body:{}};
  if(r.method==='GET'&&r.url.includes('compute.googleapis.com'))return {status:200,body:{defaultServiceAccount:values.DEFAULT_RUNTIME}};
  if(r.url.includes('/operations/')) {
    const id=r.url.split('/').at(-1);
    const source=template.requests.find(r=>r.body?.buildConfig?.entryPoint===id).body;
    return {status:200,body:{name:parent+'/operations/'+id,done:true,response:{name:parent+'/functions/'+id,buildConfig:{runtime:'nodejs22'},url:'https://'+id.toLowerCase()+'.run.app',serviceConfig:{service:parent+'/services/'+id.toLowerCase(),serviceAccountEmail:id==='moderateNicknames'?values.ADMIN_RUNTIME:values.DEFAULT_RUNTIME,maxInstanceCount:source.serviceConfig.maxInstanceCount,ingressSettings:source.serviceConfig.ingressSettings}}}};
  }
  const id=new URL(r.url).searchParams.get('functionId');
  if(id)return {status:200,body:{name:parent+'/operations/'+id}};
  return {status:200,body:r.url.endsWith('/jobs')?{name:r.body.name}:{}};
}
test('derived template has exactly nine Node22 Seoul creates and no admin Invoker',()=>{
  validateTemplate(template);
  const creates=template.requests.filter(r=>r.body?.buildConfig);
  assert.deepEqual(creates.map(r=>r.body.buildConfig.entryPoint).sort(),[...FUNCTIONS].sort());
  assert.equal(template.requests.filter(r=>r.url.endsWith(':setIamPolicy')).length,8);
  assert.equal(template.requests.some(r=>r.url.includes('SERVICE:moderateNicknames')),false);
  for(const r of creates)assert.equal(r.body.buildConfig.runtime,'nodejs22');
  assert.equal(JSON.stringify(template).includes('@'),false);
  assert.equal(/\d{10,}/.test(JSON.stringify(template)),false);
});
test('all captured normal requests complete using only a fake transport',async()=>{
  let sends=0;const result=await runPrepared({...options(),send:async r=>{sends++;return response(r);}});
  assert.equal(sends,33);assert.equal(result.completed,true);assert.equal(result.functions,9);assert.equal(result.schedules,2);
});
test('no final confirmation means zero transmissions',async()=>{
  for(const confirmation of [undefined,'','yes',CONFIRMATION+' ']) {
    let sends=0;const result=await runPrepared({...options(),confirmation,send:async()=>{sends++;}});
    assert.equal(sends,0);assert.equal(result.phase,'preflight');
  }
});
test('noninteractive confirmation cannot bypass the human terminal',async()=>{
  await assert.rejects(requestHumanConfirmation({isTTY:false},{isTTY:false}),/HUMAN/);
});
const mutations={
  'added function':t=>t.requests.push(structuredClone(t.requests[2])),
  'missing function':t=>t.requests.splice(2,1),
  'other project':t=>t.project='other-project',
  'other region':t=>t.region='us-central1',
  'other host':t=>t.requests[0].url=t.requests[0].url.replace('cloudfunctions.googleapis.com','other.invalid'),
  'other runtime':t=>t.requests[2].body.buildConfig.runtime='nodejs24',
  'existing update':t=>t.requests[2].method='PATCH',
  'existing delete':t=>t.requests[2].method='DELETE',
  'enable API':t=>t.requests.push({method:'POST',url:'https://serviceusage.googleapis.com/v1/projects/fixture/services/example:enable'}),
  'project IAM':t=>t.requests.push({method:'POST',url:'https://cloudresourcemanager.googleapis.com/v1/projects/fixture:setIamPolicy'}),
  'cleanup policy':t=>t.requests.push({method:'PATCH',url:'https://artifactregistry.googleapis.com/v1/projects/fixture/locations/fixture/repositories/fixture'}),
  'auto deletion prompt':t=>t.cleanupConfirmation=true,
  'duplicate request':t=>t.requests.splice(2,0,structuredClone(t.requests[2])),
  'admin public':t=>t.requests.push({method:'POST',url:'https://run.googleapis.com/v1/${SERVICE:moderateNicknames}:setIamPolicy',body:{policy:{bindings:[{role:'roles/run.invoker',members:['allUsers']}]}}}),
  'scheduled public':t=>{t.requests.find(r=>r.body?.policy?.bindings?.[0]?.members?.[0]==='serviceAccount:${DEFAULT_RUNTIME}').body.policy.bindings[0].members=['allUsers'];},
  'different max instances':t=>t.requests[2].body.serviceConfig.maxInstanceCount=3,
  'raw secret output attempt':t=>t.debug='fake@example.invalid / fake-token / session-fixture',
};
for(const [name,mutate] of Object.entries(mutations))test('before transport rejects '+name,async()=>{
  const opt=options();mutate(opt.template);let sends=0;
  const result=await runPrepared({...opt,send:async()=>{sends++;}});
  assert.equal(result.stopped,true);assert.equal(sends,0);
});
test('unexpected request and repeated mutation stop before sending',async()=>{
  const session=createSession(options());let sends=0;
  const first=session.next();await session.dispatch(first,async r=>{sends++;return response(r);});
  await assert.rejects(session.dispatch(first,async()=>{sends++;}));assert.equal(sends,1);
  assert.equal(session.summary().stopped,true);
});
test('partial deployment stops, counts only confirmed resources, no cleanup or retry',async()=>{
  let sends=0;const result=await runPrepared({...options(),send:async r=>{sends++;if(sends===6)throw Error('fake@example.invalid token=fixture');return response(r);}});
  assert.equal(sends,6);assert.equal(result.functions,1);assert.equal(result.stopped,true);
  assert.equal(result.possibleUnconfirmedResource,true);
  assert.equal(JSON.stringify(result).includes('fixture'),false);
});
for(const status of [301,403,409,500])test('HTTP '+status+' stops once',async()=>{
  let sends=0;const result=await runPrepared({...options(),send:async()=>{sends++;return {status,body:{token:'fake-token'}};}});
  assert.equal(sends,1);assert.equal(result.stopped,true);assert.equal(JSON.stringify(result).includes('token'),false);
});
test('existing scheduler is not overwritten',async()=>{
  let after=false;const result=await runPrepared({...options(),send:async r=>{
    assert.equal(after,false);
    if(r.method==='GET'&&r.url.includes('cloudscheduler.googleapis.com')){after=true;return {status:200,body:{}};}
    return response(r);
  }});assert.equal(after,true);assert.equal(result.stopped,true);assert.equal(result.schedules,0);
});
test('response from another project and redirected upload are rejected',async()=>{
  for(const uploadUrl of ['https://other.invalid/file?token=fake','http://storage.googleapis.com/a?b=c','https://storage.googleapis.com/a?x=y#bad']) {
    let sends=0;const result=await runPrepared({...options(),send:async r=>{sends++;const v=response(r);v.body.uploadUrl=uploadUrl;return v;}});
    assert.equal(sends,1);assert.equal(result.stopped,true);
  }
});
test('unapproved private resource configuration is blocked before transport',async()=>{
  for(const change of [v=>v.PROJECT_NUMBER='bad',v=>v.ADMIN_RUNTIME=v.DEFAULT_RUNTIME,v=>v.FIREBASE_CONFIG=JSON.stringify({projectId:PROJECT,storageBucket:'other'})]) {
    const opt=options();change(opt.privateValues);let sends=0;
    const result=await runPrepared({...opt,send:async()=>{sends++;}});assert.equal(sends,0);assert.equal(result.stopped,true);
  }
});
test('pending operation without done is bounded polling, not a create retry',async()=>{
  const session=createSession(options());let sends=0;
  for(let i=0;i<3;i++)await session.dispatch(session.next(),async r=>{sends++;return response(r);});
  const poll=session.next();
  await session.dispatch(poll,async()=>{sends++;return {status:200,body:{name:parent+'/operations/createProfile'}};});
  assert.ok(session.waitMs()>0);assert.equal(session.summary().functions,0);
  await assert.rejects(session.dispatch(poll,async()=>{sends++;}));assert.equal(sends,4);assert.equal(session.summary().stopped,true);
});
test('incorrect completion runtime is stopped and not counted as created',async()=>{
  let sends=0;const result=await runPrepared({...options(),send:async r=>{
    sends++;const res=response(r);if(r.url.includes('/operations/'))res.body.response.buildConfig.runtime='nodejs24';return res;
  }});assert.equal(sends,4);assert.equal(result.functions,0);assert.equal(result.possibleUnconfirmedResource,true);
});
test('changed archive fails before CLI loading or any transport',()=>{
  const {createDeploymentTransport}=require('../tools/firebase-guard/deployment-transport.cjs');
  assert.throws(()=>createDeploymentTransport('not-a-cli',Buffer.from('changed'),'a'.repeat(64),{}),/ARCHIVE_CHANGED/);
});
