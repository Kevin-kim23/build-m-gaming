import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {runPrepared}=require('../tools/firebase-guard/deployment-runner.cjs');
const {CONFIRMATION}=require('../tools/firebase-guard/deployment-session.cjs');
const {createDiagnostics}=require('../tools/firebase-guard/diagnostics.cjs');
const {createOutput}=require('../tools/firebase-guard/privacy.cjs');
const privateValues={PROJECT_NUMBER:'123456789012',DEFAULT_RUNTIME:'123456789012-compute@developer.gserviceaccount.com',ADMIN_RUNTIME:'moderation-runtime@budae-kiugi-dev.iam.gserviceaccount.com',FIREBASE_CONFIG:'{"projectId":"budae-kiugi-dev"}'};
test('deployment rejects malformed upload response with safe diagnosis and no next send',async()=>{
  const events=[];let sends=0;
  const diagnostic=createDiagnostics(createOutput(s=>events.push(JSON.parse(s))));
  const result=await runPrepared({privateValues,archiveHash:'a'.repeat(64),confirmation:CONFIRMATION,diagnostic,send:async()=>{sends++;return {status:200,body:{uploadUrl:'FAKE_SECRET private@example.invalid'}};}});
  assert.equal(result.stopped,true);assert.equal(sends,1);
  assert.ok(events.some(e=>e.check==='upload-url'));
  assert.doesNotMatch(JSON.stringify(events),/FAKE_SECRET|@|https:/);
});
test('deployment missing confirmation retains zero transmissions with diagnosis enabled',async()=>{
  let sends=0;const events=[];
  const result=await runPrepared({privateValues,archiveHash:'a'.repeat(64),confirmation:'',diagnostic:createDiagnostics(createOutput(s=>events.push(JSON.parse(s)))),send:async()=>{sends++;}});
  assert.equal(result.stopped,true);assert.equal(sends,0);
});
