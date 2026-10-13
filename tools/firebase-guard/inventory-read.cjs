'use strict';
const {isDeepStrictEqual:equal}=require('node:util');
const {PROJECT,REGION}=require('./constants.cjs');
const database='projects/'+PROJECT+'/databases/(default)';
function expectedFields(fields) {
  if(!Array.isArray(fields)||!fields.length)throw new Error('GUARD_INDEX_DEFINITION');
  const copy=structuredClone(fields);
  if(copy.at(-1).fieldPath!=='__name__')copy.push({fieldPath:'__name__',order:copy.at(-1).order||'ASCENDING'});
  return copy;
}
function matchIndex(index,definition) {
  const prefix=database+'/collectionGroups/'+definition.collectionGroup+'/indexes/';
  return typeof index?.name==='string'&&index.name.startsWith(prefix)&&
    /^[a-zA-Z0-9_-]+$/.test(index.name.slice(prefix.length))&&index.queryScope===definition.queryScope&&
    equal(index.fields,expectedFields(definition.fields))&&
    (index.apiScope===undefined||index.apiScope===(definition.apiScope||'ANY_API'));
}
async function readInventory(get,output,definition,diagnostic) {
  let stage='run';
  const emit=(event,details={})=>output.emit(event,{kind:stage,...details});
  const invalid=check=>{diagnostic?.validation(check);throw new Error('GUARD_INVENTORY_VALIDATION');};
  const unexpected=count=>{emit('inventory-unexpected',{count});invalid('unexpected-resource');};
  async function pages(host,path,field,onPage=()=>{}) {
    let token,steps=0;const values=[],seen=new Set();
    do {
      if(++steps>1000)invalid('pagination');
      const query={pageSize:'100'};if(token)query.pageToken=token;
      const body=await get(host,path,query);
      if(!body||typeof body!=='object'||Array.isArray(body)||body.unreachable?.length)invalid('response-shape');
      const list=body[field]??[];if(!Array.isArray(list))invalid('response-shape');
      onPage(list);values.push(...list);
      token=body.nextPageToken;
      if(token!==undefined&&typeof token!=='string')invalid('pagination');
      if(token){if(seen.has(token))invalid('pagination');seen.add(token);}
    } while(token);
    return values;
  }
  try {
    for(const service of ['run','scheduler']) {
      stage=service;emit('inventory-stage-start');
      const host=service==='run'?'run.googleapis.com':'cloudscheduler.googleapis.com';
      const locations=await pages(host,'/v1/projects/'+PROJECT+'/locations','locations');
      let checked=0;
      for(const location of locations) {
        const root=(service==='run'?'/v2':'/v1')+'/projects/'+PROJECT+'/locations/'+location.locationId;
        await pages(host,root+(service==='run'?'/services':'/jobs'),service==='run'?'services':'jobs',
          list=>{if(list.length)unexpected(list.length);});
        checked++;
      }
      if(!checked)invalid('region-count');
      emit('inventory-stage-ok',{count:0,regions:checked});
    }
    stage='database';emit('inventory-stage-start');
    const db=await get('firestore.googleapis.com','/v1/'+database);
    if(db?.name!==database||db.locationId!==REGION)invalid('database-location');
    emit('inventory-stage-ok',{count:1,regions:1});
    stage='indexes';emit('inventory-stage-start');
    if(!Array.isArray(definition?.indexes)||!definition.indexes.length)invalid('index-definition');
    const matched=new Set();
    const indexes=await pages('firestore.googleapis.com','/v1/'+database+'/collectionGroups/-/indexes','indexes',list=>{
      for(const index of list) {
        const match=definition.indexes.findIndex(item=>matchIndex(index,item));
        if(match<0||matched.has(match))unexpected(1);
        matched.add(match);
        if(index.state!=='READY')invalid('index-ready');
      }
    });
    if(matched.size!==definition.indexes.length)invalid('index-missing');
    emit('inventory-stage-ok',{count:indexes.length,regions:1});
  } catch {
    diagnostic?.fallback();
    emit('inventory-stage-failed');throw new Error('GUARD_INVENTORY_FAILED');
  }
}
function cliInventoryGet(lib) {
  const {Client}=lib('apiv2'),clients=new Map();
  return async(host,path,queryParams)=>{
    if(!clients.has(host))clients.set(host,new Client({urlPrefix:'https://'+host}));
    const response=await clients.get(host).get(path,{queryParams,skipLog:{reqBody:true,resBody:true}});
    return response.body;
  };
}
module.exports={expectedFields,matchIndex,readInventory,cliInventoryGet};
