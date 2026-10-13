'use strict';
const {isDeepStrictEqual:equal}=require('node:util');
const {createHash}=require('node:crypto');
const {PROJECT,REGION,FUNCTIONS}=require('./constants.cjs');
const canonical=require('./deployment-template.json');
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
freeze(canonical);
const CONFIRMATION='DEPLOY DEV NINE FUNCTIONS ONCE';
const parent='projects/'+PROJECT+'/locations/'+REGION;
const fail=()=>{throw Error('DEPLOYMENT_STOPPED');};
function validateTemplate(template) {
  if(!equal(template,canonical))fail();
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}
function bind(value,slots) {
  if(value&&typeof value==='object') {
    if(value.$slot){if(!Object.hasOwn(slots,value.$slot))fail();return structuredClone(slots[value.$slot]);}
    if(Array.isArray(value))return value.map(v=>bind(v,slots));
    return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,bind(v,slots)]));
  }
  if(typeof value!=='string')return value;
  return value.replace(/\$\{([^}]+)\}/g,(_,name)=>{
    if(typeof slots[name]!=='string')fail();return slots[name];
  });
}
function createSession({template=canonical,privateValues,confirmation,archiveHash,diagnostic}) {
  validateTemplate(template);
  if(confirmation!==CONFIRMATION||!/^[a-f0-9]{64}$/.test(archiveHash||''))fail();
  const slots=structuredClone(privateValues);
  if(!equal(Object.keys(slots).sort(),['ADMIN_RUNTIME','DEFAULT_RUNTIME','FIREBASE_CONFIG','PROJECT_NUMBER'].sort())||
    !/^\d{6,20}$/.test(slots.PROJECT_NUMBER)||
    slots.ADMIN_RUNTIME!=='moderation-runtime@'+PROJECT+'.iam.gserviceaccount.com'||
    slots.DEFAULT_RUNTIME!==slots.PROJECT_NUMBER+'-compute'+'@'+'developer.gserviceaccount.com')fail();
  const config=JSON.parse(slots.FIREBASE_CONFIG);
  // This release uses Firestore only; no extra Firebase resources are inferred.
  if(!equal(config,{projectId:PROJECT}))fail();
  let index=0,stopped=false,busy=false,polls=0,earliestPoll=0,unknown=false;
  const created={functions:0,schedules:0},seenOps=new Set(),seenServices=new Set();
  const stop=()=>{stopped=true;};
  function next() {if(stopped||busy)fail();return index<canonical.requests.length?bind(canonical.requests[index],slots):null;}
  function check(request) {
    try {if(!equal(request,next()))fail();}catch {stop();fail();}
    return true;
  }
  function accept(request,response) {
    const model=canonical.requests[index],body=response?.body;
    const getJob=request.method==='GET'&&request.url.includes('cloudscheduler.googleapis.com');
    if(getJob) {if(response.status!==404)fail();index++;return;}
    if(!Number.isInteger(response?.status)||response.status<200||response.status>=300)fail();
    if(model.url.endsWith('functions:generateUploadUrl')) {
      const u=new URL(body.uploadUrl);
      if(u.protocol!=='https:'||u.hostname!=='storage.googleapis.com'||u.username||u.password||u.port||u.hash||!u.search||u.pathname==='/')fail();
      const s=body.storageSource;
      if(!s||!equal(Object.keys(s).sort(),['bucket','generation','object'])||
        !Object.values(s).every(v=>typeof v==='string'&&v.length>0&&v.length<2048))fail();
      slots.UPLOAD_URL=u.href;slots.STORAGE_SOURCE=structuredClone(s);
    } else if(request.method==='POST'&&new URL(request.url).searchParams.has('functionId')) {
      const id=new URL(request.url).searchParams.get('functionId');
      if(body?.error||!new RegExp('^'+parent+'/operations/[A-Za-z0-9_-]+$').test(body?.name)||seenOps.has(body.name))fail();
      slots['OPERATION:'+id]=body.name;seenOps.add(body.name);
    } else if(model.url.includes('${OPERATION:')) {
      const id=/\$\{OPERATION:([^}]+)\}/.exec(model.url)[1];
      if(body?.error||body?.name!==slots['OPERATION:'+id]||![undefined,false,true].includes(body.done))fail();
      if(!body.done) {
        if(++polls>360)fail();
        earliestPoll=Date.now()+5000;
        return; // Successful pending status is polling, never an error retry.
      }
      const f=body.response,s=f?.serviceConfig;
      if(f?.name!==parent+'/functions/'+id||f?.buildConfig?.runtime!=='nodejs22'||
        s?.maxInstanceCount!==canonical.requests.find(r=>r.body?.buildConfig?.entryPoint===id).body.serviceConfig.maxInstanceCount||
        s?.serviceAccountEmail!==(id==='moderateNicknames'?slots.ADMIN_RUNTIME:slots.DEFAULT_RUNTIME)||
        !new RegExp('^'+parent+'/services/[a-z][a-z0-9-]{0,62}$').test(s?.service)||seenServices.has(s.service))fail();
      const u=new URL(f.url);
      if(u.protocol!=='https:'||u.port||u.username||u.password||u.search||u.hash||u.pathname!=='/'||
        !(u.hostname.endsWith('.run.app')||u.hostname===REGION+'-'+PROJECT+'.cloudfunctions.net'))fail();
      if(['retryAccountDeletions','purgeExpiredServerRecords'].includes(id)&&s.ingressSettings!=='ALLOW_INTERNAL_ONLY')fail();
      slots['SERVICE:'+id]=s.service;slots['URI:'+id]=f.url;seenServices.add(s.service);
      created.functions++;polls=0;earliestPoll=0;
    } else if(request.method==='GET'&&request.url.includes('compute.googleapis.com')) {
      if(body?.defaultServiceAccount!==slots.DEFAULT_RUNTIME)fail();
    } else if(request.method==='POST'&&request.url.endsWith('/jobs')) {
      if(body?.name!==request.body.name)fail();created.schedules++;
    }
    index++;
  }
  async function dispatch(request,send) {
    check(request);
    if(Date.now()<earliestPoll){stop();fail();}
    busy=true;
    try {
      const response=await send(structuredClone(request));
      if(stopped)fail();
      try {accept(request,response);} catch {diagnostic?.validation('response-shape');throw Error('DEPLOYMENT_STOPPED');}
    } catch {diagnostic?.fallback();unknown=true;stop();fail();}
    finally {busy=false;}
  }
  return Object.freeze({next,check,dispatch,stop,archiveHash,
    waitMs:()=>Math.max(0,earliestPoll-Date.now()),
    summary:()=>({completed:!stopped&&index===canonical.requests.length,stopped,functions:created.functions,schedules:created.schedules,possibleUnconfirmedResource:unknown})});
}
module.exports={createSession,validateTemplate,CONFIRMATION,bind};
