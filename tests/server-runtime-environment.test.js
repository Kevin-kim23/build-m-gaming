import test from 'node:test';
import assert from 'node:assert/strict';
import {isLocalEmulator} from '../server/runtime-environment.js';

const local={FUNCTIONS_EMULATOR:'true',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080'};
const unsafe={message:'unsafe-server-environment',code:'unsafe-server-environment'};

test('only the exact demo project with both loopback service endpoints can bypass attestation',()=>{
  assert.equal(isLocalEmulator({projectId:'demo-budae-kiugi',env:local}),true);
  assert.equal(isLocalEmulator({projectId:'demo-budae-kiugi',env:{...local,
    FIREBASE_DEBUG_MODE:'true',FIREBASE_DEBUG_FEATURES:'{"skipTokenVerification":true}'}}),true);
  for(const projectId of ['budae-kiugi-prod','budae-kiugi-dev','demo-other',undefined]){
    assert.throws(()=>isLocalEmulator({projectId,env:local}),unsafe);
  }
});

test('missing emulator services, wrong endpoints and alternate hosts fail closed',()=>{
  for(const [key,value]of [
    ['FUNCTIONS_EMULATOR',undefined],['FUNCTIONS_EMULATOR','false'],
    ['FIREBASE_AUTH_EMULATOR_HOST',undefined],['FIREBASE_AUTH_EMULATOR_HOST','localhost:9099'],
    ['FIREBASE_AUTH_EMULATOR_HOST','127.0.0.1:9098'],['FIREBASE_AUTH_EMULATOR_HOST','remote.invalid:9099'],
    ['FIRESTORE_EMULATOR_HOST',undefined],['FIRESTORE_EMULATOR_HOST','127.0.0.1:8081'],
  ]){
    assert.throws(()=>isLocalEmulator({projectId:'demo-budae-kiugi',env:{...local,[key]:value}}),unsafe);
  }
  assert.throws(()=>isLocalEmulator({projectId:'demo-budae-kiugi',env:{}}),unsafe);
});

test('real projects reject Firebase SDK debug flags and any partial emulator configuration',()=>{
  for(const projectId of ['budae-kiugi-prod','budae-kiugi-dev']){
    assert.equal(isLocalEmulator({projectId,env:{}}),false);
    for(const env of [
      {FIREBASE_DEBUG_MODE:'true'},{FIREBASE_DEBUG_MODE:'false'},
      {FIREBASE_DEBUG_FEATURES:'{"skipTokenVerification":true}'},
      {FIREBASE_DEBUG_FEATURES:'{}'}, {FIREBASE_DEBUG_FEATURES:''},
      {FUNCTIONS_EMULATOR:'true'},{FUNCTIONS_EMULATOR:'false'},
      {FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099'},
      {FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080'},
    ])assert.throws(()=>isLocalEmulator({projectId,env}),unsafe);
  }
});

test('configuration failures expose no raw environment values',()=>{
  assert.throws(()=>isLocalEmulator({projectId:'budae-kiugi-prod',env:{FIREBASE_DEBUG_FEATURES:'private-synthetic-value'}}),error=>{
    assert.equal(error.message,unsafe.message);assert.equal(error.code,unsafe.code);
    assert.doesNotMatch(error.stack,/private-synthetic-value/);assert.equal(error.cause,undefined);return true;
  });
});
