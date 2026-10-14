import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/state.js';
import {usePotion,perTap,perSecond,baseTapIncome,basePassiveIncome,accrue,activateSword,activateAutoTouch,tapGold} from '../src/game.js';
import {grantPotion,potionStatus} from '../src/potions.js';
import {grantTestStarterPack} from '../src/starter-pack.js';
import {serializeSave,exact,MAX_GOLD} from '../src/money.js';
import {parseSave,inspectSave} from '../src/save.js';
import {createPotionController} from '../src/potion-controller.js';
import {createPotionAd} from '../src/potion-ad.js';
import {layoutHomeField} from '../src/home-field-layout.js';
import {FORMATIONS} from '../src/formations.js';
import {buildingAura} from '../src/building-aura.js';
import {homeItemStatus} from '../src/home-quick-items.js';
import {homeOfferMarkup} from '../src/home-offer-popup.js';
const T=1800000000000;
const general=()=>({...freshState(T),soldiers:1_000_000});
const use=(s,id)=>{grantPotion(s,id);assert.equal(usePotion(s,T,id).ok,true);};

test('max multiplies all active sources and extends time without raising its multiplier',()=>{
 const s=general();for(const id of ['red','blue','max'])use(s,id);activateSword(s,T);
 assert.equal(exact(perTap(s,T)),exact(baseTapIncome(s))*40n);
 assert.equal(exact(perSecond(s,T)),exact(basePassiveIncome(s))*40n);
 assert.equal(exact(perTap(s,T+60_000)),exact(baseTapIncome(s))*10n);
 assert.equal(exact(perSecond(s,T+600_000)),exact(basePassiveIncome(s))*2n);
 grantPotion(s,'max');usePotion(s,T+1000,'max');assert.equal(s.potions.max.expiresAt,T+1_200_000);
 assert.equal(s.potions.max.count,0);assert.equal(potionStatus(s,'max',T+1_200_000).active,false);
});
test('max and blue intersections settle exactly across offline boundaries and fractional ticks',()=>{
 const s=general();use(s,'max');use(s,'blue');
 const a=structuredClone(s),b=structuredClone(s),base=exact(basePassiveIncome(s));
 accrue(a,T+8*3600000);
 for(const offset of [1,299,600001,1800000,28800000])accrue(b,T+offset);
 assert.equal(exact(a.gold),base*(600n*40n+1200n*2n+27000n));
 assert.equal(a.gold,b.gold);assert.equal(a.incomeRemainder,b.incomeRemainder);
 const before=a.gold;accrue(a,T-10000);assert.equal(a.gold,before);
 assert.equal(parseSave(serializeSave(a),a.lastAccrual).gold,a.gold);
});
test('revolver triple overlap agrees with independent pulse oracle and cannot double pay',()=>{
 const s=general();s.personalLevels.generalRevolver=30;
 for(const id of ['red','blue','max'])use(s,id);activateSword(s,T);activateAutoTouch(s,T);
 const base=exact(baseTapIncome(s)),passive=exact(basePassiveIncome(s));let expected=0n;
 for(let n=1;n<=Math.floor(s.autoTouchDurationMs/300);n++){
  const at=n*300;expected+=base*BigInt((at<30000?2:1)*(at<60000?2:1)*(at<600000?10:1));
 }
 accrue(s,T+s.autoTouchDurationMs);
 assert.equal(exact(s.gold),expected+passive*40n*BigInt(s.autoTouchDurationMs)/1000n);
 const gold=s.gold;accrue(s,T+s.autoTouchDurationMs);assert.equal(s.gold,gold);
});
test('version39 claimed packs receive ten max once, unclaimed never do, exact wallet survives',()=>{
 for(const claimed of [true,false]){
  const old={...freshState(T),version:39,gold:9007199254740993n};delete old.potions.max;
  old.starterPack=claimed?{claimed:true,source:'test'}:{claimed:false,source:null};
  old.potions.red.count=7;
  const s=parseSave(serializeSave(old),T);assert.equal(s.potions.max.count,claimed?10:0);assert.equal(s.gold,old.gold);assert.equal(s.potions.red.count,7);
  if(claimed){usePotion(s,T,'max');assert.equal(s.potions.max.count,9);}
  const restored=parseSave(serializeSave(s),T+1000);assert.deepEqual(restored.potions,s.potions);
  if(!claimed){assert.equal(grantTestStarterPack(restored).ok,true);assert.equal(restored.potions.max.count,10);}
 }
 const bad=freshState(T);delete bad.potions.max;assert.equal(inspectSave(serializeSave(bad),T).issue.field,'potions');
});
test('max cannot come from either ad entry point and home offers the pack',async()=>{
 let calls=0;const s=freshState(T),session={state:s,active:true,change:fn=>fn(s)};
 const controller=createPotionController(session,{showAd:async()=>{calls++;return {status:'rewarded'};}});
 assert.equal((await controller.watch('max')).ok,false);
 assert.equal((await createPotionAd({native:()=>true,plugin:{showRewarded:async()=>{calls++;}}})({itemId:'max'})).status,'unavailable');
 assert.equal(calls,0);assert.equal(homeItemStatus(s,'max',T).label,'스타터팩');
 assert.match(homeOfferMarkup('max').body,/스타터팩 보기/);assert.doesNotMatch(homeOfferMarkup('max').body,/광고 보기/);
});
test('max tap stays exact at integer boundary and wallet cap',()=>{
 for(const gold of [9007199254740991n,MAX_GOLD-1n]){
  const s={...freshState(T),gold};use(s,'max');
  assert.equal(exact(tapGold(s,T)),gold===MAX_GOLD-1n?1n:10n);
  assert.equal(parseSave(serializeSave(s),T).gold,s.gold);
 }
});
test('home groups three largest owned building types, not three instances, without overlap',()=>{
 const size=id=>FORMATIONS.find(f=>f.id===id).size;
 const s={...freshState(T),soldiers:size('corps')*3+size('division')*3+size('regiment')*2};
 for(const [w,h] of [[160,120],[180,250],[206,300]]){
  const world=layoutHomeField(s,w,h);
  assert.deepEqual(world.army.map(i=>[i.id,i.count]),[['corps',3],['division',3],['regiment',2]]);
  const [main,...small]=world.army;assert.ok(small.every(i=>i.width<main.width&&i.x>main.x+main.width&&i.y===main.y));
  for(const i of world.army)assert.ok(i.x>=0&&i.x+i.width<=w&&i.y+i.boxHeight<=h);
 }
 assert.equal(buildingAura('squad'),null);assert.ok(buildingAura('galacticCommand'));assert.equal(buildingAura('constellationCorps'),'#171425');
});
