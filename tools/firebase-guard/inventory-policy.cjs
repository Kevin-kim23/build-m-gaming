'use strict';
const {PROJECT}=require('./constants.cjs');
const base='/projects/'+PROJECT;
const fail=()=>{throw new Error('GUARD_INVENTORY_DENIED');};
function createInventoryPolicy({diagnostic}={}) {
  const states=new Map(),regions={run:new Set(),scheduler:new Set()};
  const completed={run:false,scheduler:false},issued=new Set();
  function identify(u) {
    const p=u.pathname;
    for(const [service,host] of [['run','run.googleapis.com'],['scheduler','cloudscheduler.googleapis.com']]) {
      if(u.hostname!==host)continue;
      if(p==='/v1'+base+'/locations')return {key:u.origin+p,type:'locations',service,field:'locations'};
      const prefix=(service==='run'?'/v2':'/v1')+base+'/locations/';
      const suffix=service==='run'?'/services':'/jobs';
      if(p.startsWith(prefix)&&p.endsWith(suffix)) {
        const region=p.slice(prefix.length,-suffix.length);
        if(!completed[service]||!regions[service].has(region))fail();
        return {key:u.origin+p,type:'resources',service,field:service==='run'?'services':'jobs'};
      }
    }
    if(u.hostname==='firestore.googleapis.com') {
      const root='/v1'+base+'/databases/(default)';
      if(p===root)return {key:u.origin+p,type:'database'};
      if(p===root+'/collectionGroups/-/indexes')return {key:u.origin+p,type:'indexes',field:'indexes'};
    }
    return null;
  }
  function inspect(request) {
    const u=new URL(request.url),kind=identify(u);
    if(!kind)return null;
    if(request.method!=='GET'||request.body!==undefined)fail();
    const keys=[...u.searchParams.keys()];
    if(kind.type==='database') {if(keys.length||u.search)fail();}
    else if(keys.length!==new Set(keys).size||keys.some(k=>!['pageSize','pageToken'].includes(k))||
      u.searchParams.get('pageSize')!=='100')fail();
    const token=u.searchParams.get('pageToken');
    if(token!==null&&(!token||token.length>16384))fail();
    const state=states.get(kind.key);
    if(state?.done||state?.started&&token!==state.expected||!state?.started&&token!==null)fail();
    return {...kind,token};
  }
  function begin(request) {
    const kind=inspect(request);if(!kind)return false;
    let state=states.get(kind.key);
    if(!state){state={started:false,expected:null,pending:false,done:false};states.set(kind.key,state);}
    if(state.pending)fail();
    state.started=true;state.pending=true;state.url=request.url;
    return true;
  }
  function observe(request,response) {
    const invalid=check=>{diagnostic?.validation(check);fail();};
    const kind=identify(new URL(request.url));if(!kind)return false;
    const state=states.get(kind.key),body=response?.body;
    if(!state?.pending||state.url!==request.url||!response||response.status<200||response.status>=300||
      !body||typeof body!=='object'||Array.isArray(body))invalid('response-shape');
    if(body.unreachable!==undefined&&(!Array.isArray(body.unreachable)||body.unreachable.length))invalid('unreachable');
    state.pending=false;
    if(kind.type==='database'){state.done=true;return true;}
    const values=body[kind.field]??[];
    if(!Array.isArray(values))invalid('response-shape');
    if(kind.type==='locations')for(const entry of values) {
      const id=entry?.locationId;
      if(typeof id!=='string'||!/^([a-z]+-)+[a-z]+[0-9]+$/.test(id)||
        entry.name!==base.slice(1)+'/locations/'+id||regions[kind.service].has(id))invalid('region-identity');
      regions[kind.service].add(id);
    }
    const next=body.nextPageToken;
    if(next!==undefined&&typeof next!=='string')invalid('pagination');
    if(next) {
      if(next.length>16384||issued.has(next))invalid('pagination');
      issued.add(next);state.expected=next;
    } else {
      state.done=true;
      if(kind.type==='locations') {
        if(regions[kind.service].size===0)invalid('region-count');
        completed[kind.service]=true;
      }
    }
    return true;
  }
  return {inspect,begin,observe};
}
module.exports={createInventoryPolicy};
