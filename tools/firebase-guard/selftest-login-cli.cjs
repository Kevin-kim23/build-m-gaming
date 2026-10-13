'use strict';
const trusted=process.stdout.write.bind(process.stdout);
require('./privacy.cjs').installOutput();
const assert=require('node:assert/strict'),path=require('node:path');
const {createRequire}=require('node:module');
const {checkSource,SOURCE_REASONS}=require('./source-check.cjs');
const {createLoginSession}=require('./login-session.cjs');
const {multipartFields}=require('./cli-bridge.cjs');
const {validateCredentialPath}=require('./login-store.cjs');
// Static CLI compatibility + synthetic OAuth data only. Never opens a browser,
// authenticates, reads credential content or transmits any request.
let check='cli-source',finished=false;
function failed(error){
  if(finished)return;finished=true;
  const result={offlineLoginCli:'failed',check};
  if(check==='cli-source'&&SOURCE_REASONS.includes(error?.guardReason))result.reason=error.guardReason;
  trusted(JSON.stringify(result)+'\n');process.exitCode=1;
}
process.on('warning',failed);process.on('uncaughtException',failed);process.on('unhandledRejection',failed);
try {
  const cliDir=process.argv[2];checkSource(cliDir);
  check='cli-modules';
  const req=createRequire(path.join(cliDir,'package.json')),s=req('./lib/scopes'),api=req('./lib/api');
  check='auth-origin';
  assert.equal(api.authOrigin(),'https://accounts.google.com');
  check='scope-session';
  const scopes=[s.EMAIL,s.OPENID,s.CLOUD_PROJECTS_READONLY,s.FIREBASE_PLATFORM,s.CLOUD_PLATFORM];
  const session=createLoginSession({args:['login','--localhost'],clientId:'FIXTURE_CLIENT',clientSecret:'FIXTURE_SECRET',scopes});
  session.bind('127.0.0.1',49152);
  const url=new URL(session.browserUrl());session.openBrowser(url.href,()=>{});
  session.receive({method:'GET',host:'localhost:49152',remoteAddress:'127.0.0.1',url:'/?state='+url.searchParams.get('state')+'&code=FIXTURE_CODE'});
  check='token-form';
  const request=session.exchangeRequest(),FormData=req('form-data'),form=new FormData();
  for(const [k,v] of Object.entries(request.body))form.append(k,v);
  assert.deepEqual(multipartFields(form),request.body);
  assert.equal(session.assert(request),'login-exchange');session.complete();
  assert.equal(session.mode(),'readonly');
  check='credential-path';
  const configPath=req('./lib/configstore').configstore.path;
  validateCredentialPath(configPath,{expectedPath:configPath,repo:path.resolve(__dirname,'../..'),
    syncRoots:[process.env.OneDrive,process.env.OneDriveConsumer,process.env.OneDriveCommercial]});
  setImmediate(()=>{if(!finished){finished=true;trusted('{"offlineLoginCli":"passed","credentialPathSafe":true}\n');}});
} catch(error) {failed(error);}
