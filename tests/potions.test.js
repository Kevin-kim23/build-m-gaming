import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,SAVE_KEY,SAVE_VERSION} from '../src/state.js';
import {POTIONS,emptyPotions,grantPotion,potionStatus,POTION_TIME_LIMIT} from '../src/potions.js';
import {usePotion,perTap,perSecond,baseTapIncome,basePassiveIncome,accrue,tapGold,activateSword,activateAutoTouch} from '../src/game.js';
import {prepareOfflineReward,claimOfflineReward} from '../src/offline-reward.js';
import {MAX_OFFLINE_MS} from '../src/offline-rules.js';
import {serializeSave,MAX_GOLD,exact} from '../src/money.js';
import {parseSave,inspectSave} from '../src/save.js';
import {RANK_REQUIREMENTS,RANKS} from '../src/ranks.js';
import {createGameSession} from '../src/session.js';
import {createPotionController} from '../src/potion-controller.js';
import {battleRewardPreview} from '../src/battle-reward-view.js';
import {recordBattleVictory} from '../src/battle-progress.js';
import {STAGES} from '../src/battle.js';
const T=1800000000000;
const general=()=>({...freshState(T),soldiers:RANK_REQUIREMENTS[RANKS.indexOf('중장')]-3000,sergeants:300});
const give=(s,id,count=1)=>{for(let i=0;i<count;i++)assert.equal(grantPotion(s,id).ok,true);};

test('ads grant inventory, use consumes once, repeat extends duration without multiplying strength',()=>{
  const s={...freshState(T),soldiers:3};
  for(const id of Object.keys(POTIONS)){
    assert.equal(usePotion(s,T,id).reason,'empty');give(s,id,2);
    assert.equal(usePotion(s,T,id).ok,true);assert.equal(s.potions[id].count,1);
    assert.equal(usePotion(s,T+1000,id).ok,true);assert.equal(s.potions[id].count,0);
    const duration=POTIONS[id].durationMs;
    assert.equal(s.potions[id].expiresAt,T+(id==='blue'?1000:0)+duration*2);
    assert.equal(potionStatus(s,id,T+duration).multiplier,2);
    assert.equal(potionStatus(s,id,s.potions[id].expiresAt).multiplier,1);
  }
});

test('red and sword multiply to four and each half-open expiry restores the right amount',()=>{
  const s=general();give(s,'red');usePotion(s,T,'red');activateSword(s,T);
  const base=baseTapIncome(s);
  assert.equal(perTap(s,T),base*4);assert.equal(perTap(s,T+30000),base*2);
  assert.equal(perTap(s,T+60000),base);assert.equal(perSecond(s,T),basePassiveIncome(s));
});

test('blue settles only boosted milliseconds; large and small ticks give identical exact payouts',()=>{
  const initial={...freshState(T),soldiers:3};give(initial,'blue');usePotion(initial,T,'blue');
  const once=parseSave(serializeSave(initial),T),split=parseSave(serializeSave(initial),T);
  accrue(once,T+3600000);
  for(const offset of [123,3210,1799999,1800001,2371543,3600000])accrue(split,T+offset);
  assert.equal(once.gold,3*(3600+1800));assert.equal(split.gold,once.gold);
  assert.equal(split.incomeRemainder,once.incomeRemainder);
  assert.equal(perSecond(initial,T+1799999),6);assert.equal(perSecond(initial,T+1800000),3);
});

test('offline popup includes blue only for remaining duration, honors eight hours and never pays it twice',()=>{
  const s={...freshState(T),soldiers:7};give(s,'blue');usePotion(s,T,'blue');
  assert.equal(prepareOfflineReward(s,T+12*3600000),true);
  assert.equal(s.offlineReward.durationMs,MAX_OFFLINE_MS);
  const expected=7*(8*3600+1800);assert.equal(s.offlineReward.amount,expected);
  const saved=parseSave(serializeSave(s),T+12*3600000);assert.equal(potionStatus(saved,'blue',saved.lastAccrual).active,false);
  const id=saved.offlineReward.id;assert.equal(claimOfflineReward(saved,id,2).amount,expected*2);
  assert.equal(claimOfflineReward(saved,id,2).ok,false);
  const gold=saved.gold;accrue(saved,T+12*3600000);assert.equal(saved.gold,gold);
  accrue(saved,T+12*3600000+1000);assert.equal(saved.gold,gold+7);
});

test('revolver pulses apply red, sword and their intersection exactly once including after closing',()=>{
  const s=general();s.personalLevels.generalRevolver=20;
  activateAutoTouch(s,T);activateSword(s,T);give(s,'red');usePotion(s,T+10100,'red');
  const paidBefore=s.gold,base=exact(baseTapIncome(s));
  let expected=0n;
  for(let n=s.autoTouchTicks+1;n<=Math.floor(s.autoTouchDurationMs/300);n++){
    const at=T+n*300;
    expected+=base*BigInt((at<T+30000?2:1)*(at>=T+10100&&at<T+70100?2:1));
  }
  const passive=exact(basePassiveIncome(s))*BigInt(s.autoTouchDurationMs-10100)/1000n;
  accrue(s,T+s.autoTouchDurationMs);
  assert.equal(exact(s.gold)-exact(paidBefore),expected+passive);
  const total=s.gold;accrue(s,T+s.autoTouchDurationMs);assert.equal(s.gold,total);
});

test('exact amounts cross the safe integer boundary, cap with one gold, and survive save',()=>{
  for(const gold of [9007199254740991n,MAX_GOLD-1n]){
    const s={...freshState(T),gold};give(s,'red');usePotion(s,T,'red');
    const earned=tapGold(s,T);assert.equal(exact(earned),gold===MAX_GOLD-1n?1n:2n);
    assert.equal(exact(parseSave(serializeSave(s),T).gold),gold+exact(earned));
  }
  const s=general();s.specialMarshals=100;s.commandSchoolLevel=5;s.advancedSchoolLevel=5;s.officerSchoolLevel=5;s.ncoSchoolLevel=5;
  s.gold=9007199254740991n;give(s,'blue');usePotion(s,T,'blue');
  const expected=exact(s.gold)+exact(basePassiveIncome(s))*3600n;
  accrue(s,T+1800000);assert.equal(exact(s.gold),expected);assert.equal(parseSave(serializeSave(s),s.lastAccrual).gold,s.gold);
  const cap={...freshState(T),soldiers:1,gold:MAX_GOLD-1n};give(cap,'blue');usePotion(cap,T,'blue');
  assert.equal(accrue(cap,T+1000),1);assert.equal(cap.gold,MAX_GOLD);assert.equal(cap.incomeRemainder,0);
});

test('legacy saves gain empty inventory and invalid records cannot corrupt counts, time or other progress',()=>{
  const s=general();s.version=31;s.gold=MAX_GOLD-1n;s.equipment.artillery={level:30,deployed:true,count:1};
  s.potions={red:{count:99,startedAt:T,expiresAt:T+60000}};
  const migrated=parseSave(serializeSave(s),T);
  assert.equal(migrated.version,SAVE_VERSION);assert.deepEqual(migrated.potions,emptyPotions());
  assert.equal(migrated.gold,s.gold);assert.deepEqual(migrated.equipment,s.equipment);
  for(const red of [{count:-1,startedAt:null,expiresAt:null},{count:1.5,startedAt:null,expiresAt:null},
    {count:1,startedAt:T,expiresAt:T},{count:1,startedAt:null,expiresAt:T},
    {count:1,startedAt:T,expiresAt:POTION_TIME_LIMIT+1}]){
    const bad={...migrated,potions:{...migrated.potions,red}};
    assert.equal(inspectSave(serializeSave(bad),T).issue.field,'potions');
  }
  assert.equal(usePotion(migrated,T,'__proto__').ok,false);assert.equal(grantPotion(migrated,'__proto__').ok,false);
  give(migrated,'blue');usePotion(migrated,T,'blue');
  assert.deepEqual(parseSave(serializeSave(migrated),T+999999).potions,migrated.potions);
});

test('clock rollback cannot restart an expired potion or duplicate income; timestamp limits preserve inventory',()=>{
  const s={...freshState(T),soldiers:1};give(s,'red',2);usePotion(s,T,'red');
  accrue(s,T+70000);const gold=s.gold;
  assert.equal(potionStatus(s,'red',T+1).active,false);accrue(s,T+1);assert.equal(s.gold,gold);
  assert.equal(usePotion(s,T+1,'red').ok,true);assert.equal(s.potions.red.startedAt,T+70000);
  const late=freshState(POTION_TIME_LIMIT-1000);give(late,'blue');
  assert.equal(usePotion(late,late.lastAccrual,'blue').ok,false);assert.equal(late.potions.blue.count,1);
});

function fixture(showAd){
  const data=new Map(),errors=[];let clock=T;
  const session=createGameSession({storage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},now:()=>clock,setTimer:()=>1,clearTimer:()=>{}});
  session.start();const c=createPotionController(session,{showAd,now:()=>clock,onError:(...e)=>errors.push(e)});
  return {session,c,data,errors,setTime:time=>{clock=time;}};
}
test('one outstanding ad grants exactly one saved potion and disables concurrent grants/uses',async()=>{
  let finish;const f=fixture(()=>new Promise(resolve=>{finish=resolve;}));
  const request=f.c.watch('red');assert.equal(f.c.busy,true);
  assert.equal((await f.c.watch('red')).ok,false);assert.equal(f.c.use('red').ok,false);
  finish({status:'rewarded'});finish({status:'rewarded'});assert.equal((await request).ok,true);
  assert.equal(f.session.state.potions.red.count,1);assert.equal(f.c.busy,false);
  assert.equal(parseSave(f.data.get(SAVE_KEY),T).potions.red.count,1);
  assert.equal(f.c.use('red').ok,true);assert.equal(f.c.use('red').ok,false);
  f.session.pause();f.setTime(T+10000);f.session.start();
  assert.equal(f.session.state.potions.red.count,0);assert.equal(potionStatus(f.session.state,'red',T+10000).remainingMs,50000);
  f.session.pause();
});

test('cancelled, failed and inactive ad callbacks never grant stock, and future rewarded adapters work',async()=>{
  for(const status of ['cancelled','unavailable']){const f=fixture(async()=>({status}));assert.equal((await f.c.watch('blue')).ok,false);assert.equal(f.session.state.potions.blue.count,0);f.session.pause();}
  const f=fixture(async()=>{throw new Error('SDK test failure');});assert.equal((await f.c.watch('red')).reason,'ad-error');assert.equal(f.errors[0][0],'potion.ad');assert.equal(f.c.busy,false);f.session.pause();
  let finish;const paused=fixture(()=>new Promise(r=>{finish=r;}));const pending=paused.c.watch('blue');paused.session.pause();finish({status:'rewarded'});
  assert.equal((await pending).ok,false);assert.equal(paused.session.state.potions.blue.count,0);
});

test('temporary blue bonus never changes campaign preview or victory payout',()=>{
  const a=general(),b=general();a.equipment.artillery=b.equipment.artillery={level:0,deployed:true,count:1};
  give(b,'blue');usePotion(b,T,'blue');
  assert.deepEqual(battleRewardPreview(a,STAGES[0]),battleRewardPreview(b,STAGES[0]));
  const battle={stageId:1,status:'victory',enemy:{hq:{hp:0}},player:{hq:{hp:100,maxHp:100}},elapsed:60000};
  assert.equal(recordBattleVictory(a,battle,T).gold,recordBattleVictory(b,battle,T).gold);
});
