import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createPolicy}=require('../tools/firebase-guard/request-policy.cjs');
test('guard allows project list and blocks unknown requests before transmission',async()=>{
  const policy=createPolicy();
  let sent=0;
  await policy.dispatch({url:'https://firebase.googleapis.com/v1beta1/projects?pageSize=100',method:'GET'},async()=>{sent++;return {status:200,body:{results:[]}};});
  assert.equal(sent,1);
  await assert.rejects(()=>policy.dispatch({url:'https://firebase.googleapis.com/v1beta1/projects',method:'POST'},async()=>{sent++;}));
  assert.equal(sent,1);
  assert.equal(policy.isStopped(),true);
});
