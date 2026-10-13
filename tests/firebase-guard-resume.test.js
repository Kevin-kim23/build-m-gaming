import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createSession,CONFIRMATION}=require('../tools/firebase-guard/deployment-session.cjs');
const template=require('../tools/firebase-guard/deployment-template.json');
const values={PROJECT_NUMBER:'123456789012',DEFAULT_RUNTIME:'123456789012-compute@developer.gserviceaccount.com',ADMIN_RUNTIME:'moderation-runtime@budae-kiugi-dev.iam.gserviceaccount.com',FIREBASE_CONFIG:'{"projectId":"budae-kiugi-dev"}'};
const parent='projects/budae-kiugi-dev/locations/asia-northeast3';
const {bind}=require('../tools/firebase-guard/deployment-session.cjs');
function existing(){const r=bind(template.requests.find(r=>r.body?.buildConfig?.entryPoint==='createProfile').body,{...values,STORAGE_SOURCE:{bucket:'fixture',object:'a'}});return {...r,state:'ACTIVE',environment:'GEN_2',url:'https://asia-northeast3-budae-kiugi-dev.cloudfunctions.net/createProfile',serviceConfig:{...r.serviceConfig,service:parent+'/services/createprofile',serviceAccountEmail:values.DEFAULT_RUNTIME,ingressSettings:'ALLOW_ALL',minInstanceCount:0,timeoutSeconds:60}};}
test('resume requires distinct confirmation before any request',()=>{
  assert.throws(()=>createSession({privateValues:values,archiveHash:'a'.repeat(64),confirmation:CONFIRMATION,resume:true}));
});
test('resume validates existing inventory then skips first create and operation',async()=>{
  const {RESUME_CONFIRMATION}=require('../tools/firebase-guard/resume-plan.cjs');
  const s=createSession({privateValues:values,archiveHash:'a'.repeat(64),confirmation:RESUME_CONFIRMATION,resume:true});
  assert.equal(s.next().method,'GET');
  await s.dispatch(s.next(),async()=>({status:200,body:{functions:[existing()]}}));
  assert.equal(s.summary().preservedFunctions,1);
  await s.dispatch(s.next(),async()=>({status:200,body:{uploadUrl:'https://storage.googleapis.com/fixture/a?Signature=fake',storageSource:{bucket:'fixture',object:'a'}}}));
  await s.dispatch(s.next(),async()=>({status:200,body:{}}));
  assert.ok(s.next().url.endsWith('/services/createprofile:setIamPolicy'));
  assert.equal(s.summary().functions,0);
});
for(const kind of ['missing','extra','page','unreachable','runtime','max','account','state','env','name'])test('resume rejects '+kind+' before any mutation',async()=>{
  const {RESUME_CONFIRMATION}=require('../tools/firebase-guard/resume-plan.cjs');
  const s=createSession({privateValues:values,archiveHash:'a'.repeat(64),confirmation:RESUME_CONFIRMATION,resume:true});
  const f=existing(),body={functions:[f]};
  if(kind==='missing')body.functions=[];if(kind==='extra')body.functions.push(existing());if(kind==='page')body.nextPageToken='fixture';if(kind==='unreachable')body.unreachable=['fixture'];
  if(kind==='runtime')f.buildConfig.runtime='nodejs24';if(kind==='max')f.serviceConfig.maxInstanceCount=99;if(kind==='account')f.serviceConfig.serviceAccountEmail='other@example.invalid';if(kind==='state')f.state='FAILED';if(kind==='env')f.serviceConfig.environmentVariables.GCLOUD_PROJECT='other';if(kind==='name')f.name=parent+'/functions/other';
  let writes=0;await assert.rejects(()=>s.dispatch(s.next(),async r=>{if(r.method!=='GET')writes++;return {status:200,body};}));assert.equal(writes,0);assert.throws(()=>s.next());
});
test('completion accepts exact function path and reports wrong path by field name',()=>{
  const {validateFunction}=require('../tools/firebase-guard/function-response.cjs');
  const f=existing();assert.doesNotThrow(()=>validateFunction(f,'createProfile',values));
  f.url+='/extra';assert.throws(()=>validateFunction(f,'createProfile',values),/DEPLOYMENT_STOPPED/);
});

for(const kind of ['project','region','service','url-host','url-query','url-credentials','url-slash','entry','memory','concurrency','minimum','labels'])test('preserved configuration rejects '+kind,()=>{
 const {validateFunction}=require('../tools/firebase-guard/function-response.cjs');const f=existing();
 if(kind==='project')f.name=f.name.replace('budae-kiugi-dev','other');if(kind==='region')f.name=f.name.replace('asia-northeast3','us-central1');
 if(kind==='service')f.serviceConfig.service=parent+'/services/other';if(kind==='url-host')f.url='https://evil.invalid/createProfile';if(kind==='url-query')f.url+='?token=fixture';if(kind==='url-credentials')f.url=f.url.replace('https://','https://fixture@');if(kind==='url-slash')f.url+='/';
 if(kind==='entry')f.buildConfig.entryPoint='other';if(kind==='memory')f.serviceConfig.availableMemory='512Mi';if(kind==='concurrency')f.serviceConfig.maxInstanceRequestConcurrency=100;if(kind==='minimum')f.serviceConfig.minInstanceCount=1;if(kind==='labels')f.labels={};
 assert.throws(()=>validateFunction(f,'createProfile',values,undefined,{existing:true}));
});
test('service project alias must match configured project number exactly',()=>{
 const {validateFunction}=require('../tools/firebase-guard/function-response.cjs');const f=existing();
 f.serviceConfig.service=f.serviceConfig.service.replace('budae-kiugi-dev',values.PROJECT_NUMBER);assert.doesNotThrow(()=>validateFunction(f,'createProfile',values));
 f.serviceConfig.service=f.serviceConfig.service.replace(values.PROJECT_NUMBER,'999999999999');assert.throws(()=>validateFunction(f,'createProfile',values));
});
test('resume plan contains eight creates, no existing update/delete, and retains separately approved public step',()=>{
 const rs=require('../tools/firebase-guard/resume-plan.cjs').resumeRequests();assert.equal(rs.length,32);
 assert.equal(rs.filter(r=>r.body?.buildConfig?.entryPoint).length,8);assert.ok(!rs.some(r=>r.body?.buildConfig?.entryPoint==='createProfile'));
 assert.ok(!rs.some(r=>['PATCH','DELETE'].includes(r.method)));assert.equal(rs.filter(r=>r.url.endsWith(':setIamPolicy')).length,8);
 assert.ok(!rs.some(r=>r.url.includes('SERVICE:moderateNicknames')&&r.url.endsWith(':setIamPolicy')));
});
for(const malformed of [{unreachable:{}},{unreachable:'fixture'},{nextPageToken:0},{nextPageToken:null}])test('malformed inventory metadata fails closed '+JSON.stringify(malformed),()=>{
 assert.throws(()=>require('../tools/firebase-guard/resume-plan.cjs').validateExistingInventory({functions:[existing()],...malformed},values));
});

test('completion diagnostic emits only field name, never invalid value',()=>{
 const events=[],output=require('../tools/firebase-guard/privacy.cjs').createOutput(s=>events.push(JSON.parse(s)));
 const diagnostic=require('../tools/firebase-guard/diagnostics.cjs').createDiagnostics(output),f=existing();f.url='https://private.invalid/FIXTURE_TOKEN';
 assert.throws(()=>require('../tools/firebase-guard/function-response.cjs').validateFunction(f,'createProfile',values,diagnostic));
 assert.deepEqual(events,[{event:'guard-diagnostic',category:'validation-failed',check:'response.url'}]);
});
test('resume stops on first failed write and cannot send a second request',async()=>{
 const {RESUME_CONFIRMATION}=require('../tools/firebase-guard/resume-plan.cjs');
 const s=createSession({privateValues:values,archiveHash:'a'.repeat(64),confirmation:RESUME_CONFIRMATION,resume:true});
 await s.dispatch(s.next(),async()=>({status:200,body:{functions:[existing()]}}));
 let sends=0;await assert.rejects(()=>s.dispatch(s.next(),async()=>{sends++;return {status:403,body:{message:'FIXTURE_SECRET'}};}));
 assert.throws(()=>s.next());assert.equal(sends,1);assert.equal(s.summary().preservedFunctions,1);assert.equal(s.summary().functions,0);
});
