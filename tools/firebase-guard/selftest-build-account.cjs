'use strict';
// Offline only: real CLI, synthetic credentials, no native transport.
const path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {installOutput}=require('./privacy.cjs');
const out=installOutput();
async function main(){
  const [cliDir,mode='normal',...extra]=process.argv.slice(2);
  if(extra.length||!['normal','refresh','error','invalid','replay','output','file','child'].includes(mode))throw Error('FIXTURE_MODE');
  require('./source-check.cjs').checkSource(cliDir);
  const req=createRequire(path.join(cliDir,'package.json'));
  const config=req('./lib/configstore').configstore;
  let memory={user:{email:'fixture@example.invalid'},tokens:{access_token:'FIXTURE_ACCESS',refresh_token:'FIXTURE_REFRESH',expires_at:mode==='refresh'?1:Date.now()+3600000,scopes:[]}};
  Object.defineProperty(config,'all',{configurable:true,get:()=>structuredClone(memory),set:v=>{memory=structuredClone(v);}});
  const policy=require('./request-policy.cjs').createPolicy({mode:'build-account'});
  let sent=0,refresh=0;
  require('./file-guard.cjs').installFileGuard(()=>policy.stop());
  const {NAME,URL,readBuildAccount}=require('./build-account-read.cjs');
  const network=require('./network-guard.cjs').installNetworkGuard({policy,transport:async target=>{
    if(target==='https://www.googleapis.com/oauth2/v3/token'){refresh++;return Response.json({access_token:'FIXTURE_REFRESHED',expires_in:3600,token_type:'Bearer'});}
    sent++;assert.equal(target,URL);
    if(mode==='error')return Response.json({error:{message:'fixture@example.invalid FIXTURE_TOKEN'}},{status:403});
    return Response.json({name:NAME,serviceAccountEmail:mode==='invalid'?'FIXTURE_BAD':'projects/budae-kiugi-dev/serviceAccounts/000000000000-compute@developer.gserviceaccount.com'});
  }});
  const {lib}=require('./cli-bridge.cjs').installCliBridge(cliDir,policy,network,out);
  lib('auth').setActiveAccount({},lib('auth').getGlobalDefaultAccount());
  if(mode==='file'||mode==='child'){
    assert.throws(()=>mode==='file'?require('node:fs').writeFileSync('firebase-debug.log','FIXTURE_RAW'):require('node:child_process').spawnSync(process.execPath,['-e','console.log("FIXTURE_RAW")']));
    assert.equal(sent,0);out.emit('request-blocked');return;
  }
  if(mode==='output'){console.log('FIXTURE_TOKEN fixture@example.invalid');process.stderr.write('FIXTURE_');process.stderr.write('RAW');}
  if(['error','invalid'].includes(mode)){await assert.rejects(()=>readBuildAccount(lib,out));assert.equal(sent,1);assert.equal(policy.isStopped(),true);out.emit('request-blocked');return;}
  await readBuildAccount(lib,out);
  if(mode==='replay')await assert.rejects(()=>readBuildAccount(lib,out));
  assert.equal(sent,1);assert.equal(refresh,mode==='refresh'?1:0);
}
main().catch(()=>{out.emit('command-failed');process.exitCode=1;});
