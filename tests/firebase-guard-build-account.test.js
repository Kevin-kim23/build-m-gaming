import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createPolicy}=require('../tools/firebase-guard/request-policy.cjs');
const url='https://cloudbuild.googleapis.com/v1/projects/budae-kiugi-dev/locations/asia-northeast3/defaultServiceAccount';
const name='projects/budae-kiugi-dev/locations/asia-northeast3/defaultServiceAccount';
const {summarizeBuildAccount,readBuildAccount}=require('../tools/firebase-guard/build-account-read.cjs');
const {createOutput}=require('../tools/firebase-guard/privacy.cjs');
test('build account exact GET succeeds once and replay sends nothing',async()=>{
  const policy=createPolicy({mode:'build-account'});let sent=0;
  await policy.dispatch({url,method:'GET'},async()=>{sent++;return {status:200,body:{name,serviceAccountEmail:''}};});
  await assert.rejects(()=>policy.dispatch({url,method:'GET'},async()=>{sent++;}));
  assert.equal(sent,1);
});
for(const [label,request] of [
  ['project',{url:url.replace('budae-kiugi-dev','budae-kiugi-prod'),method:'GET'}],
  ['region',{url:url.replace('asia-northeast3','global'),method:'GET'}],
  ['host',{url:url.replace('cloudbuild.googleapis.com','example.invalid'),method:'GET'}],
  ['query',{url:url+'?alt=json',method:'GET'}],
  ['slash',{url:url+'/',method:'GET'}],
  ['body',{url,method:'GET',body:{}}],
  ...['POST','PUT','PATCH','DELETE'].map(method=>[method,{url,method}]),
  ['other read',{url:'https://firebase.googleapis.com/v1beta1/projects?pageSize=100',method:'GET'}],
])test('build account denies '+label+' before transport',async()=>{
  let sent=0;
  await assert.rejects(async()=>createPolicy({mode:'build-account'}).dispatch(request,async()=>{sent++;}));
  assert.equal(sent,0);
});
test('build account unavailable in other modes',()=>{
  for(const mode of ['projects','inventory','deploy'])assert.throws(()=>createPolicy({mode}).assert({url,method:'GET'}));
});
test('build response permits only documented identity shapes and fixed categories',()=>{
  for(const [identity,kind] of [['','none'],['000000000000-compute@developer.gserviceaccount.com','compute'],['000000000000@cloudbuild.gserviceaccount.com','legacy-cloud-build']]) {
    assert.equal(summarizeBuildAccount({name,serviceAccountEmail:identity?'projects/budae-kiugi-dev/serviceAccounts/'+identity:''}),kind);
  }
  for(const body of [null,[],{name},{name:name.replace('asia-northeast3','global'),serviceAccountEmail:''},
    {name,serviceAccountEmail:'projects/other/serviceAccounts/000000000000@cloudbuild.gserviceaccount.com'},
    {name,serviceAccountEmail:'fixture@example.invalid'}, {name,serviceAccountEmail:'',token:'FIXTURE_TOKEN'}])assert.throws(()=>summarizeBuildAccount(body));
});
test('build account error and invalid response stop without a second send',async()=>{
  for(const result of [{status:403,body:{message:'FIXTURE_ERROR'}},{status:302,body:{}},{status:200,body:{name,serviceAccountEmail:'FIXTURE_TOKEN'}}]) {
    const p=createPolicy({mode:'build-account'});let sent=0;
    const send=async()=>{sent++;return result;};
    await assert.rejects(()=>p.dispatch({url,method:'GET'},send));
    await assert.rejects(()=>p.dispatch({url,method:'GET'},send));assert.equal(sent,1);
  }
});
test('build summary cannot emit raw fields, chunks, errors or identity',()=>{
  let text='';const out=createOutput(s=>text+=s);
  out.discard('FIXTURE_');out.discard('TOKEN fixture@example.invalid https://example.invalid');
  out.emit('build-account-ok',{kind:'compute',email:'fixture@example.invalid',body:'FIXTURE_RAW',error:'FIXTURE_ERROR'});
  assert.equal(text,'{"event":"build-account-ok","kind":"compute"}\n');
  assert.throws(()=>out.emit('build-account-ok',{kind:'fixture@example.invalid'}));
});
test('build reader uses exact path and does not retry errors',async()=>{
  let calls=0;const rows=[];
  const lib=()=>({Client:class {constructor(opts){assert.equal(opts.urlPrefix,'https://cloudbuild.googleapis.com');}async get(p,opts){calls++;assert.equal(p,'/v1/'+name);assert.equal(opts.skipLog.resBody,true);throw Error('FIXTURE_PRIVATE_ERROR');}}});
  await assert.rejects(()=>readBuildAccount(lib,{emit:(...args)=>rows.push(args)}));
  assert.equal(calls,1);assert.deepEqual(rows,[]);
});
