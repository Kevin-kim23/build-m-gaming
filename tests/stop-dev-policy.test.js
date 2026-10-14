import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createStopPolicy,ROOT,MASK}=require('../tools/firebase-guard/stop-dev-policy.cjs');
const {installNetworkGuard}=require('../tools/firebase-guard/network-guard.cjs');
const patch=()=>({url:ROOT+'createprofile?updateMask='+MASK,method:'PATCH',body:{name:'projects/budae-kiugi-dev/locations/asia-northeast3/services/createprofile',etag:'synthetic',scaling:{scalingMode:'MANUAL',manualInstanceCount:0}}});
test('shutdown policy accepts exact stop and rejects duplicate transmission',()=>{
  const p=createStopPolicy('123'),r=patch();p.allow(r);p.assert(r);p.begin(r);assert.throws(()=>p.allow(r));
});
test('shutdown policy denies unapproved host/project/region/mask/body/method before transport',async()=>{
  const mutations=[r=>r.url=r.url.replace('budae-kiugi-dev','budae-kiugi-prod'),r=>r.url=r.url.replace('asia-northeast3','us-central1'),r=>r.url=r.url.replace('run.googleapis.com','example.invalid'),r=>r.url=r.url.replace('createprofile','other'),r=>r.url+='&filter=x',r=>r.method='DELETE',r=>r.body.scaling.manualInstanceCount=1,r=>r.body.template={},r=>r.body.name=r.body.name.replace('createprofile','readprofile')];
  for(const mutate of mutations){let sends=0;const p=createStopPolicy('123'),r=patch();mutate(r);const guard=installNetworkGuard({policy:p,transport:async()=>{sends++;return {status:200}}});try{await assert.rejects(async()=>{p.allow(r);await guard.send({...r,wireBody:JSON.stringify(r.body)},{method:r.method,body:JSON.stringify(r.body)})});assert.equal(sends,0);}finally{guard.restore();}}
});
test('shutdown valid request reaches fake transport once and redirects stop it',async()=>{
  const p=createStopPolicy('123'),r=patch();let sends=0;const guard=installNetworkGuard({policy:p,transport:async()=>{sends++;return {status:302}}});
  try{p.allow(r);await assert.rejects(guard.send({...r,wireBody:JSON.stringify(r.body)},{method:r.method,body:JSON.stringify(r.body)}));assert.equal(sends,1);assert.equal(p.isStopped(),true);}finally{guard.restore();}
});
test('shutdown reads require an explicit one-use permit',()=>{const p=createStopPolicy('123'),r={method:'GET',url:ROOT+'createprofile',body:undefined};p.allow(r);p.assert(r);p.begin(r);assert.throws(()=>p.assert(r));});
test('shutdown allows successful fake transport and only returned operation polling',async()=>{
  const p=createStopPolicy('123'),r=patch();let sends=0;
  const guard=installNetworkGuard({policy:p,transport:async()=>{sends++;return {status:200}}});
  try{p.allow(r);await guard.send({...r,wireBody:JSON.stringify(r.body)},{method:r.method,body:JSON.stringify(r.body)});assert.equal(sends,1);}finally{guard.restore();}
  p.observe(r,{body:{name:'projects/123/locations/asia-northeast3/operations/fake-operation'}});
  const poll={url:'https://run.googleapis.com/v2/projects/123/locations/asia-northeast3/operations/fake-operation',method:'GET'};
  p.allow(poll);p.begin(poll);
  assert.throws(()=>p.allow({...poll,url:poll.url+'-other'}));
});
