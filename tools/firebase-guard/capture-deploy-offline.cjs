'use strict';
// Offline discovery only. No authentication, real environment values or cloud transport.
const path=require('node:path');
const {createRequire}=require('node:module');
const {installNetworkGuard}=require('./network-guard.cjs');
const {installFileGuard}=require('./file-guard.cjs');
const {checkSource}=require('./source-check.cjs');
const {requestFromClient}=require('./cli-bridge.cjs');
const {PROJECT,REGION,FUNCTIONS,USER_FUNCTIONS,SCHEDULES}=require('./constants.cjs');
async function capture(cliDir,repo) {
  checkSource(cliDir);
  for(const [file,hash] of Object.entries(require('./deployment-source-fingerprints.json'))) {
    const bytes=require('node:fs').readFileSync(path.join(cliDir,file));
    if(require('node:crypto').createHash('sha256').update(bytes).digest('hex')!==hash)throw Error('DEPLOY_SOURCE_CHANGED');
  }
  const req=createRequire(path.join(cliDir,'package.json'));
  const lib=name=>req('./lib/'+name);
  const requests=[];
  let blocked=0,stopped=false;
  const network=installNetworkGuard({policy:{assert(){blocked++;throw Error('OFFLINE_ONLY');},stop(){stopped=true;},isStopped(){return stopped;}}});
  const restoreFiles=installFileGuard();
  const prior={...process.env};
  const stdout=process.stdout.write,stderr=process.stderr.write;
  process.stdout.write=process.stderr.write=()=>true;
  let stage='load';
  let originalRequest,Client;
  try {
    // All identities below are synthetic fixtures, never cloud lookup results.
    const number='123456789012';
    const admin='moderation-runtime@'+PROJECT+'.iam.gserviceaccount.com';
    const runtime=number+'-compute'+'@'+'developer.gserviceaccount.com';
    for(const key of Object.keys(process.env))if(/^(FIREBASE_|GOOGLE_|GCLOUD_|MODERATION_)/.test(key))delete process.env[key];
    process.env.GCLOUD_PROJECT=PROJECT;
    process.env.FIREBASE_CONFIG=JSON.stringify({projectId:PROJECT});
    const config=lib('configstore').configstore;
    Object.defineProperty(config,'all',{configurable:true,get:()=>({}),set:()=>{throw Error('OFFLINE_CONFIG_WRITE');}});
    const logger=lib('logger');logger.logger.clear();logger.useFileLogger=()=>{};
    Client=lib('apiv2').Client;const api=lib('api');originalRequest=Client.prototype.request;
    const storage={bucket:'offline-fixture',object:'source.zip',generation:'1'};
    const parent='projects/'+PROJECT+'/locations/'+REGION;
    const uploadUrl='https://storage.googleapis.com/offline-fixture/source.zip?GoogleAccessId=offline&Signature=fixture';
    Client.prototype.request=async function(options) {
      const r=requestFromClient(this,options,api);
      requests.push({method:r.method,url:r.url,body:r.uploadStream?{$archive:true}:structuredClone(r.body)});
      // This interceptor runs before auth/request retry/socket code.
      if(r.method==='GET'&&r.url==='https://compute.googleapis.com/compute/v1/projects/'+number)return {status:200,body:{defaultServiceAccount:runtime}};
      if(r.method==='GET'&&new URL(r.url).hostname==='cloudscheduler.googleapis.com')return {status:404,body:{}};
      if(r.url.endsWith('functions:generateUploadUrl'))return {status:200,body:{uploadUrl,storageSource:storage}};
      const id=new URL(r.url).searchParams.get('functionId');
      if(id)return {status:200,body:{name:parent+'/operations/'+id}};
      if(r.method==='GET'&&r.url.includes('/operations/')) {
        const name=r.url.split('/').at(-1);
        return {status:200,body:{done:true,response:{url:'https://'+name.toLowerCase()+'.offline.invalid',serviceConfig:{service:parent+'/services/'+name.toLowerCase()}}}};
      }
      return {status:200,body:{},response:{headers:new Headers({'x-goog-generation':'1'})}};
    };
    const loader=require(path.join(repo,'server/node_modules/firebase-functions/lib/runtime/loader.js'));
    const manifest=require(path.join(repo,'server/node_modules/firebase-functions/lib/runtime/manifest.js')).stackToWire(await loader.loadStack(path.join(repo,'server')));
    stage='resolve';
    const build=lib('deploy/functions/build');
    const configFile=JSON.parse(require('node:fs').readFileSync(path.join(repo,'firebase.json'),'utf8'));
    const configs=Array.isArray(configFile.functions)?configFile.functions:[configFile.functions];
    if(configs.length!==1||configs[0]?.codebase!=='game'||configs[0]?.source!=='server')throw Error('FUNCTION_SET');
    const runtimeChoice=lib('deploy/functions/runtimes/node/parseRuntimeAndValidateSDK').getRuntimeChoice(path.join(repo,'server'),configs[0].runtime);
    const discovered=lib('deploy/functions/runtimes/discovery/v1alpha1').buildFromV1Alpha1(manifest,PROJECT,REGION,runtimeChoice);
    const env={MODERATION_RUNTIME_SERVICE_ACCOUNT:admin,MODERATION_ADMIN_AUDIENCE:'',MODERATION_ADMIN_SUBJECT:''};
    const backend=build.toBackend(discovered,build.envWithTypes(discovered.params,env));
    lib('deploy/functions/prepare').resolveCpuAndConcurrency(backend);
    const endpoints=lib('deploy/functions/backend').allEndpoints(backend);
    stage='compare';
    if(JSON.stringify(endpoints.map(e=>e.id).sort())!==JSON.stringify([...FUNCTIONS].sort()))throw Error('FUNCTION_SET');
    for(const e of endpoints) {
      const user=USER_FUNCTIONS.includes(e.id),scheduled=Object.hasOwn(SCHEDULES,e.id);
      if(e.project!==PROJECT||e.region!==REGION||e.runtime!=='nodejs22'||e.platform!=='gcfv2'||e.maxInstances!==(user?2:1))throw Error('SETTINGS');
      if(e.id==='moderateNicknames'&&(e.serviceAccount!==admin||JSON.stringify(e.httpsTrigger?.invoker)!=='["private"]'))throw Error('ADMIN');
      if(user&&(!e.callableTrigger||e.serviceAccount))throw Error('CALLABLE');
      if(scheduled&&(e.serviceAccount||e.ingressSettings!=='ALLOW_INTERNAL_ONLY'||e.scheduleTrigger?.schedule!==SCHEDULES[e.id]||e.scheduleTrigger?.timeZone!=='Asia/Seoul'))throw Error('SCHEDULE');
    }
    stage='capture';
    const deploy=lib('deploy/functions/deploy');
    deploy.createReadStream=()=>require('node:stream').Readable.from(Buffer.from('offline ZIP fixture'));
    await deploy.uploadSourceV2(PROJECT,number,{functionsSourceV2:'offline-fixture.zip'},backend);
    const executor={run:fn=>fn()};
    const fabricator=new (lib('deploy/functions/release/fabricator').Fabricator)({executor,functionExecutor:executor,sources:{game:{storage}},projectId:PROJECT,projectNumber:number});
    for(const e of endpoints) {
      e.codebase='game';
      e.environmentVariables={...env,...lib('functions/env').loadFirebaseEnvs({projectId:PROJECT},PROJECT)};
      await fabricator.createV2Function(e,{withToken:fn=>fn()});
      if(Object.hasOwn(SCHEDULES,e.id)) {
        await fabricator.upsertScheduleV2(e);
      }
    }
    return {requests,endpoints,blocked,stage:'captured'};
  } catch(error) {return {stage,failed:true,blocked,check:['FUNCTION_SET','SETTINGS','ADMIN','CALLABLE','SCHEDULE'].includes(error.message)?error.message:'INTERNAL'};}
  finally {
    if(originalRequest)Client.prototype.request=originalRequest;
    process.stdout.write=stdout;process.stderr.write=stderr;
    for(const key of Object.keys(process.env))if(!(key in prior))delete process.env[key];
    Object.assign(process.env,prior);
    restoreFiles();network.restore();
  }
}
if(require.main===module)capture(process.argv[2],path.resolve(__dirname,'../..')).then(result=>{
  // Never serialize requests/endpoints, even on failure.
  let templateMatches=false;
  if(!result.failed)templateMatches=require('node:util').isDeepStrictEqual(require('./deployment-template.cjs').templateFromCapture(result),require('./deployment-template.json'));
  process.stdout.write(JSON.stringify({offlineCapture:result.failed?'failed':'passed',stage:result.stage,check:result.check,requests:result.requests?.length??0,blocked:result.blocked,templateMatches,externalTransmissions:0})+'\n');
  process.exitCode=result.failed||!templateMatches?1:0;
}).catch(()=>{process.stdout.write('{"offlineCapture":"failed"}\n');process.exitCode=1;});
module.exports={capture};
