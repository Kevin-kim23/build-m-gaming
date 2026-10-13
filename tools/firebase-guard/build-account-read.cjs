'use strict';
const {PROJECT,REGION}=require('./constants.cjs');
const NAME='projects/'+PROJECT+'/locations/'+REGION+'/defaultServiceAccount';
const URL='https://cloudbuild.googleapis.com/v1/'+NAME;
function summarizeBuildAccount(body) {
  const fail=()=>{throw Error('GUARD_BUILD_ACCOUNT_RESPONSE');};
  if(!body||typeof body!=='object'||Array.isArray(body)||body.name!==NAME||
    Object.keys(body).some(k=>!['name','serviceAccountEmail'].includes(k))||
    typeof body.serviceAccountEmail!=='string')return fail();
  if(body.serviceAccountEmail==='')return 'none';
  // The API returns a resource name, despite calling this field an email.
  const prefix='projects/'+PROJECT+'/serviceAccounts/';
  if(!body.serviceAccountEmail.startsWith(prefix))return fail();
  const identity=body.serviceAccountEmail.slice(prefix.length);
  if(/^\d{6,20}-compute@developer\.gserviceaccount\.com$/.test(identity))return 'compute';
  if(/^\d{6,20}@cloudbuild\.gserviceaccount\.com$/.test(identity))return 'legacy-cloud-build';
  return fail();
}
async function readBuildAccount(lib,output) {
  const {Client}=lib('apiv2');
  const client=new Client({urlPrefix:'https://cloudbuild.googleapis.com'});
  const result=await client.get('/v1/'+NAME,{skipLog:{reqBody:true,resBody:true}});
  output.emit('build-account-ok',{kind:summarizeBuildAccount(result.body)});
}
module.exports={NAME,URL,summarizeBuildAccount,readBuildAccount};
