'use strict';
const {isDeepStrictEqual:equal} = require('node:util');
const {PROJECT,REGION,FUNCTIONS,USER_FUNCTIONS,SCHEDULES}=require('./constants.cjs');
const {ADMIN_ACCOUNTS,accountEmail}=require('./admin-read.cjs');
const {createInventoryPolicy}=require('./inventory-policy.cjs');
const CF='https://cloudfunctions.googleapis.com';
const parent='projects/'+PROJECT+'/locations/'+REGION;
const denied=()=>Object.assign(new Error('GUARD_REQUEST_DENIED'),{code:'GUARD_REQUEST_DENIED'});
const keys=(value,allowed)=>value && typeof value==='object' && !Array.isArray(value) && Object.keys(value).every(k=>allowed.includes(k));
function parseTarget(raw) {
  if(typeof raw!=='string'||/[\s\\]/.test(raw)||/%2e|%2f|%5c|\/\.\.?\//i.test(raw))throw denied();
  const url=new URL(raw);
  if(url.protocol!=='https:'||url.username||url.password||url.hash||url.port)throw denied();
  if(url.href!==raw)throw denied();
  return url;
}
function queryOnly(url, names) {
  const all=[...url.searchParams.keys()];
  return all.every(k=>names.includes(k)) && new Set(all).size===all.length;
}
function jsonBody(body) {
  if(body===undefined)return undefined;
  if(Buffer.isBuffer(body))body=body.toString('utf8');
  if(typeof body==='string') {
    try{return JSON.parse(body);}catch{throw denied();}
  }
  return body;
}
function createPolicy({mode='projects',plan,diagnostic}={}) {
  if(!['projects','inventory','deploy'].includes(mode))throw denied();
  // Plans are private, explicitly reviewed snapshots, never derived from an outgoing request.
  const frozenPlan=plan?structuredClone(plan):null;
  const uploads=new Set();
  const operations=new Set();
  let stopped=false;
  const inventory=mode==='inventory'?createInventoryPolicy({diagnostic}):null;
  function reject(){diagnostic?.blocked(true,'request-policy');stopped=true;throw denied();}
  function decision(request) {
    if(stopped)throw denied();
    let u;
    try{u=parseTarget(request.url);}catch{return reject();}
    const method=request.method;
    if(!['GET','POST','PUT'].includes(method))return reject();
    const path=u.pathname, origin=u.origin;
    let body;
    try{body=jsonBody(request.body);}catch{return reject();}
    if(method==='GET'&&body!==undefined)return reject();
    try {if(inventory?.inspect(request))return 'inventory-read';}catch{return reject();}
    if(origin==='https://firebase.googleapis.com'&&method==='GET') {
      if(path==='/v1beta1/projects' && queryOnly(u,['pageSize','pageToken']) &&
        /^(?:[1-9]\d{0,2}|1000)$/.test(u.searchParams.get('pageSize')||'') &&
        (!u.searchParams.has('pageToken')||u.searchParams.get('pageToken').length>0))return 'projects-list';
      if(mode!=='projects'&&path==='/v1beta1/projects/'+PROJECT&&!u.search)return 'dev-project';
    }
    // Refresh is authentication maintenance, not a login flow or key/ADC fallback.
    if(origin==='https://www.googleapis.com'&&path==='/oauth2/v3/token'&&method==='POST'&&!u.search) {
      if(keys(body,['refresh_token','client_id','client_secret','grant_type','scope'])&&
        Object.keys(body).length===5&&body.grant_type==='refresh_token'&&
        ['refresh_token','client_id','client_secret'].every(k=>typeof body[k]==='string'&&body[k].length>0)&&typeof body.scope==='string'&&
        request.authRefresh===true)return 'token-refresh';
      return reject();
    }
    if(mode==='inventory'&&method==='GET'&&origin==='https://iam.googleapis.com'&&!u.search&&
      ADMIN_ACCOUNTS.some(name=>path==='/v1/projects/'+PROJECT+'/serviceAccounts/'+accountEmail(name)))return 'admin-account-get';
    if(mode!=='projects'&&method==='GET') {
      if(origin===CF&&path==='/v1/projects/'+PROJECT+'/locations/-/functions'&&!u.search)return 'functions-v1-list';
      if(origin===CF&&path==='/v2/projects/'+PROJECT+'/locations/-/functions'&&
        queryOnly(u,['filter','pageToken'])&&u.searchParams.get('filter')==='environment="GEN_2"')return 'functions-v2-list';
      if(mode==='deploy'&&origin==='https://run.googleapis.com'&&path==='/v1/projects/'+PROJECT+'/locations'&&!u.search)return 'run-locations';
    }
    if(mode!=='deploy'||!frozenPlan||frozenPlan.project!==PROJECT||frozenPlan.region!==REGION)return reject();
    if(method==='GET'&&operations.has(request.url)&&!u.search)return 'operation-poll';
    if(origin===CF&&path==='/v2/'+parent+'/functions:generateUploadUrl'&&method==='POST'&&!u.search&&body===undefined)return 'upload-url';
    if(method==='PUT'&&uploads.has(request.url)&&request.uploadStream===true)return 'source-upload';
    if(origin===CF&&path==='/v2/'+parent+'/functions'&&method==='POST'&&queryOnly(u,['functionId'])) {
      const id=u.searchParams.get('functionId'), expected=frozenPlan.functions?.[id];
      if(!FUNCTIONS.includes(id)||!expected||!equal(body,expected))return reject();
      if(body.name!==parent+'/functions/'+id||body.buildConfig?.runtime!=='nodejs22'||
        body.buildConfig?.entryPoint!==id||body.eventTrigger||body.serviceConfig?.secretEnvironmentVariables?.length)return reject();
      const service=body.serviceConfig;
      if(!service||service.minInstanceCount!==0||service.maxInstanceCount!==(USER_FUNCTIONS.includes(id)?2:1))return reject();
      const runtime=id==='moderateNicknames'?frozenPlan.moderationRuntime:frozenPlan.defaultRuntime;
      if(typeof runtime!=='string'||!/^[-a-zA-Z0-9._]+@[-a-zA-Z0-9.]+$/.test(runtime)||service.serviceAccountEmail!==runtime)return reject();
      if(id==='moderateNicknames'&&service.serviceAccountEmail!==frozenPlan.moderationRuntime)return reject();
      if(!USER_FUNCTIONS.includes(id)&&service.maxInstanceRequestConcurrency!==1)return reject();
      if(id in SCHEDULES&&service.ingressSettings!=='ALLOW_INTERNAL_ONLY')return reject();
      return 'function-create';
    }
    if(origin==='https://serviceusage.googleapis.com'&&method==='POST'&&!u.search&&equal(body,{})) {
      if(!/^\d+$/.test(frozenPlan.projectNumber||'')||frozenPlan.allowManagedAgents!==true)return reject();
      for(const api of ['pubsub.googleapis.com','eventarc.googleapis.com']) {
        if(path==='/v1beta1/projects/'+frozenPlan.projectNumber+'/services/'+api+':generateServiceIdentity')return 'managed-identity';
      }
    }
    if(origin==='https://run.googleapis.com'&&method==='POST'&&!u.search) {
      for(const id of [...USER_FUNCTIONS,...Object.keys(SCHEDULES)]) {
        const resource=frozenPlan.services?.[id];
        if(!resource||path!=='/v1/'+resource+':setIamPolicy')continue;
        if(!resource.startsWith(parent+'/services/'))return reject();
        const members=USER_FUNCTIONS.includes(id)?['allUsers']:['serviceAccount:'+frozenPlan.defaultRuntime];
        const expected={policy:{bindings:[{role:'roles/run.invoker',members}],etag:'',version:3},updateMask:'bindings,etag,version'};
        if(equal(body,expected))return 'service-invoker';
      }
    }
    if(origin==='https://cloudscheduler.googleapis.com'&&path==='/v1/'+parent+'/jobs'&&method==='POST'&&!u.search) {
      for(const [id,schedule] of Object.entries(SCHEDULES)) {
        const expected=frozenPlan.jobs?.[id];
        if(!expected||!equal(body,expected))continue;
        if(body.name!==parent+'/jobs/firebase-schedule-'+id+'-'+REGION||
          body.schedule!==schedule||body.timeZone!=='Asia/Seoul'||body.pubsubTarget||
          body.httpTarget?.uri!==frozenPlan.uris?.[id]||body.httpTarget?.httpMethod!=='POST'||
          body.httpTarget?.oidcToken?.serviceAccountEmail!==frozenPlan.defaultRuntime||
          body.retryConfig?.retryCount!==2)return reject();
        return 'scheduler-create';
      }
    }
    return reject();
  }
  function observe(request,response) {
    if(stopped)return reject();
    try {if(inventory?.observe(request,response))return;}catch{return reject();}
    // Only a successful response to our authorized request may mint a dynamic capability.
    const kind=decision(request);
    if(!response||response.status<200||response.status>=300)return reject();
    if(kind==='upload-url') {
      let u;
      try{u=parseTarget(response.body?.uploadUrl);}catch{return reject();}
      if(u.hostname!=='storage.googleapis.com'||!u.search||u.pathname==='/')return reject();
      uploads.add(u.href);
    }
    if(kind==='source-upload')uploads.delete(request.url);
    if(['function-create','managed-identity'].includes(kind)&&response.body?.name&&!response.body.done) {
      const name=response.body.name;
      const pattern=kind==='function-create'?new RegExp('^projects/'+PROJECT+'/locations/'+REGION+'/operations/[a-zA-Z0-9_-]+$'):/^operations\/[a-zA-Z0-9_-]+$/;
      if(!pattern.test(name))return reject();
      operations.add((kind==='function-create'?CF+'/v2/':'https://serviceusage.googleapis.com/v1beta1/')+name);
    }
  }
  async function dispatch(request,send) {
    const kind=decision(request);
    begin(request);
    try { const response=await send(request); observe(request,response);return {kind,response}; }
    catch { stopped=true;throw Object.assign(new Error('GUARD_TRANSPORT_STOPPED'),{code:'GUARD_TRANSPORT_STOPPED'}); }
  }
  function begin(request) {
    decision(request);
    try {inventory?.begin(request);}catch{return reject();}
  }
  return Object.freeze({assert:decision,begin,observe,dispatch,stop:()=>{stopped=true;},isStopped:()=>stopped});
}
module.exports={createPolicy,parseTarget};
