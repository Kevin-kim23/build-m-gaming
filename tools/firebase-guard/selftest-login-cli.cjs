'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {createRequire}=require('node:module');
const {checkSource}=require('./source-check.cjs');
const {createLoginSession}=require('./login-session.cjs');
const {multipartFields}=require('./cli-bridge.cjs');
const {validateCredentialPath}=require('./login-store.cjs');
// Static CLI compatibility + synthetic OAuth data only. Never opens a browser,
// authenticates, reads credential content or transmits any request.
try {
  const cliDir=process.argv[2];checkSource(cliDir);
  const req=createRequire(path.join(cliDir,'package.json')),s=req('./lib/scopes'),api=req('./lib/api');
  assert.equal(api.authOrigin(),'https://accounts.google.com');
  const scopes=[s.EMAIL,s.OPENID,s.CLOUD_PROJECTS_READONLY,s.FIREBASE_PLATFORM,s.CLOUD_PLATFORM];
  const session=createLoginSession({args:['login','--localhost'],clientId:'FIXTURE_CLIENT',clientSecret:'FIXTURE_SECRET',scopes});
  session.bind('127.0.0.1',49152);
  const url=new URL(session.browserUrl());session.openBrowser(url.href,()=>{});
  session.receive({method:'GET',host:'localhost:49152',remoteAddress:'127.0.0.1',url:'/?state='+url.searchParams.get('state')+'&code=FIXTURE_CODE'});
  const request=session.exchangeRequest(),FormData=req('form-data'),form=new FormData();
  for(const [k,v] of Object.entries(request.body))form.append(k,v);
  assert.deepEqual(multipartFields(form),request.body);
  assert.equal(session.assert(request),'login-exchange');session.complete();
  assert.equal(session.mode(),'readonly');
  const configPath=req('./lib/configstore').configstore.path;
  validateCredentialPath(configPath,{expectedPath:configPath,repo:path.resolve(__dirname,'../..'),
    syncRoots:[process.env.OneDrive,process.env.OneDriveConsumer,process.env.OneDriveCommercial]});
  process.stdout.write('{"offlineLoginCli":"passed","credentialPathSafe":true}\n');
} catch {process.stdout.write('{"offlineLoginCli":"failed"}\n');process.exitCode=1;}
