'use strict';
const {AsyncLocalStorage}=require('node:async_hooks');
const {syncBuiltinESMExports}=require('node:module');
const {isDeepStrictEqual}=require('node:util');
const http=require('node:http'),https=require('node:https'),net=require('node:net'),tls=require('node:tls');
const http2=require('node:http2'),child=require('node:child_process'),worker=require('node:worker_threads');
const dgram=require('node:dgram'),dns=require('node:dns');
function installNetworkGuard({policy,onBlocked=()=>{},transport=globalThis.fetch}) {
  const grant=new AsyncLocalStorage(),originals=[];
  function block(){policy.stop();onBlocked();throw Object.assign(new Error('GUARD_REQUEST_DENIED'),{code:'GUARD_REQUEST_DENIED'});}
  function patch(object,key,value){originals.push([object,key,object[key]]);object[key]=value;}
  // Only the exact fetch granted by the CLI bridge may open a socket.
  for(const [object,key] of [[http,'request'],[http,'get'],[https,'request'],[https,'get'],[http2,'connect']])patch(object,key,block);
  for(const [object,key] of [[net.Socket.prototype,'connect'],[tls,'connect']]) {
    const original=object[key];
    patch(object,key,function(...args) {
      const permit=grant.getStore();
      const options=Array.isArray(args[0])?args[0][0]:args[0];
      if(!permit||policy.isStopped()||!options||typeof options!=='object'||options.path||
        (options.host||options.hostname)!==permit.host||Number(options.port)!==443)return block();
      return original.apply(this,args);
    });
  }
  for(const key of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'])patch(child,key,block);
  patch(dgram,'createSocket',block);
  patch(dgram.Socket.prototype,'send',block);
  for(const key of ['lookup','resolve','resolve4','resolve6','resolveAny','resolveCname','resolveMx','resolveTxt','reverse']) {
    for(const object of [dns,dns.promises]) {
      if(typeof object[key]!=='function')continue;
      const original=object[key];
      patch(object,key,function(host,...args) {
        if(!grant.getStore()||host!==grant.getStore().host||policy.isStopped())return block();
        return original.call(this,host,...args);
      });
    }
  }
  patch(worker,'Worker',class {constructor(){block();}});
  if('WebSocket' in globalThis)patch(globalThis,'WebSocket',class {constructor(){block();}});
  async function send(request,init={}) {
    if(policy.isStopped())return block();
    policy.assert(request);
    const url=new URL(request.url);
    // No redirects, proxy, custom dispatcher or implicit Request-object replay.
    const allowed=['method','headers','body','signal','duplex','redirect'];
    if(Object.keys(init).some(k=>!allowed.includes(k))||init.method!==request.method||
      !isDeepStrictEqual(init.body,request.wireBody))return block();
    return grant.run({host:url.hostname},async()=>{
      let response;
      try { response=await transport(request.url,{...init,redirect:'error',
        signal:init.signal?AbortSignal.any([init.signal,AbortSignal.timeout(30000)]):AbortSignal.timeout(30000)}); }
      catch { policy.stop();throw new Error('GUARD_TRANSPORT_FAILED'); }
      if(response.status>=300&&response.status<400)return block();
      if(response.status>=400){policy.stop();throw new Error('GUARD_HTTP_ERROR');}
      return response;
    });
  }
  const bridge=new AsyncLocalStorage();
  patch(globalThis,'fetch',async function(url,init={}) {
    const request=bridge.getStore();
    if(!request||url!==request.url||init.method!==request.method)return block();
    return send(request,init);
  });
  syncBuiltinESMExports();
  return Object.freeze({
    run(request,fn){policy.assert(request);return bridge.run(request,fn);},
    send,
    restore(){for(const [object,key,original] of originals.reverse())object[key]=original;syncBuiltinESMExports();}
  });
}
module.exports={installNetworkGuard};
