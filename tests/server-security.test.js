import test from 'node:test';
import assert from 'node:assert/strict';
import {createRateLimiter,createRequestGuard} from '../server/request-security.js';
function fixture(){const records=new Map();let pending=Promise.resolve(),clock=1000;
  const transact=op=>{const next=pending.then(async()=>{const draft=new Map(records);const result=await op({get:async p=>draft.get(p),set:(p,v)=>draft.set(p,v)});records.clear();for(const [p,v]of draft)records.set(p,v);return result;});pending=next.catch(()=>{});return next;};
  return {records,limit:createRateLimiter({transact,now:()=>clock}),advance:ms=>{clock+=ms;}};
}
test('UID limits share a sliding minute across devices while reads and writes remain separate',async()=>{
  const f=fixture();
  const results=await Promise.allSettled(Array.from({length:32},()=>f.limit('test-a','read')));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,30);
  assert.equal(results.filter(r=>r.reason?.code==='rate-limit').length,2);
  for(let i=0;i<10;i++)await f.limit('test-a','write');
  await assert.rejects(f.limit('test-a','write'),{code:'rate-limit'});
  await f.limit('test-b','write');
  f.advance(59_999);await assert.rejects(f.limit('test-a','write'),{code:'rate-limit'});
  f.advance(1);await f.limit('test-a','write');
  assert.equal(f.records.get('rateLimits/test-a').write.length,1);
});
test('fixed-minute boundaries do not permit two full bursts',async()=>{
  const f=fixture();f.advance(58_999);
  for(let i=0;i<10;i++)await f.limit('test-a','write');
  f.advance(2);await assert.rejects(f.limit('test-a','write'),{code:'rate-limit'});
});
const request=(patch={})=>({auth:{uid:'test-a',token:{auth_time:100}},app:{appId:'allowed-app'},...patch});
test('guard rejects spoofed, absent and foreign app attestations before consuming DB quota',async()=>{
  let reads=0;
  const guard=createRequestGuard({appIds:['allowed-app'],getUser:async()=>{reads++;return {};},limit:async()=>{}});
  await assert.rejects(guard(request({app:undefined,data:{appId:'allowed-app'}}),'read'),{code:'app-check-required'});
  await assert.rejects(guard(request({app:{appId:'foreign-app'}}),'read'),{code:'app-check-required'});
  await assert.rejects(guard(request({auth:undefined}),'read'),{code:'unauthenticated'});
  assert.equal(reads,0);
  assert.equal(await guard(request(),'read'),'test-a');
});
test('deleted, disabled and revoked users cannot regain access after deletion marker cleanup',async()=>{
  for(const [getUser,code]of [
    [async()=>{throw {code:'auth/user-not-found'};},'account-unavailable'],
    [async()=>({disabled:true}),'account-unavailable'],
    [async()=>({tokensValidAfterTime:new Date(101_000).toISOString()}),'recent-login-required'],
    [async()=>{throw Error('transport');},'security-unavailable'],
  ]) {
    const guard=createRequestGuard({appIds:['allowed-app'],getUser,limit:async()=>assert.fail('must not consume quota')});
    await assert.rejects(guard(request(),'write'),{code});
  }
});
test('emulator exemption is explicit and still requires a real emulator Auth user and limits',async()=>{
  let limited=0;
  const guard=createRequestGuard({appIds:[],emulator:true,getUser:async()=>({}),limit:async()=>{limited++;}});
  await guard(request({app:undefined}),'read');assert.equal(limited,1);
  await assert.rejects(guard(request({auth:undefined}),'read'),{code:'unauthenticated'});
});
