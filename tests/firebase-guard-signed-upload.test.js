import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {requestLocation}=require('../tools/firebase-guard/deployment-request-options.cjs');
const {requestFromClient}=require('../tools/firebase-guard/cli-bridge.cjs');
for(const query of ['GoogleAccessId=fixture@example.invalid&Signature=fake','Signature=a%2fb%20c~','Signature=a+b%2Bc','b=2&a=1&a=3','Signature=%7e%2f%3d'])test('signed upload preserves exact query '+query,()=>{
  const original='https://storage.googleapis.com/fixture/source.zip?'+query,u=new URL(original);
  const location=requestLocation(u,true);
  assert.equal(Object.hasOwn(location,'queryParams'),false);
  const request=requestFromClient({requestURL:o=>u.origin+o.path},{...location,method:'PUT'},{});
  assert.equal(request.url,original);
});
test('ordinary API requests keep existing query parameter construction',()=>{
  const u=new URL('https://cloudfunctions.googleapis.com/v2/fixture?functionId=createProfile');
  const options=requestLocation(u,false);
  assert.equal(options.path,u.pathname);assert.equal(options.queryParams,u.searchParams);
});
for(const change of ['encoding','extra-query'])test('signed upload still rejects '+change+' before transmission',async()=>{
  const {createSession,CONFIRMATION}=require('../tools/firebase-guard/deployment-session.cjs');
  const s=createSession({confirmation:CONFIRMATION,archiveHash:'a'.repeat(64),privateValues:{PROJECT_NUMBER:'123456789012',DEFAULT_RUNTIME:'123456789012-compute@developer.gserviceaccount.com',ADMIN_RUNTIME:'moderation-runtime@budae-kiugi-dev.iam.gserviceaccount.com',FIREBASE_CONFIG:'{"projectId":"budae-kiugi-dev"}'}});
  const uploadUrl='https://storage.googleapis.com/fixture/source.zip?GoogleAccessId=fixture@example.invalid&Signature=fake';
  await s.dispatch(s.next(),async()=>({status:200,body:{uploadUrl,storageSource:{bucket:'fixture',object:'source.zip'}}}));
  const request=s.next();request.url=change==='encoding'?uploadUrl.replace('@','%40'):uploadUrl+'&extra=fake';let sends=0;
  await assert.rejects(()=>s.dispatch(request,async()=>{sends++;}));assert.equal(sends,0);assert.equal(s.summary().stopped,true);
});
