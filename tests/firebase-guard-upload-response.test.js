import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createSession,CONFIRMATION}=require('../tools/firebase-guard/deployment-session.cjs');
const {createDiagnostics}=require('../tools/firebase-guard/diagnostics.cjs');
const {createOutput}=require('../tools/firebase-guard/privacy.cjs');
const values={PROJECT_NUMBER:'123456789012',DEFAULT_RUNTIME:'123456789012-compute@developer.gserviceaccount.com',ADMIN_RUNTIME:'moderation-runtime@budae-kiugi-dev.iam.gserviceaccount.com',FIREBASE_CONFIG:'{"projectId":"budae-kiugi-dev"}'};
const fixture=()=>({uploadUrl:'https://storage.googleapis.com/fixture/source.zip?Signature=fake',storageSource:{bucket:'fixture',object:'source.zip'}});
function session(){const events=[];return {events,s:createSession({privateValues:values,archiveHash:'a'.repeat(64),confirmation:CONFIRMATION,diagnostic:createDiagnostics(createOutput(t=>events.push(JSON.parse(t))))})};}
for(const generation of [undefined,'0','1','9223372036854775807'])test('upload accepts documented generation '+String(generation),async()=>{
  const {s}=session(),body=fixture();if(generation!==undefined)body.storageSource.generation=generation;
  await s.dispatch(s.next(),async()=>({status:200,body}));
  assert.equal(s.next().method,'PUT');assert.equal(s.summary().stopped,false);
  await s.dispatch(s.next(),async()=>({status:200,body:{}}));
  assert.deepEqual(s.next().body.buildConfig.source.storageSource,body.storageSource,'preserve omission and exact generation without inventing a value');
});
const badCases={
  'missing-bucket':b=>delete b.storageSource.bucket,
  'missing-object':b=>delete b.storageSource.object,
  'extra-field':b=>b.storageSource.unexpected='FAKE_SECRET',
  'null-source':b=>b.storageSource=null,
  'empty-bucket':b=>b.storageSource.bucket='',
  'numeric-object':b=>b.storageSource.object=12,
  'number-generation':b=>b.storageSource.generation=0,
  'null-generation':b=>b.storageSource.generation=null,
  'negative-generation':b=>b.storageSource.generation='-1',
  'overflow-generation':b=>b.storageSource.generation='9223372036854775808',
  'space-generation':b=>b.storageSource.generation=' 0',
  'empty-generation':b=>b.storageSource.generation='',
  'fraction-generation':b=>b.storageSource.generation='1.0',
  'exponent-generation':b=>b.storageSource.generation='1e2',
  'wrong-host':b=>b.uploadUrl='https://other.invalid/a?Signature=fake',
  'http':b=>b.uploadUrl='http://storage.googleapis.com/a?Signature=fake',
  'fragment':b=>b.uploadUrl+='#FAKE_SECRET',
  'malformed-url':b=>b.uploadUrl='FAKE_SECRET private@example.invalid',
};
for(const [name,change] of Object.entries(badCases))test('upload denies '+name+' before subsequent transfer',async()=>{
  const {s,events}=session(),body=fixture();change(body);let sends=0;
  await assert.rejects(()=>s.dispatch(s.next(),async()=>{sends++;return {status:200,body};}));
  assert.equal(sends,1);assert.throws(()=>s.next());
  assert.ok(events.some(e=>['upload-url','upload-source-fields','upload-source-format','upload-generation'].includes(e.check)));
  assert.doesNotMatch(JSON.stringify(events),/FAKE_SECRET|@|https?:|Signature/);
});
