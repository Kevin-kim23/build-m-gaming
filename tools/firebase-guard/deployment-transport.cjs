'use strict';
const {isDeepStrictEqual:equal}=require('node:util');
const {Readable}=require('node:stream');
const {createHash}=require('node:crypto');
const {createPolicy}=require('./request-policy.cjs');
const {installNetworkGuard}=require('./network-guard.cjs');
const {installCliBridge}=require('./cli-bridge.cjs');
const {installFileGuard}=require('./file-guard.cjs');
// Only constructed by the CLI entry after human confirmation. No raw errors out.
function createDeploymentTransport(cliDir,archive,archiveHash,output,{fakeTransport}={}) {
  if(!Buffer.isBuffer(archive)||createHash('sha256').update(archive).digest('hex')!==archiveHash)throw Error('ARCHIVE_CHANGED');
  let current,used=false,stopped=false,refreshUsed=false;
  const refresh=createPolicy({mode:'projects'});
  const normalized=r=>({method:r.method,url:r.url,...(r.body!==undefined?{body:r.uploadStream?{$archive:true}:r.body}:{})});
  const stop=()=>{stopped=true;};
  const assert=r=>{
    if(stopped||!current)throw Error('DEPLOY_REQUEST_DENIED');
    if(r.authRefresh===true) {
      if(refresh.assert(r)!=='token-refresh')throw Error('DEPLOY_REQUEST_DENIED');
      return 'refresh';
    }
    if(!equal(normalized(r),current))throw Error('DEPLOY_REQUEST_DENIED');
    return 'main';
  };
  const policy={assert,stop,isStopped:()=>stopped,
    begin(r){if(assert(r)==='refresh'){if(refreshUsed)throw Error('DEPLOY_DUPLICATE');refreshUsed=true;return;}if(used)throw Error('DEPLOY_DUPLICATE');used=true;},
    observe(r,response){assert(r);if(response.status>=300&&!(response.status===404&&isAbsentJob(r)))stop();}};
  const isAbsentJob=r=>r.method==='GET'&&r.url.startsWith('https://cloudscheduler.googleapis.com/v1/projects/budae-kiugi-dev/locations/asia-northeast3/jobs/firebase-schedule-')&&equal(normalized(r),current);
  installFileGuard(stop);
  const network=installNetworkGuard({policy,allowExpectedNotFound:isAbsentJob,...(fakeTransport?{transport:fakeTransport}:{})});
  const {lib}=installCliBridge(cliDir,policy,network,output);
  const auth=lib('auth'),account=auth.getGlobalDefaultAccount();
  if(!account?.user||!account.tokens||(!account.tokens.access_token&&!account.tokens.refresh_token))throw Error('LOGIN_REQUIRED');
  auth.setActiveAccount({},account);
  return async request=>{
    if(current||stopped)throw Error('DEPLOYMENT_STOPPED');
    current=structuredClone(request);used=false;refreshUsed=false;
    try {
      const url=new URL(request.url),upload=request.body?.$archive===true;
      const client=new (lib('apiv2').Client)({urlPrefix:url.origin,auth:!upload});
      return await client.request({method:request.method,path:url.pathname,queryParams:url.searchParams,
        ...(request.body!==undefined?{body:upload?Readable.from(archive):request.body}:{}),
        ...(upload?{headers:{'content-type':'application/zip'},responseType:'xml',ignoreQuotaProject:true}:{resolveOnHTTPError:true}),
        retries:0,retryCodes:[],redirect:'error'});
    } catch {stop();throw Error('DEPLOYMENT_STOPPED');}
    finally {current=undefined;}
  };
}
module.exports={createDeploymentTransport};
