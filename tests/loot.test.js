import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,SAVE_KEY,SAVE_VERSION} from '../src/state.js';
import {parseSave,inspectSave} from '../src/save.js';
import {serializeSave,MAX_GOLD} from '../src/money.js';
import {OPERATIVES,MAX_LOOT,stageLoot,legacyLoot,awardLoot,recruitOperative,supplyStatus,claimSupply,toggleDuty} from '../src/loot.js';
import {accrue,perSecond,perTap} from '../src/game.js';
import {prepareOfflineReward} from '../src/offline-reward.js';
import {offlineLimitMs} from '../src/offline-rules.js';
import {createHomeAutoTapRuntime,grantTestHomeAutoTap,homeAutomaticRate} from '../src/home-auto-tap.js';
import {createGameSession} from '../src/session.js';
import {POTION_COUNT_LIMIT} from '../src/potions.js';
import {recordBattleVictory} from '../src/battle-progress.js';
import {replayRemaining,campaignBonusPercent} from '../src/campaign-rewards.js';
import {battleRewardPreview,battleRewardMarkup} from '../src/battle-reward-view.js';
import {STAGES} from '../src/battle.js';
import {lootShopMarkup,supplyTime,supplyCountdown} from '../src/loot-ui.js';
import {operativeIcon} from '../src/operative-art.js';
const T=1800000000000,DAY=86400000;
function hire(id){const s=freshState(T);s.loot.balance=100000;assert.equal(recruitOperative(s,id,T).ok,true);return s;}
const win=id=>({stageId:id,status:'victory',elapsedMs:50000,enemy:{hq:{hp:0}},player:{hq:{hp:100,maxHp:100}}});
function army(){const s=freshState(T);s.soldiers=10000;s.equipment.artillery={count:1,deployed:true,level:10};return s;}

test('version42 migrates cleared regions once without touching gold, stars or conquest income',()=>{
 const old=army();old.version=42;old.campaignCleared=40;old.campaignStars.fill(3,0,40);old.gold=123456;delete old.loot;
 const s=parseSave(serializeSave(old),T);assert.ok(s);assert.equal(s.version,SAVE_VERSION);assert.equal(s.gold,old.gold);
 assert.deepEqual(s.campaignStars,old.campaignStars);assert.equal(campaignBonusPercent(s),campaignBonusPercent(old));
 assert.deepEqual(s.loot,legacyLoot(40));assert.ok(s.loot.balance>0);
 recruitOperative(s,'duty',T);const balance=s.loot.balance;
 const again=parseSave(serializeSave(s),T);assert.equal(again.loot.balance,balance);assert.ok(again.loot.operatives.duty);
 assert.equal(parseSave(serializeSave(freshState(T)),T).loot.balance,0);
});
test('loot parser rejects unsafe currency, missing operatives and malformed timestamps',()=>{
 for(const mutate of [s=>s.loot.balance=NaN,s=>s.loot.balance=MAX_LOOT+1,s=>s.loot.balance='900',s=>delete s.loot.operatives.scout,
 s=>s.loot.operatives.duty.hiredAt=T+1,s=>s.loot.operatives.duty.stock=1,s=>s.loot.operatives.duty.enabled='yes']){
  const s=hire('duty');mutate(s);assert.equal(inspectSave(serializeSave(s),T).issue?.field,'loot');
 }
});
test('first-clear loot ignores gold caps, replay limit is shared and conquest remains additive',()=>{
 const s=army();s.gold=MAX_GOLD;
 assert.equal(recordBattleVictory(s,win(1),T).loot,100);assert.equal(s.gold,MAX_GOLD);assert.equal(campaignBonusPercent(s),1);
 assert.equal(battleRewardPreview(s,STAGES[0]).loot,20);
 for(let i=0;i<10;i++)assert.equal(recordBattleVictory(s,win(1),T).loot,20);
 assert.equal(recordBattleVictory(s,win(1),T).loot,0);assert.equal(replayRemaining(s,T),0);
 assert.equal(recordBattleVictory(s,win(2),T).loot,105);assert.equal(campaignBonusPercent(s),2);
 assert.equal(recordBattleVictory(s,win(1),T+DAY).loot,20);
 assert.equal(stageLoot(20),585);assert.equal(stageLoot(200),3285);
 for(const id of [0,201,1.2,'1'])assert.throws(()=>stageLoot(id));
 assert.match(battleRewardMarkup(s,STAGES[19]),/전리품/);
});
test('loot is bounded and a failed/locked victory cannot grant anything',()=>{
 const s=army();s.loot.balance=MAX_LOOT-2;assert.equal(recordBattleVictory(s,win(1),T).loot,2);assert.equal(s.loot.balance,MAX_LOOT);
 assert.equal(awardLoot(s,100),0);assert.throws(()=>awardLoot(s,-1));
 const before=s.loot.balance;assert.equal(recordBattleVictory(s,win(3),T).ok,false);assert.equal(s.loot.balance,before);
 assert.equal(recordBattleVictory(freshState(T),win(1),T).ok,false);
});
test('each operative is a one-time fixed purchase and never spends gold',()=>{
 for(const o of OPERATIVES){const s=freshState(T);s.gold=123;s.loot.balance=o.price-1;assert.equal(recruitOperative(s,o.id,T).reason,'loot');
 s.loot.balance++;assert.equal(recruitOperative(s,o.id,T).ok,true);assert.equal(s.loot.balance,0);assert.equal(s.gold,123);
 assert.equal(recruitOperative(s,o.id,T).reason,'owned');assert.ok(parseSave(serializeSave(s),T));}
});
test('supplies start at hire, cap at three and retain their anchored schedule after collection',()=>{
 for(const id of ['scout','supply','operative']){
 const o=OPERATIVES.find(o=>o.id===id),s=hire(id),period=o.period;
 assert.equal(supplyStatus(s,id,T+period-1).ready,0);assert.equal(claimSupply(s,id,T).ok,false);
 assert.equal(supplyStatus(s,id,T+period*10+1000).ready,3);
 s.lastAccrual=T+period*10+1000;assert.equal(claimSupply(s,id,s.lastAccrual).amount,3);
 assert.equal(s.potions[o.potion].count,4);assert.equal(claimSupply(s,id,s.lastAccrual).ok,false);
 assert.equal(supplyStatus(s,id,s.lastAccrual).remainingMs,period-1000);
 const loaded=parseSave(serializeSave(s),s.lastAccrual);assert.ok(loaded);assert.equal(supplyStatus(loaded,id,T).ready,0);
 assert.equal(supplyStatus(loaded,id,T+11*period).ready,1);
 }
});
test('full booster inventory preserves supplies and partial collection cannot overflow',()=>{
 const s=hire('scout');s.lastAccrual=T+3*DAY;s.potions.blue.count=POTION_COUNT_LIMIT;
 assert.equal(claimSupply(s,'scout',s.lastAccrual).reason,'limit');assert.equal(supplyStatus(s,'scout',s.lastAccrual).ready,3);
 s.potions.blue.count--;assert.equal(claimSupply(s,'scout',s.lastAccrual).amount,1);assert.equal(supplyStatus(s,'scout',s.lastAccrual).ready,2);
 assert.ok(parseSave(serializeSave(s),s.lastAccrual));
});
test('quartermaster extends direct and popup offline settlement to twelve hours without retroactive credit',()=>{
 const s=hire('quartermaster');s.soldiers=100;const rate=perSecond(s);
 assert.equal(offlineLimitMs(s),12*3600000);assert.equal(offlineLimitMs(freshState(T)),8*3600000);
 accrue(s,T+2*DAY);assert.equal(s.gold,rate*43200);assert.equal(s.lastAccrual,T+2*DAY);
 const p=hire('quartermaster');p.soldiers=100;prepareOfflineReward(p,T+2*DAY);
 assert.equal(p.offlineReward.durationMs,43200000);assert.equal(p.offlineReward.amount,rate*43200);assert.ok(parseSave(serializeSave(p),T+2*DAY));
 const before=army();before.loot.balance=24000;accrue(before,T+DAY);const gold=before.gold;
 recruitOperative(before,'quartermaster',T+DAY);accrue(before,T+DAY);assert.equal(before.gold,gold);
});
test('duty yields one independent home pulse, stacks with paid ten and cannot catch up after a popup',()=>{
 const s=hire('duty');let mono=0,visible=true;
 const session={active:true,state:s,change:fn=>fn(s)};
 const runtime=createHomeAutoTapRuntime(session,{canRun:()=>visible,clock:()=>mono,now:()=>T+mono});
 runtime.tick();for(let i=0;i<10;i++){mono+=100;runtime.tick();}assert.equal(s.gold,perTap(s));assert.equal(s.taps,0);
 grantTestHomeAutoTap(s);assert.equal(homeAutomaticRate(s),11);runtime.tick();const gold=s.gold;
 for(let i=0;i<10;i++){mono+=100;runtime.tick();}assert.equal(s.gold-gold,11);
 visible=false;runtime.tick();mono+=DAY;visible=true;runtime.tick();assert.equal(s.gold,gold+11);
 toggleDuty(s);assert.equal(homeAutomaticRate(s),10);s.homeAutoTap.enabled=false;assert.equal(homeAutomaticRate(s),0);
});
test('supplies survive save failure without double grant on retry and reload',()=>{
 const initial=hire('scout'),values=new Map([[SAVE_KEY,serializeSave(initial)]]);let fail=false;
 const session=createGameSession({storage:{getItem:k=>values.get(k)??null,setItem(k,v){if(fail)throw Error('test quota');values.set(k,v);}},now:()=>T+DAY,setTimer:()=>1,clearTimer:()=>{}});
 session.start();fail=true;session.change(s=>claimSupply(s,'scout',T+DAY));assert.equal(session.state.potions.blue.count,2);
 assert.equal(session.change(s=>claimSupply(s,'scout',T+DAY)).ok,false);
 fail=false;session.flush();session.pause();session.start();assert.equal(session.state.potions.blue.count,2);assert.equal(supplyStatus(session.state,'scout',T+DAY).ready,0);session.pause();
});
test('shop has five accessible portraits, fixed ownership and transparent schedules',()=>{
 const html=lootShopMarkup();for(const o of OPERATIVES){assert.ok(html.includes(o.name));assert.ok(html.includes(o.effect));assert.match(operativeIcon(o.id),/viewBox="0 0 192 224"/);}
 assert.match(html,/종류별 1명/);assert.match(html,/최대 3회분/);assert.equal(supplyTime(DAY),'24시간');assert.equal(supplyCountdown(DAY),'24:00');assert.equal(supplyCountdown(3*DAY),'72:00');assert.equal(supplyCountdown(DAY-60000),'23:59');assert.equal(supplyCountdown(1),'00:01');
});

test('first recruitment immediately grants one booster and starts its normal supply clock',()=>{
 for(const o of OPERATIVES.filter(o=>o.period)){
  const s=freshState(T);s.loot.balance=100000;s.potions[o.potion].count=7;
  const result=recruitOperative(s,o.id,T);
  assert.equal(result.amount,1);assert.equal(s.potions[o.potion].count,8);
  assert.equal(supplyStatus(s,o.id,T).ready,0);assert.equal(supplyStatus(s,o.id,T).remainingMs,o.period);
  const loaded=parseSave(serializeSave(s),T);assert.ok(loaded);
  assert.equal(recruitOperative(loaded,o.id,T).reason,'owned');assert.equal(loaded.potions[o.potion].count,8);
  assert.equal(claimSupply(loaded,o.id,T).ok,false);
  loaded.lastAccrual=T+o.period;assert.equal(claimSupply(loaded,o.id,T+o.period).amount,1);
  assert.equal(loaded.potions[o.potion].count,9);
 }
});
test('first booster stays in supply stock if the item inventory is full',()=>{
 const s=freshState(T);s.loot.balance=9000;s.potions.blue.count=POTION_COUNT_LIMIT;
 const result=recruitOperative(s,'scout',T);assert.equal(result.ok,true);assert.equal(result.pendingSupply,1);
 assert.equal(s.loot.operatives.scout.stock,1);assert.equal(s.potions.blue.count,POTION_COUNT_LIMIT);
 const loaded=parseSave(serializeSave(s),T);assert.ok(loaded);loaded.potions.blue.count--;
 assert.equal(claimSupply(loaded,'scout',T).amount,1);assert.equal(claimSupply(loaded,'scout',T).ok,false);
});
test('a failed first recruitment grants no booster and an older owned record gets no extra on load',()=>{
 const s=freshState(T);const before=serializeSave(s);assert.equal(recruitOperative(s,'scout',T).ok,false);assert.equal(serializeSave(s),before);
 s.loot.balance=9000;recruitOperative(s,'scout',T);s.potions.blue.count=0;
 const loaded=parseSave(serializeSave(s),T);assert.equal(loaded.potions.blue.count,0);assert.equal(loaded.loot.operatives.scout.stock,0);
});

test('first recruitment saved after a storage retry cannot duplicate its welcome booster',()=>{
 const initial=freshState(T);initial.loot.balance=9000;const values=new Map([[SAVE_KEY,serializeSave(initial)]]);let fail=false;
 const session=createGameSession({storage:{getItem:k=>values.get(k)??null,setItem(k,v){if(fail)throw Error('quota');values.set(k,v);}},now:()=>T,setTimer:()=>1,clearTimer:()=>{}});
 session.start();fail=true;assert.equal(session.change(s=>recruitOperative(s,'scout',T)).amount,1);
 assert.equal(session.change(s=>recruitOperative(s,'scout',T)).reason,'owned');
 fail=false;session.flush();session.pause();session.start();assert.equal(session.state.potions.blue.count,1);assert.equal(session.state.loot.balance,0);session.pause();
});
