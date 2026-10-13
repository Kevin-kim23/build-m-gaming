'use strict';
// Real pinned CLI and real guards, synthetic account and transport only.
const path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {createHash}=require('node:crypto');
const write=process.stdout.write.bind(process.stdout);
const out=require('./privacy.cjs').installOutput();
const diagnosticEvents=[];
const diagnostic=require('./diagnostics.cjs').createDiagnostics(require('./privacy.cjs').createOutput(s=>diagnosticEvents.push(JSON.parse(s))));
const {PROJECT,REGION}=require('./constants.cjs');
const template=require('./deployment-template.json');
const {CONFIRMATION}=require('./deployment-session.cjs');
const {runPrepared}=require('./deployment-runner.cjs');
let stage='source';
async function main() {
  const [cliDir,mode='normal']=process.argv.slice(2);
  if(!['normal','refresh','missing-confirmation','error','partial','files','output','child','network-error','bad-response','missing-generation','signed-query','resume','resume-extra','resume-no-confirmation'].includes(mode))throw Error('MODE');
  const resume=mode.startsWith('resume');
  require('./source-check.cjs').checkSource(cliDir);
  const req=createRequire(path.join(cliDir,'package.json'));
  let memory={user:{email:'fixture'+'@example.invalid'},tokens:{access_token:'FIXTURE_ACCESS',refresh_token:'FIXTURE_REFRESH',expires_at:mode==='refresh'?1:Date.now()+3600000,scopes:[]}};
  Object.defineProperty(req('./lib/configstore').configstore,'all',{configurable:true,get:()=>structuredClone(memory),set:v=>{memory=structuredClone(v);}});
  const values={PROJECT_NUMBER:'123456789012',ADMIN_RUNTIME:'moderation-runtime@'+PROJECT+'.iam.gserviceaccount.com',DEFAULT_RUNTIME:'123456789012'+'-compute'+'@'+'developer.gserviceaccount.com',FIREBASE_CONFIG:JSON.stringify({projectId:PROJECT})};
  const archive=Buffer.from('FAKE_ZIP'),archiveHash=createHash('sha256').update(archive).digest('hex');
  const parent='projects/'+PROJECT+'/locations/'+REGION;
  let sends=0,refreshes=0;
  const signedUrl=mode==='signed-query'?'https://storage.googleapis.com/fixture/source.zip?GoogleAccessId=fixture@example.invalid&Signature=a%2fb%20c~&Expires=123':'https://storage.googleapis.com/fixture/source.zip?GoogleAccessId=fixture&Signature=fixture';
  const fakeTransport=async (url,opts)=>{
    if(url==='https://www.googleapis.com/oauth2/v3/token') {refreshes++;return Response.json({access_token:'FIXTURE_RENEWED',expires_in:3600,token_type:'Bearer'});}
    sends++;
    if(resume&&url.includes('/locations/-/functions')){
      const f=require('./deployment-session.cjs').bind(template.requests.find(r=>r.body?.buildConfig?.entryPoint==='createProfile').body,{...values,STORAGE_SOURCE:{bucket:'fixture',object:'a'}});
      Object.assign(f,{state:'ACTIVE',environment:'GEN_2',url:'https://'+REGION+'-'+PROJECT+'.cloudfunctions.net/createProfile'});
      Object.assign(f.serviceConfig,{service:parent+'/services/createprofile',serviceAccountEmail:values.DEFAULT_RUNTIME,ingressSettings:'ALLOW_ALL',minInstanceCount:0,timeoutSeconds:60});
      return Response.json({functions:mode==='resume-extra'?[f,f]:[f]});
    }
    if(resume){assert.notEqual(new URL(url).searchParams.get('functionId'),'createProfile');assert.ok(!['DELETE','PATCH'].includes(opts.method));}
    if(mode==='network-error')throw Object.assign(new Error('FIXTURE_SECRET private@example.invalid'),{code:'ECONNRESET'});
    if(mode==='bad-response')return Response.json({uploadUrl:'FIXTURE_SECRET private@example.invalid'});
    if(mode==='error'||mode==='partial'&&sends===6)return Response.json({error:{message:'FIXTURE_TOKEN private@example.invalid'}},{status:403});
    if(url.endsWith('functions:generateUploadUrl'))return Response.json({uploadUrl:signedUrl,storageSource:{bucket:'fixture',object:'source.zip',...(mode==='missing-generation'?{}:{generation:'1'})}});
    if(opts.method==='PUT'){assert.equal(url,signedUrl,'signed URL must be sent byte-for-byte without query reserialization');return new Response('',{status:200});}
    if(url.includes('compute.googleapis.com'))return Response.json({defaultServiceAccount:values.DEFAULT_RUNTIME});
    if(url.includes('cloudscheduler.googleapis.com'))return opts.method==='GET'?Response.json({error:{message:'missing'}},{status:404}):Response.json({name:JSON.parse(opts.body).name});
    if(url.includes('/operations/')) {
      const id=url.split('/').at(-1),source=template.requests.find(r=>r.body?.buildConfig?.entryPoint===id).body;
      return Response.json({name:parent+'/operations/'+id,done:true,response:{name:parent+'/functions/'+id,buildConfig:{runtime:'nodejs22'},url:'https://'+id.toLowerCase()+'.run.app',serviceConfig:{service:parent+'/services/'+id.toLowerCase(),serviceAccountEmail:id==='moderateNicknames'?values.ADMIN_RUNTIME:values.DEFAULT_RUNTIME,maxInstanceCount:source.serviceConfig.maxInstanceCount,ingressSettings:source.serviceConfig.ingressSettings}}});
    }
    const id=new URL(url).searchParams.get('functionId');
    return Response.json(id?{name:parent+'/operations/'+id}:{});
  };
  stage='runner';
  let send;
  const result=await runPrepared({privateValues:values,archiveHash,resume,confirmation:['missing-confirmation','resume-no-confirmation'].includes(mode)?'':resume?require('./resume-plan.cjs').RESUME_CONFIRMATION:CONFIRMATION,diagnostic,send:async r=>{
    if(!send)send=require('./deployment-transport.cjs').createDeploymentTransport(cliDir,archive,archiveHash,out,{fakeTransport,diagnostic});
    if(mode==='files')require('node:fs').writeFileSync('firebase-debug.log','FIXTURE_TOKEN');
    if(mode==='child')require('node:child_process').execSync('echo FIXTURE_TOKEN');
    if(mode==='output'){process.stdout.write('FIXTURE_');process.stderr.write('TOKEN private@example.invalid');}
    return send(r);
  }});
  stage='assertions';
  if(mode==='resume'){assert.equal(result.completed,true);assert.equal(sends,32);assert.equal(result.functions,8);assert.equal(result.preservedFunctions,1);assert.equal(result.schedules,2);}
  else if(mode==='resume-extra'){assert.equal(result.stopped,true);assert.equal(sends,1);}
  else if(['normal','refresh','output','missing-generation','signed-query'].includes(mode)){assert.equal(result.completed,true);assert.equal(sends,33);}
  else {assert.equal(result.stopped,true);assert.equal(sends,mode==='partial'?6:['error','network-error','bad-response'].includes(mode)?1:0);}
  if(mode==='error')assert.ok(diagnosticEvents.some(e=>e.category==='http-response'&&e.status===403));
  if(mode==='network-error')assert.ok(diagnosticEvents.some(e=>e.category==='transport-failed'&&e.transport==='connection'));
  if(mode==='bad-response')assert.ok(diagnosticEvents.some(e=>e.check==='upload-url'));
  assert.doesNotMatch(JSON.stringify(diagnosticEvents),/FIXTURE|@|https:/);
  if(mode==='refresh')assert.equal(refreshes,1);
  write(JSON.stringify({offlineDeployment:'passed',requests:sends,externalTransmissions:0})+'\n');
}
main().catch(()=>{write(JSON.stringify({offlineDeployment:'failed',check:stage})+'\n');process.exitCode=1;});
