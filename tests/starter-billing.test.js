import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayBilling} from '../src/play-billing.js';
import {freshState} from '../src/state.js';
import {STARTER_PACK} from '../src/starter-pack.js';
import {POTION_COUNT_LIMIT} from '../src/potions.js';
import {parseSave} from '../src/save.js';
import {serializeSave,MAX_GOLD} from '../src/money.js';
const synced=(owned,delivered=false)=>({status:'synced',verified:true,owned,delivered});
function fixture(){
  let result=synced(false),saved=true,acks=0,bought=0;const order=[];
  const session={state:freshState(1000),active:true,change(fn){order.push('grant');return fn(this.state);},flush(){order.push('save');return saved;}};
  const billing=createPlayBilling(session,{product:'starter',native:()=>true,bridge:{
    getProduct:async({product})=>{assert.equal(product,'starter');return {configured:true,status:'ready',price:'₩5,900'};},
    restore:async()=>result,purchase:async({product})=>{assert.equal(product,'starter');bought++;return result;},
    completeDelivery:async()=>{order.push('ack');acks++;return synced(true,true);}}});
  return {session,billing,order,set:r=>result=r,save:v=>saved=v,acks:()=>acks,bought:()=>bought};
}
test('starter purchase saves all rewards before acknowledgement; repeat restore cannot duplicate',async()=>{
  const f=fixture();f.session.state.gold=MAX_GOLD;await f.billing.prepare();f.set(synced(true));
  assert.equal((await f.billing.buy()).ok,true);assert.deepEqual(f.order,['grant','save','ack']);
  for(const id of ['red','blue','max'])assert.equal(f.session.state.potions[id].count,STARTER_PACK[id]);
  f.session.state.potions.red.count--;await f.billing.restore();assert.equal(f.session.state.potions.red.count,STARTER_PACK.red-1);
  assert.equal((await f.billing.buy()).ok,false);assert.equal(f.bought(),1);assert.equal(f.session.state.gold,MAX_GOLD);
});
test('starter cancellation/pending/bad response and inventory limit never grant or acknowledge',async()=>{
  for(const r of [{status:'cancelled'},{status:'pending'},{status:'synced',owned:true}]){
    const f=fixture();await f.billing.prepare();f.set(r);assert.equal((await f.billing.buy()).ok,false);assert.equal(f.acks(),0);assert.equal(f.session.state.starterPack.claimed,false);
  }
  const f=fixture();await f.billing.prepare();f.session.state.potions.red.count=POTION_COUNT_LIMIT;f.set(synced(true));
  assert.equal((await f.billing.buy()).reason,'limit');assert.equal(f.bought(),0);assert.equal((await f.billing.restore()).reason,'limit');assert.equal(f.acks(),0);
});
test('failed save withholds acknowledgement and retry saves without granting twice',async()=>{
  const f=fixture();await f.billing.prepare();f.set(synced(true));f.save(false);
  assert.equal((await f.billing.buy()).reason,'save-failed');assert.equal(f.acks(),0);
  f.save(true);await f.billing.restore();assert.equal(f.acks(),1);assert.equal(f.session.state.potions.red.count,30);
});
test('device delivery marker blocks regrant after local progress reset; absent purchase does not remove spent rewards',async()=>{
  const f=fixture();await f.billing.prepare();f.set(synced(true,true));assert.equal((await f.billing.restore()).reason,'recovery-required');assert.equal(f.acks(),0);
  f.set(synced(true));await f.billing.restore();f.session.state.potions.red.count=2;f.set(synced(false));await f.billing.restore();assert.equal(f.session.state.potions.red.count,2);assert.equal(f.session.state.starterPack.claimed,true);
});
test('save42 accepts Play starter; save41 test grants migrate and invalid older Play marker rejected',()=>{
  const s=freshState(1000);s.starterPack={claimed:true,source:'play'};
  assert.equal(parseSave(serializeSave(s),1000).starterPack.source,'play');
  s.version=41;assert.equal(parseSave(serializeSave(s),1000),null);s.starterPack.source='test';s.gold=MAX_GOLD;
  const restored=parseSave(serializeSave(s),1000);assert.equal(restored.version,42);assert.equal(restored.gold,MAX_GOLD);assert.equal(restored.starterPack.source,'test');
});
test('shared lock blocks another product while purchase is in flight',async()=>{
  const lock={busy:true};let calls=0;const s={state:freshState(1000),active:true};
  const b=createPlayBilling(s,{product:'starter',lock,native:()=>true,bridge:{getProduct:()=>calls++}});
  assert.equal((await b.prepare()).ok,false);assert.equal(calls,0);
});
