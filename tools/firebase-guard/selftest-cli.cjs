#!/usr/bin/env node
'use strict';
// Explicit offline harness: transport never reaches native fetch. Real account
// storage is replaced before its first read; synthetic values stay in memory.
const path=require('node:path');
const assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {checkSource}=require('./source-check.cjs');
const {installOutput}=require('./privacy.cjs');
const {installFileGuard}=require('./file-guard.cjs');
const {installNetworkGuard}=require('./network-guard.cjs');
const {createPolicy}=require('./request-policy.cjs');
const {installCliBridge}=require('./cli-bridge.cjs');
const out=installOutput();
process.on('uncaughtException',()=>{out.emit('command-failed');process.exitCode=1;});
process.on('unhandledRejection',()=>{out.emit('command-failed');process.exitCode=1;});
async function main() {
  const [cliDir,mode='normal',...extra]=process.argv.slice(2);
  if(extra.length||!['normal','refresh','error','unknown','warning','file'].includes(mode))throw new Error('FIXTURE_MODE');
  checkSource(cliDir);
  const req=createRequire(path.join(cliDir,'package.json'));
  const config=req('./lib/configstore').configstore;
  let memory={user:{email:'fixture-person@example.invalid'},tokens:{access_token:'FIXTURE_ACCESS',refresh_token:'FIXTURE_REFRESH',
    expires_at:mode==='refresh'?1:Date.now()+3600000,scopes:[]}};
  Object.defineProperty(config,'all',{configurable:true,get:()=>structuredClone(memory),set:v=>{memory=structuredClone(v);}});
  const policy=createPolicy();let sent=0,refreshed=0;
  installFileGuard(()=>{policy.stop();out.emit('file-write-blocked');});
  const network=installNetworkGuard({policy,transport:async(url)=>{
    sent++;
    if(url==='https://www.googleapis.com/oauth2/v3/token') {
      refreshed++;return Response.json({access_token:'FIXTURE_RENEWED',expires_in:3600,token_type:'Bearer'});
    }
    assert.equal(new URL(url).pathname,'/v1beta1/projects');
    if(mode==='error')return Response.json({error:{message:'FIXTURE_ERROR'}},{status:403});
    return Response.json(new URL(url).searchParams.has('pageToken')?{results:[]}:
      {results:[{projectId:'budae-kiugi-dev',displayName:'fixture-person@example.invalid',projectNumber:'000000000000'}],nextPageToken:'FIXTURE_PAGE'});
  }});
  const {lib}=installCliBridge(cliDir,policy,network,out);
  if(mode==='unknown') {
    await assert.rejects(new (lib('apiv2').Client)({urlPrefix:'https://firebase.googleapis.com',apiVersion:'v1beta1'})
      .get('/unknown'),/GUARD/);assert.equal(sent,0);out.emit('request-blocked');return;
  }
  if(mode==='warning') {
    assert.throws(()=>lib('logger').logger.warn('FIXTURE_TOKEN'),/GUARD/);assert.equal(sent,0);return;
  }
  if(mode==='file') {
    lib('logger').useFileLogger();lib('logger').logger.debug('FIXTURE_TOKEN');
    assert.throws(()=>require('node:fs').writeFileSync('firebase-debug.log','FIXTURE_TOKEN'),/GUARD/);
    assert.equal(sent,0);return;
  }
  const action=()=>lib('commands/projects-list').command.runner()({nonInteractive:true,json:true,project:'budae-kiugi-dev'});
  if(mode==='error') {
    await assert.rejects(action());assert.equal(sent,1);assert.equal(policy.isStopped(),true);out.emit('request-blocked');return;
  }
  const results=await action();
  assert.equal(results.length,1);assert.equal(sent,mode==='refresh'?3:2);assert.equal(refreshed,mode==='refresh'?1:0);
  assert.equal(policy.isStopped(),false);
  out.emit('projects-list-ok',{count:results.length,devVisible:true});
}
main().catch(()=>{out.emit('command-failed');process.exitCode=1;});
