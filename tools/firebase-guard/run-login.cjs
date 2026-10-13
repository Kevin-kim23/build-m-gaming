#!/usr/bin/env node
'use strict';
const trusted=process.stdout.write.bind(process.stdout);
const {installOutput}=require('./privacy.cjs');
installOutput();
// Login exposes only three fixed Korean states, never raw exceptions/URLs.
const status=value=>{if(['대기','완료','실패'].includes(value))trusted(value+'\n');};
const path=require('node:path'),child=require('node:child_process');
const {createRequire}=require('node:module');
const {checkSource}=require('./source-check.cjs');
const {createLoginSession,validateLoginArguments,SCOPES}=require('./login-session.cjs');
const {createReceiver}=require('./login-receiver.cjs');
const {prepareCredentialStore}=require('./login-store.cjs');
const {installNetworkGuard}=require('./network-guard.cjs');
const {installFileGuard}=require('./file-guard.cjs');
const {credentialsFromResponse}=require('./login-response.cjs');
// The only native child capability retained: open one validated browser URL.
const nativeSpawn=child.spawn.bind(child);
let active,receiver,store,finished=false;
function finish(ok) {
  if(finished)return;finished=true;
  if(!ok)active?.stop();
  if(ok)receiver?.dispose();else receiver?.close();
  store?.revoke();
  status(ok?'완료':'실패');process.exitCode=ok?0:(active?.rejectionCode()??1);
}
process.on('uncaughtException',()=>finish(false));
process.on('unhandledRejection',()=>finish(false));
process.on('warning',()=>finish(false));
process.on('SIGINT',()=>finish(false));
function openBrowser(url) {
  return new Promise((resolve,reject)=>{
    const executable=path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
    const browser=nativeSpawn(executable,['-NoLogo','-NoProfile','-NonInteractive','-Command',
      'Start-Process -FilePath $env:FIREBASE_GUARD_BROWSER_URL'],{
      windowsHide:true,shell:false,stdio:'ignore',
      env:{SystemRoot:process.env.SystemRoot,PATH:process.env.PATH,TEMP:process.env.TEMP,
        USERPROFILE:process.env.USERPROFILE,FIREBASE_GUARD_BROWSER_URL:url}
    });
    const timer=setTimeout(()=>{browser.kill();reject(new Error('GUARD_BROWSER_FAILED'));},15000);
    browser.once('error',()=>{clearTimeout(timer);reject(new Error('GUARD_BROWSER_FAILED'));});
    browser.once('exit',code=>{clearTimeout(timer);code===0?resolve():reject(new Error('GUARD_BROWSER_FAILED'));});
  });
}
async function main() {
  const [cliDir,...args]=process.argv.slice(2);
  validateLoginArguments(args);
  // The human must launch this fixed command in their own interactive Windows shell.
  if(process.platform!=='win32'||!process.stdin.isTTY||!process.stdout.isTTY||!process.versions.node.startsWith('22.'))throw new Error('GUARD_LOGIN_ENTRY');
  const repo=path.resolve(__dirname,'../..');
  if(!cliDir||!path.isAbsolute(cliDir)||path.resolve(cliDir).toLowerCase().startsWith(repo.toLowerCase()+path.sep))throw new Error('GUARD_LOGIN_ENTRY');
  if(Object.keys(process.env).some(k=>/^FIREBASE_/i.test(k))||
    ['NODE_OPTIONS','GOOGLE_APPLICATION_CREDENTIALS','HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy'].some(k=>process.env[k]))throw new Error('GUARD_LOGIN_ENV');
  checkSource(cliDir);
  const req=createRequire(path.join(cliDir,'package.json'));
  const api=req('./lib/api'),scope=req('./lib/scopes');
  if(api.authOrigin()!=='https://accounts.google.com')throw new Error('GUARD_LOGIN_ORIGIN');
  const scopes=[scope.EMAIL,scope.OPENID,scope.CLOUD_PROJECTS_READONLY,scope.FIREBASE_PLATFORM,scope.CLOUD_PLATFORM];
  const configPath=req('./lib/configstore').configstore.path;
  store=prepareCredentialStore(configPath,{expectedPath:configPath,repo,
    syncRoots:[process.env.OneDrive,process.env.OneDriveConsumer,process.env.OneDriveCommercial]});
  active=createLoginSession({args,clientId:api.clientId(),clientSecret:api.clientSecret(),scopes});
  const FormData=req('form-data');
  installFileGuard(()=>active.stop());
  const network=installNetworkGuard({policy:active});
  receiver=createReceiver(active);
  try {
    await network.startLoginReceiver(()=>receiver.start());
    status('대기');
    await active.openBrowser(active.browserUrl(),openBrowser);
    await receiver.result;
    if(active.isStopped())throw new Error('GUARD_LOGIN_STOPPED');
    const request=active.exchangeRequest(),form=new FormData();
    for(const [k,v] of Object.entries(request.body))form.append(k,v);
    request.wireBody=form.getBuffer();
    const response=await network.send(request,{method:'POST',headers:form.getHeaders(),body:request.wireBody});
    const text=await response.text();
    if(Buffer.byteLength(text)>65536)throw new Error('GUARD_LOGIN_RESPONSE');
    const body=JSON.parse(text);
    const credentials=credentialsFromResponse(body,api.clientId());
    active.complete(); // Close OAuth permission BEFORE writing the one credential file.
    store.save(credentials);
    finish(true);
  } catch {finish(false);}
}
if(require.main===module)main().catch(()=>finish(false));
