'use strict';
const {isDeepStrictEqual:equal}=require('node:util');
const {PROJECT,REGION,FUNCTIONS}=require('./constants.cjs');
const {createPolicy,parseTarget}=require('./request-policy.cjs');
const ROOT=`https://run.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/services/`;
const NAMES=Object.freeze(FUNCTIONS.map(name=>name.toLowerCase()));
const MASK='scaling.scalingMode,scaling.manualInstanceCount';
function createStopPolicy(projectNumber){
  if(!/^\d+$/.test(projectNumber))throw Error('stop-config');
  const auth=createPolicy();let stopped=false,permit=null;
  const reads=new Map(),writes=new Set(),operations=new Set();
  const names=new Set(NAMES.flatMap(n=>[`${ROOT.slice('https://run.googleapis.com/v2/'.length)}${n}`,`projects/${projectNumber}/locations/${REGION}/services/${n}`]));
  function fail(){stopped=true;throw Error('stop-denied');}
  function shape(r){
    let u;try{u=parseTarget(r.url);}catch{return fail();}
    if(u.origin!=='https://run.googleapis.com')return fail();
    const name=NAMES.find(n=>u.pathname===new URL(ROOT+n).pathname);
    if(name){
      if(r.method==='GET'&&!u.search&&r.body===undefined)return 'read';
      const b=r.body;
      if(r.method==='PATCH'&&u.search===`?updateMask=${MASK}`&&b&&
        equal(Object.keys(b).sort(),['etag','name','scaling'])&&names.has(b.name)&&b.name.endsWith('/'+name)&&
        typeof b.etag==='string'&&b.etag.length>0&&
        equal(b.scaling,{scalingMode:'MANUAL',manualInstanceCount:0}))return 'stop';
    }
    if(r.method==='GET'&&!u.search&&r.body===undefined&&
      operations.has(u.pathname))return 'operation';
    return fail();
  }
  return {
    allow(r){if(stopped||permit)return fail();const kind=shape(r);if(kind==='stop'&&writes.has(r.url))return fail();permit=structuredClone(r);},
    assert(r){if(stopped)return fail();if(r.url==='https://www.googleapis.com/oauth2/v3/token'&&r.method==='POST')return auth.assert(r);shape(r);if(!permit||!equal(r.url,permit.url)||!equal(r.method,permit.method)||!equal(r.body,permit.body))return fail();},
    begin(r){this.assert(r);if(r.url==='https://www.googleapis.com/oauth2/v3/token')return;const kind=shape(r);if(kind==='stop'){if(writes.has(r.url))return fail();writes.add(r.url);}else if(kind==='read'){const n=(reads.get(r.url)||0)+1;if(n>2)return fail();reads.set(r.url,n);}permit=null;},
    observe(r,response){
      if(r.method!=='PATCH')return;
      const name=response.body?.name;
      if(typeof name!=='string'||!new RegExp('^projects/('+PROJECT+'|'+projectNumber+')/locations/'+REGION+'/operations/[a-zA-Z0-9_-]+$').test(name))return fail();
      operations.add('/v2/'+name);
    },stop(){stopped=true;auth.stop();},isStopped(){return stopped||auth.isStopped();},
  };
}
module.exports={ROOT,NAMES,MASK,createStopPolicy};
