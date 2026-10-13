'use strict';
const path=require('node:path');
const {createRequire}=require('node:module');
function multipartFields(form) {
  if(!form||typeof form.getBuffer!=='function'||typeof form.getBoundary!=='function')throw new Error('GUARD_AUTH_BODY');
  const buffer=form.getBuffer();
  if(buffer.length>65536)throw new Error('GUARD_AUTH_BODY');
  const boundary=form.getBoundary(),fields={};
  for(const part of buffer.toString('utf8').split('--'+boundary).slice(1,-1)) {
    const match=/^\r\nContent-Disposition: form-data; name="([a-z_]+)"\r\n\r\n([\s\S]*)\r\n$/.exec(part);
    if(!match||Object.hasOwn(fields,match[1]))throw new Error('GUARD_AUTH_BODY');
    fields[match[1]]=match[2];
  }
  return fields;
}
function requestFromClient(client,options,api) {
  if(options.compress===false||options.redirect&&options.redirect!=='error')throw new Error('GUARD_UNSUPPORTED_TRANSPORT');
  const requestOptions={...options,path:options.path.startsWith('/')?options.path:'/'+options.path};
  let url=client.requestURL(requestOptions);
  if(options.queryParams) {
    const query=new URLSearchParams(options.queryParams).toString();
    if(query)url+='?'+query;
  }
  const request={url,method:options.method,body:options.body};
  if(url==='https://www.googleapis.com/oauth2/v3/token'&&request.method==='POST') {
    request.body=multipartFields(options.body);
    request.authRefresh=request.body.client_id===api.clientId()&&request.body.client_secret===api.clientSecret();
  }
  if(options.body&&typeof options.body.pipe==='function')request.uploadStream=true;
  request.wireBody=options.body?.getBuffer ? Buffer.from(options.body.getBuffer()) :
    Buffer.isBuffer(options.body)?Buffer.from(options.body):
    options.body===undefined||typeof options.body==='string'||request.uploadStream?options.body:JSON.stringify(options.body);
  return request;
}
function installCliBridge(cliDir,policy,network,output) {
  const req=createRequire(path.join(cliDir,'package.json'));
  const lib=(file)=>req('./lib/'+file);
  const loggerModule=lib('logger');
  loggerModule.logger.clear();
  loggerModule.useFileLogger=()=>undefined;
  loggerModule.useConsoleLoggers=()=>undefined;
  for(const name of ['debug','info','verbose','silly'])loggerModule.logger[name]=()=>{};
  const warning=()=>{policy.stop();output.emit('warning-stopped');throw new Error('GUARD_WARNING');};
  loggerModule.logger.warn=warning;
  loggerModule.logger.error=()=>{policy.stop();throw new Error('GUARD_CLI_ERROR');};
  loggerModule.logger.log=(level)=>{if(['warn','error'].includes(typeof level==='object'?level?.level:level))warning();};
  // Keep token refresh/cache changes in memory during read-only inspection.
  const config=lib('configstore').configstore;
  let memory=structuredClone(config.all);
  Object.defineProperty(config,'all',{get:()=>structuredClone(memory),set:value=>{memory=structuredClone(value);}});
  const api=lib('api'),client=lib('apiv2').Client;
  const original=client.prototype.request;
  client.prototype.request=async function(options) {
    let request;
    try {request=requestFromClient(this,options,api);policy.assert(request);}
    catch {policy.stop();throw new Error('GUARD_REQUEST_DENIED');}
    // A warning/error/request denial is a stop condition, not an automatic retry.
    const guarded={...options,retries:0,retryCodes:[],redirect:'error'};
    try {
      const response=await network.run(request,()=>original.call(this,guarded));
      policy.observe(request,response);
      return response;
    } catch {policy.stop();throw new Error('GUARD_CLI_REQUEST_FAILED');}
  };
  return {lib,config};
}
module.exports={multipartFields,requestFromClient,installCliBridge};
