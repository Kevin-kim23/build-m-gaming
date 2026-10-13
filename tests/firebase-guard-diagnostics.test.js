import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createOutput}=require('../tools/firebase-guard/privacy.cjs');
const {createPolicy}=require('../tools/firebase-guard/request-policy.cjs');
const {installNetworkGuard}=require('../tools/firebase-guard/network-guard.cjs');
function fixture() {
  const events=[];
  const {createDiagnostics}=require('../tools/firebase-guard/diagnostics.cjs');
  const diagnostic=createDiagnostics(createOutput(text=>events.push(JSON.parse(text))));
  return {events,diagnostic};
}
const url='https://run.googleapis.com/v1/projects/budae-kiugi-dev/locations?pageSize=100';
test('diagnostic: request denied before transport has no source text',async()=>{
  const {events,diagnostic}=fixture();let sent=0;
  const policy=createPolicy({mode:'inventory',diagnostic});
  await assert.rejects(()=>policy.dispatch({method:'POST',url},async()=>{sent++;}));
  assert.equal(sent,0);
  assert.deepEqual(events,[{event:'guard-diagnostic',category:'guard-blocked',beforeTransport:true,check:'request-policy'}]);
});
for(const [code,kind] of [['ENOTFOUND','dns'],['ECONNRESET','connection'],['UND_ERR_CONNECT_TIMEOUT','timeout'],['FAKE_SECRET','other']])
test('diagnostic: no response maps '+kind+' without raw error',async()=>{
  const {events,diagnostic}=fixture();let sent=0;
  const policy=createPolicy({mode:'inventory',diagnostic});
  const network=installNetworkGuard({policy,diagnostic,transport:async()=>{sent++;throw Object.assign(new Error('FAKE_PRIVATE_BODY'),{cause:{code}});}});
  try{await assert.rejects(()=>network.send({method:'GET',url},{method:'GET'}));}finally{network.restore();}
  assert.equal(sent,1);
  assert.deepEqual(events,[{event:'guard-diagnostic',category:'transport-failed',transport:kind}]);
});
for(const status of [200,302,403,500])test('diagnostic: HTTP '+status+' emits number only',async()=>{
  const {events,diagnostic}=fixture();
  const policy=createPolicy({mode:'inventory',diagnostic});
  const network=installNetworkGuard({policy,diagnostic,transport:async()=>({status,body:'FAKE_SECRET'})});
  try{
    if(status===200)await network.send({method:'GET',url},{method:'GET'});
    else await assert.rejects(()=>network.send({method:'GET',url},{method:'GET'}));
  }finally{network.restore();}
  assert.ok(events.some(e=>e.category==='http-response'&&e.status===status));
  assert.doesNotMatch(JSON.stringify(events),/FAKE|https|body/);
});
test('diagnostic: valid HTTP response rejected by named local check',async()=>{
  const {events,diagnostic}=fixture(),policy=createPolicy({mode:'inventory',diagnostic});
  await assert.rejects(()=>policy.dispatch({method:'GET',url},async()=>({status:200,body:{locations:[
    {name:'FAKE_PRIVATE',locationId:'asia-northeast3'}
  ]}})));
  assert.deepEqual(events,[{event:'guard-diagnostic',category:'validation-failed',check:'region-identity'}]);
});
test('diagnostic: unknown labels cannot become output and raw output is discarded',()=>{
  const {events,diagnostic}=fixture();
  diagnostic.validation('FAKE_SECRET_EMAIL_TOKEN');
  assert.deepEqual(events,[{event:'guard-diagnostic',category:'validation-failed',check:'unknown-check'}]);
  const output=createOutput(()=>assert.fail());
  output.discard('FAKE_RAW_RESPONSE');
  assert.throws(()=>output.emit('guard-diagnostic',{category:'FAKE_RAW_RESPONSE'}));
});
test('diagnostic: HTTP 200 followed by rejection preserves both facts',async()=>{
  const {events,diagnostic}=fixture(),policy=createPolicy({mode:'inventory',diagnostic});
  const request={method:'GET',url};
  const network=installNetworkGuard({policy,diagnostic,transport:async()=>({status:200})});
  try {
    await network.send(request,{method:'GET'});
    assert.throws(()=>policy.observe(request,{status:200,body:{locations:[]}}));
  } finally {network.restore();}
  assert.deepEqual(events,[
    {event:'guard-diagnostic',category:'http-response',status:200},
    {event:'guard-diagnostic',category:'validation-failed',check:'region-count'}
  ]);
});
test('diagnostic: unclassified local failure does not invent HTTP or guard rejection',()=>{
  const first=fixture();first.diagnostic.fallback();
  assert.deepEqual(first.events,[{event:'guard-diagnostic',category:'unclassified',beforeTransport:true,responseReceived:false}]);
  const second=fixture();second.diagnostic.attempted();second.diagnostic.http(200);second.diagnostic.fallback();
  assert.deepEqual(second.events.at(-1),{event:'guard-diagnostic',category:'unclassified',beforeTransport:false,responseReceived:true});
});
test('diagnostic: forbidden details cannot escape through a valid event',()=>{
  let text='';
  createOutput(value=>text+=value).emit('guard-diagnostic',{category:'http-response',status:403,
    body:'FAKE_BODY',url:'FAKE_ADDRESS',token:'FAKE_TOKEN',email:'FAKE_EMAIL'});
  assert.deepEqual(JSON.parse(text),{event:'guard-diagnostic',category:'http-response',status:403});
  assert.doesNotMatch(text,/FAKE/);
});
