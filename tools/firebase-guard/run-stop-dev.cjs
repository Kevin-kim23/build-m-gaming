#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),{isDeepStrictEqual:equal}=require('node:util');
const {ROOT,NAMES,MASK,createStopPolicy}=require('./stop-dev-policy.cjs');
const {PROJECT,REGION}=require('./constants.cjs');
const write=process.stdout.write.bind(process.stdout);
const output=require('./privacy.cjs').installOutput();
let policy,changed=0,verified=0,stage='configuration',pending=false;
const summary=ok=>write(JSON.stringify({event:'dev-stop-result',ok,stage,changed,verified,possibleUnconfirmedChange:pending})+'\n');
process.on('uncaughtException',()=>{policy?.stop();summary(false);process.exit(1);});
process.on('unhandledRejection',()=>{policy?.stop();summary(false);process.exit(1);});
async function main(){
  const [cliDir,approval,...extra]=process.argv.slice(2);
  if(approval!=='STOP_DEV_NINE_ONCE'||extra.length||process.versions.node.split('.')[0]!=='22'||
    !path.isAbsolute(cliDir)||cliDir.startsWith(path.resolve(__dirname,'../..')+path.sep)||
    Object.keys(process.env).some(k=>/^FIREBASE_/i.test(k)||(['NODE_OPTIONS','GOOGLE_APPLICATION_CREDENTIALS','HTTP_PROXY','HTTPS_PROXY','ALL_PROXY'].includes(k.toUpperCase())&&process.env[k])))throw Error('config');
  require('./source-check.cjs').checkSource(cliDir);
  const privatePath=path.join(process.env.LOCALAPPDATA,'BudaeKiugiPrivate','dev-deploy-values.json');
  const projectNumber=String(JSON.parse(fs.readFileSync(privatePath,'utf8')).PROJECT_NUMBER);
  policy=createStopPolicy(projectNumber);
  require('./file-guard.cjs').installFileGuard(()=>policy.stop());
  const diagnostic={attempted(){},http(status){if(status>=400)write(JSON.stringify({event:'http-error',status})+'\n');},blocked(){},transport(){},fallback(){}};
  const network=require('./network-guard.cjs').installNetworkGuard({policy,diagnostic});
  const {lib}=require('./cli-bridge.cjs').installCliBridge(cliDir,policy,network,output,diagnostic);
  const auth=lib('auth'),account=auth.getGlobalDefaultAccount();
  if(!account?.user||!account.tokens||(!account.tokens.access_token&&!account.tokens.refresh_token))throw Error('not-logged-in');
  auth.setActiveAccount({},account);
  const client=new (lib('apiv2').Client)({urlPrefix:'https://run.googleapis.com'});
  async function request(url,method='GET',body){
    policy.allow({url,method,body});
    return (await client.request({method,path:url.slice('https://run.googleapis.com'.length),body,skipLog:{reqBody:true,resBody:true}})).body;
  }
  const before=new Map();stage='preflight';
  for(const name of NAMES){
    const s=await request(ROOT+name);
    const allowed=[`projects/${PROJECT}/locations/${REGION}/services/${name}`,`projects/${projectNumber}/locations/${REGION}/services/${name}`];
    if(!allowed.includes(s.name)||!s.etag||!s.template||s.reconciling||s.terminalCondition?.state!=='CONDITION_SUCCEEDED'||
      [...(s.traffic||[]),...(s.trafficStatuses||[])].some(t=>t.tag)||s.scaling?.scalingMode==='MANUAL')throw Error('preflight');
    before.set(name,s);
  }
  write(JSON.stringify({event:'preflight-ok',services:before.size})+'\n');
  for(const name of NAMES){
    stage='stop';const prior=before.get(name);pending=true;
    let op=await request(ROOT+name+'?updateMask='+MASK,'PATCH',{
      name:prior.name,etag:prior.etag,scaling:{scalingMode:'MANUAL',manualInstanceCount:0}});
    for(let n=0;!op.done&&n<30;n++){
      if(!new RegExp('^projects/('+PROJECT+'|'+projectNumber+')/locations/'+REGION+'/operations/[a-zA-Z0-9_-]+$').test(op.name))throw Error('operation-shape');
      await new Promise(resolve=>setTimeout(resolve,1000));
      op=await request('https://run.googleapis.com/v2/'+op.name);
    }
    if(!op.done||op.error)throw Error('operation');changed++;stage='verify';
    const after=await request(ROOT+name);
    if(after.name!==prior.name||after.scaling?.scalingMode!=='MANUAL'||(after.scaling?.manualInstanceCount??0)!==0||
      !equal(after.template,prior.template)||!equal(after.traffic,prior.traffic)||after.ingress!==prior.ingress||
      after.latestCreatedRevision!==prior.latestCreatedRevision||after.latestReadyRevision!==prior.latestReadyRevision||
      after.scaling?.maxInstanceCount!==prior.scaling?.maxInstanceCount||after.scaling?.minInstanceCount!==prior.scaling?.minInstanceCount)throw Error('preservation');
    verified++;pending=false;write(JSON.stringify({event:'service-stopped',number:verified,service:name,settingsPreserved:true})+'\n');
  }
  stage='complete';summary(true);
}
main().catch(()=>{policy?.stop();summary(false);process.exitCode=1;});
