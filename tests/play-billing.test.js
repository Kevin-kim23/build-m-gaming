import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPlayBilling,reconcilePlayAutoTap} from '../src/play-billing.js';
import {freshState,SAVE_KEY,SAVE_VERSION} from '../src/state.js';
import {parseSave} from '../src/save.js';
import {serializeSave,MAX_GOLD} from '../src/money.js';
const synced=owned=>({status:'synced',verified:true,owned});
function fixture(result=synced(true)){
  const session={state:freshState(1000),active:true,change(fn){return fn(this.state);}};
  let queries=0,purchases=0,next=result;
  const billing=createPlayBilling(session,{native:()=>true,bridge:{getProduct:async()=>({configured:true,status:'ready',price:'₩4,900'}),
    restore:async()=>{queries++;return next;},purchase:async()=>{purchases++;return next;}},onError:()=>{},delay:async()=>{}});
  return {session,billing,set:r=>{next=r;},queries:()=>queries,purchases:()=>purchases};
}
test('Play verified inventory grants once, restores and preserves toggle and large gold',async()=>{
  const f=fixture();f.session.state.gold=MAX_GOLD;await f.billing.prepare();
  assert.deepEqual(f.session.state.homeAutoTap,{owned:true,enabled:true,source:'play'});
  f.session.state.homeAutoTap.enabled=false;await f.billing.restore();
  assert.equal(f.session.state.homeAutoTap.enabled,false);assert.equal(f.session.state.gold,MAX_GOLD);
  assert.equal((await f.billing.buy()).ok,false);assert.equal(f.purchases(),0);
});
test('cancel/pending/error/unverified results never grant or revoke',async()=>{
  for(const result of [{status:'cancelled'},{status:'pending'},{status:'unavailable'},{status:'synced',owned:true},{status:'synced',verified:true,owned:'true'}]){
    const f=fixture(result);await f.billing.prepare();assert.equal(f.session.state.homeAutoTap.owned,false);
    f.session.state.homeAutoTap={owned:true,enabled:true,source:'play'};await f.billing.restore();assert.equal(f.session.state.homeAutoTap.owned,true);
  }
});
test('only successful empty inventory revokes Play ownership; tester records survive',async()=>{
  const f=fixture();await f.billing.prepare();f.set(synced(false));await f.billing.restore();assert.equal(f.session.state.homeAutoTap.owned,false);
  f.session.state.homeAutoTap={owned:true,enabled:false,source:'test'};await f.billing.restore();assert.equal(f.session.state.homeAutoTap.source,'test');assert.equal(f.session.state.homeAutoTap.owned,true);
});
test('purchase success, cancellation and pending are distinct and no double click launches twice',async()=>{
  const f=fixture(synced(false));await f.billing.prepare();f.set({status:'cancelled'});assert.equal((await f.billing.buy()).reason,'cancelled');
  f.set(synced(false));assert.equal((await f.billing.buy()).ok,false);assert.equal(f.session.state.homeAutoTap.owned,false);
  f.set({status:'pending'});assert.equal((await f.billing.buy()).reason,'pending');assert.equal(f.session.state.homeAutoTap.owned,false);
  f.set(synced(true));const p=f.billing.buy();assert.equal((await f.billing.buy()).ok,false);await p;assert.equal(f.session.state.homeAutoTap.owned,true);
});
test('inactive session does not mutate progress; restore after resume reconciles purchase',async()=>{
  const f=fixture();f.session.active=false;assert.equal((await f.billing.prepare()).reason,'resume-required');assert.equal(f.session.state.homeAutoTap.owned,false);
  f.session.active=true;await f.billing.restore();assert.equal(f.session.state.homeAutoTap.owned,true);
});
test('native errors are redacted, browser and unconfigured builds cannot call purchase',async()=>{
  const errors=[];const f=fixture();const b=createPlayBilling(f.session,{native:()=>true,bridge:{getProduct:async()=>{throw Error('synthetic-secret');}},onError:(scope,e)=>errors.push(e.message)});
  await b.prepare();assert.deepEqual(errors,['Play billing unavailable']);
  let calls=0;const disabled=createPlayBilling(f.session,{native:()=>false,bridge:{getProduct:()=>{calls++;}}});await disabled.prepare();await disabled.buy();assert.equal(calls,0);
});
test('save41 roundtrip Play entitlement, migration40 preserves tester ownership and big money',()=>{
  assert.equal(SAVE_VERSION,freshState(1000).version);assert.equal(SAVE_KEY,'budae-kiugi-recruits-v3');
  const old=freshState(1000);old.version=40;old.gold=MAX_GOLD;old.homeAutoTap={owned:true,enabled:false,source:'test'};
  const migrated=parseSave(serializeSave(old),1000);assert.equal(migrated.version,freshState(1000).version);assert.deepEqual(migrated.homeAutoTap,old.homeAutoTap);assert.equal(migrated.gold,MAX_GOLD);
  old.homeAutoTap.source='play';assert.equal(parseSave(serializeSave(old),1000),null);
  const current=freshState(1000);reconcilePlayAutoTap(current,true);assert.equal(parseSave(serializeSave(current),1000).homeAutoTap.source,'play');
});
test('normal/release build keeps SDK out; no backend or consume API in permanent purchase plugin',()=>{
  const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
  const gradle=read('android/app/build.gradle');assert.match(gradle,/if \(playBillingTest\) \{[\s\S]*debugImplementation 'com.android.billingclient:billing:8.3.0'/);
  const native=read('android/app/src/playBilling/java/com/dongramco/budaekiugi/PlayBillingPlugin.java');
  assert.match(native,/return BuildConfig.PLAY_BILLING_ENABLED/);assert.doesNotMatch(native,/consumeAsync|https?:\/\//);
  assert.match(gradle,/if \(playBillingRelease\)/);assert.match(gradle,/Missing local billing setting/);
  assert.match(native,/PlayPurchaseVerifier.verify/);assert.match(native,/PurchaseState.PENDING/);
});
