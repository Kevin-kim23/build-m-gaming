import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, SAVE_KEY, SAVE_VERSION } from '../src/state.js';
import { accrue, perSecond, activateAutoTouch } from '../src/game.js';
import { MAX_GOLD, exact, serializeSave } from '../src/money.js';
import { parseSave } from '../src/save.js';
import { prepareOfflineReward, claimOfflineReward } from '../src/offline-reward.js';
import { MAX_OFFLINE_MS, OFFLINE_POPUP_MS } from '../src/offline-rules.js';
import { createGameSession } from '../src/session.js';
import { createOfflineRewardController } from '../src/offline-reward-controller.js';
import { createOfflineRewardAd } from '../src/rewarded-ads.js';

const T=1800000000000,HOUR=3600000;
function fixture(initial={...freshState(T),soldiers:3},time=T+HOUR,locks) {
  let clock=time;
  const data=new Map([[SAVE_KEY,serializeSave(initial)]]),errors=[];
  const storage={fail:false,getItem:key=>data.get(key)??null,setItem(key,value){if(this.fail)throw Error('quota');data.set(key,value);}};
  const make=()=>createGameSession({storage,locks,now:()=>clock,setTimer:()=>1,clearTimer:()=>{},onError:(area)=>errors.push(area)});
  return {data,storage,errors,make,setTime:value=>{clock=value;}};
}
test('one-hour boundary creates a pending reward; shorter gaps still pay automatically',()=>{
  assert.equal(OFFLINE_POPUP_MS,HOUR);assert.equal(MAX_OFFLINE_MS,HOUR*8);
  for(const gap of [HOUR-1,HOUR,HOUR+1]) {
    const f=fixture(undefined,T+gap),s=f.make();s.start();
    if(gap<HOUR){assert.equal(s.state.offlineReward,null);assert.equal(s.state.gold,10799);}
    else {assert.equal(s.state.gold,0);assert.equal(s.state.offlineReward.amount,Math.floor(3*gap/1000));}
    s.pause();
  }
});
test('offline cap discards excess time and pending/claimed rewards survive restart exactly once',()=>{
  const f=fixture(undefined,T+24*HOUR),s=f.make();s.start();
  assert.equal(s.state.offlineReward.amount,86400);assert.equal(s.state.offlineReward.durationMs,8*HOUR);
  assert.equal(s.state.lastAccrual,T+24*HOUR);s.pause();
  const restored=f.make();restored.start();const id=restored.state.offlineReward.id;
  assert.equal(restored.claimOffline(id).amount,86400);
  assert.equal(restored.claimOffline(id).ok,false);restored.pause();
  const again=f.make();again.start();assert.equal(again.state.gold,86400);assert.equal(again.state.offlineReward,null);again.pause();
});
test('unclaimed rewards merge only up to eight hours, even across repeated short returns',()=>{
  const f=fixture(undefined,T+7*HOUR),s=f.make();s.start();s.pause();
  f.setTime(T+7.5*HOUR);s.start();assert.equal(s.state.offlineReward.durationMs,7.5*HOUR);s.pause();
  f.setTime(T+30*HOUR);s.start();assert.equal(s.state.offlineReward.amount,86400);assert.equal(s.state.offlineReward.durationMs,8*HOUR);
  const id=s.state.offlineReward.id;s.claimOffline(id);s.tick();assert.equal(s.state.gold,86400);s.pause();
});
test('active play never opens an offline reward and zero-income new players get no empty popup',()=>{
  const f=fixture(undefined,T),s=f.make();s.start();f.setTime(T+HOUR);s.tick();
  assert.equal(s.state.offlineReward,null);assert.equal(s.state.gold,10800);s.pause();
  const empty=fixture(freshState(T));const newbie=empty.make();newbie.start();assert.equal(newbie.state.offlineReward,null);newbie.pause();
});
test('clock rollback cannot regenerate pending or already claimed gold',()=>{
  const s={...freshState(T),soldiers:3};prepareOfflineReward(s,T+HOUR);const pending=structuredClone(s);
  assert.equal(prepareOfflineReward(s,T),false);assert.deepEqual(s,pending);
  claimOfflineReward(s,s.offlineReward.id);assert.equal(prepareOfflineReward(s,T+HOUR),false);assert.equal(s.gold,10800);
});
test('offline settlement reuses equipment/bonus/automatic-touch calculations',()=>{
  const s={...freshState(T),soldiers:200000,sergeants:300,campaignCleared:20,personalLevels:{...freshState(T).personalLevels,marshalGlaive:5}};
  s.equipment.tank={level:20,count:1,deployed:true};activateAutoTouch(s,T);
  const direct=structuredClone(s);accrue(direct,T+HOUR);
  prepareOfflineReward(s,T+HOUR);assert.equal(s.gold,0);assert.equal(s.offlineReward.amount,direct.gold);
  assert.equal(s.autoTouchTicks,direct.autoTouchTicks);assert.equal(s.incomeRemainder,direct.incomeRemainder);
});
test('large rewards serialize exactly, double exactly and clamp to the wallet limit',()=>{
  const amount=9007199254740993n;
  const s={...freshState(T+HOUR),offlineReward:{id:T+HOUR,durationMs:HOUR,amount}};
  const loaded=parseSave(serializeSave(s));assert.equal(loaded.offlineReward.amount,amount);
  assert.equal(claimOfflineReward(loaded,T+HOUR,2).amount,amount*2n);
  const full={...s,gold:MAX_GOLD-1n};assert.equal(claimOfflineReward(full,T+HOUR,2).amount,1);assert.equal(full.gold,MAX_GOLD);
  const army={...freshState(T),soldiers:335544320,sergeants:0};prepareOfflineReward(army,T+HOUR*20);
  assert.equal(exact(army.offlineReward.amount),exact(perSecond(army))*28800n);
});
test('version 22 migration preserves assets and ignores injected unclaimed reward fields',()=>{
  const old={...freshState(T),version:22,gold:9007199254740993n,soldiers:4,offlineReward:{amount:999,id:T,durationMs:HOUR}};
  const loaded=parseSave(serializeSave(old));assert.equal(loaded.version,SAVE_VERSION);assert.equal(loaded.offlineReward,null);
  assert.equal(loaded.gold,old.gold);assert.equal(loaded.soldiers,4);assert.deepEqual(loaded.equipment,old.equipment);
  for(const reward of [undefined,{},[],{id:T+1,durationMs:HOUR,amount:1},{id:T,durationMs:8*HOUR+1,amount:1},
    {id:T,durationMs:HOUR-1,amount:1},{id:T,durationMs:HOUR,amount:'-1'},{id:T,durationMs:HOUR,amount:Number.MAX_SAFE_INTEGER+1}])
    assert.equal(parseSave(serializeSave({...freshState(T),offlineReward:reward})),null);
});
test('a failed claim save retains both the reward and pre-claim wallet for retry',()=>{
  const f=fixture(),s=f.make();s.start();const id=s.state.offlineReward.id;
  f.storage.fail=true;assert.deepEqual(s.claimOffline(id),{ok:false,reason:'save'});
  assert.equal(s.state.gold,0);assert.equal(s.state.offlineReward.amount,10800);
  assert.equal(parseSave(f.data.get(SAVE_KEY)).offlineReward.amount,10800);
  f.storage.fail=false;assert.equal(s.claimOffline(id).amount,10800);assert.equal(s.claimOffline(id).ok,false);s.pause();
});
test('failed initial settlement save and restart never grants a second payout',()=>{
  const f=fixture(),s=f.make();f.storage.fail=true;s.start();assert.equal(s.state.offlineReward.amount,10800);
  assert.equal(s.claimOffline(s.state.offlineReward.id).ok,false);f.storage.fail=false;s.pause();
  const next=f.make();next.start();assert.equal(next.claimOffline(next.state.offlineReward.id).amount,10800);next.pause();
});
test('production double button has no ad and cannot grant free gold; normal claim still works',async()=>{
  const f=fixture(),s=f.make();s.start();const c=createOfflineRewardController(s);
  assert.equal((await c.double()).reason,'unavailable');assert.equal(s.state.gold,0);assert.ok(s.state.offlineReward);
  assert.equal(c.claim().amount,10800);s.pause();
});
test('explicit development adapter grants double gold once without an ad',async()=>{
  const f=fixture(),s=f.make();s.start();const c=createOfflineRewardController(s,{showAd:createOfflineRewardAd(true)});
  assert.equal((await c.double()).amount,21600);assert.equal((await c.double()).ok,false);assert.equal(s.state.gold,21600);s.pause();
});
test('ad completion is single-use; dismissal/failure and late callbacks cannot grant bonuses',async()=>{
  for(const status of ['cancelled','closed','unavailable']) {
    const f=fixture(),s=f.make();s.start();const c=createOfflineRewardController(s,{showAd:async()=>({status})});
    assert.equal((await c.double()).ok,false);assert.equal(s.state.gold,0);assert.ok(s.state.offlineReward);s.pause();
  }
  const f=fixture(),s=f.make();s.start();let finish,calls=0;
  const c=createOfflineRewardController(s,{showAd:()=>{calls++;return new Promise(resolve=>{finish=resolve;});}});
  const job=c.double();assert.equal(c.busy,true);assert.equal(c.claim().reason,'busy');assert.equal((await c.double()).ok,false);
  finish({status:'rewarded'});assert.equal((await job).amount,21600);assert.equal(s.state.gold,21600);assert.equal(calls,1);s.pause();
  const next=fixture(),other=next.make();other.start();
  const late=createOfflineRewardController(other,{showAd:()=>new Promise(resolve=>{finish=resolve;})});
  const lateJob=late.double();other.claimOffline(other.state.offlineReward.id);finish({status:'rewarded'});
  assert.equal((await lateJob).ok,false);assert.equal(other.state.gold,10800);other.pause();
});
test('two locked tabs cannot claim the same reward',async()=>{
  let tail=Promise.resolve();
  const locks={request(_key,_options,action){const job=tail.then(action);tail=job.catch(()=>{});return job;}};
  const drain=async()=>{for(let i=0;i<16;i++)await Promise.resolve();};
  const f=fixture(undefined,T+HOUR,locks),a=f.make(),b=f.make();a.start();b.start();await drain();
  const id=a.state.offlineReward.id;assert.equal(b.claimOffline(id).reason,'inactive');assert.equal(a.claimOffline(id).amount,10800);
  a.pause();await drain();assert.equal(b.state.gold,10800);assert.equal(b.claimOffline(id).ok,false);b.pause();await drain();
});

test('ad exceptions are reported and app backgrounding retains unclaimed rewards',async()=>{
  const f=fixture(),s=f.make();s.start();const errors=[];
  const error=Error('ad failed');
  const broken=createOfflineRewardController(s,{showAd:async()=>{throw error;},onError:(...args)=>errors.push(args)});
  assert.equal((await broken.double()).reason,'ad-error');assert.equal(broken.busy,false);
  assert.deepEqual(errors,[['offline.ad',error]]);assert.equal(s.state.offlineReward.amount,10800);
  let finish;
  const delayed=createOfflineRewardController(s,{showAd:()=>new Promise(resolve=>{finish=resolve;})});
  const pending=delayed.double();s.pause();finish({status:'rewarded'});
  assert.equal((await pending).reason,'inactive');assert.equal(s.state.gold,0);
  s.start();assert.equal(s.claimOffline(s.state.offlineReward.id).amount,10800);s.pause();
});
