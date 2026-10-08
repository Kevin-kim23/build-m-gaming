import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,perSecond,perTap,baseTapIncome,tapGold,accrue,activateSword,activateAutoTouch,enhancePersonalEquipment,MAX_OFFLINE_MS} from '../src/game.js';
import {MAX_GOLD,exact,serializeSave,subtractMoney} from '../src/money.js';
import {RANKS,RANK_REQUIREMENTS} from '../src/ranks.js';
import {troopIncome} from '../src/units.js';
import {equipmentIncome} from '../src/equipment.js';
import {parseSave} from '../src/save.js';
import {personalStatus,withPersonalIncome,withPersonalEquipmentIncome} from '../src/personal-equipment.js';
import {PERSONAL_EQUIPMENT} from '../src/personal-catalog.js';
import {personalUpgradeStep,personalUpgradeOffer} from '../src/personal-enhancement.js';
import {personalLevelEffect,personalDetailMarkup} from '../src/personal-panels.js';
import {personalIcon} from '../src/personal-art.js';
import {createBattle} from '../src/battle.js';
const T=1800000000000;
const ids=['admiralsCompass','strategicTablet','supremeSeal'];
const army=(rank='대원수')=>({...freshState(T),soldiers:RANK_REQUIREMENTS[RANKS.indexOf(rank)]-3000,sergeants:300,gold:MAX_GOLD,ncoSchoolLevel:5});
const ratio=(v,n)=>exact(v)*BigInt(n)/100n;

test('each new personal reward previews one rank early, unlocks at its own rank and has explicit paid growth',()=>{
  for(const [i,id]of ids.entries()){
    const item=PERSONAL_EQUIPMENT[id],r=RANKS.indexOf(item.unlockRank);
    assert.equal(personalStatus(army(RANKS[r-2]),id).visible,false);
    assert.deepEqual(personalStatus(army(RANKS[r-1]),id),{visible:true,owned:false,level:0});
    const s=army(item.unlockRank);
    assert.deepEqual(personalStatus(s,id),{visible:true,owned:true,level:1});
    assert.equal(personalUpgradeStep(id,1).cost,[100_000_000_000,300_000_000_000,1_000_000_000_000][i]);
    assert.match(personalDetailMarkup(s,id).body,new RegExp(item.unlockRank+' 진급 보상'));
    s.personalLevels[id]=7;s.soldiers=army().soldiers;assert.equal(personalStatus(s,id).level,7);
  }
  const fresh=freshState(T);for(const id of ids)fresh.personalLevels[id]=10;
  assert.equal(baseTapIncome(fresh),1);assert.equal(perSecond(fresh),0);
});

test('compass, tablet and seal apply once in a defined order with exact flooring at all twenty levels',()=>{
  const s=army();s.gold=0;s.equipment.tank={level:20,count:1,deployed:true};
  for(let level=1;level<=20;level++){
    for(const id of ids)s.personalLevels[id]=level;
    const gear=equipmentIncome(s),tablet=130+(level-1)*10,compass=140+(level-1)*10,seal=120+(level-1)*5;
    const passive=ratio(ratio(exact(troopIncome(s,'passive'))+ratio(gear.passive,tablet),220),seal);
    const tap=ratio(ratio(1n+exact(troopIncome(s,'tap'))+ratio(gear.tap,tablet),compass),seal);
    assert.equal(exact(perSecond(s)),passive);assert.equal(exact(perTap(s,T)),tap);
    assert.match(personalLevelEffect(ids[0],level),new RegExp('\\+'+(compass-100)+'%'));
    assert.match(personalLevelEffect(ids[1],level),new RegExp('\\+'+(tablet-100)+'%'));
    assert.match(personalLevelEffect(ids[2],level),new RegExp('\\+'+(seal-100)+'%'));
  }
  const base=army('중원수');base.equipment.tank={level:20,count:1,deployed:false};
  const storedTap=perTap(base,T),storedPassive=perSecond(base);base.personalLevels.strategicTablet=10;
  assert.equal(perTap(base,T),storedTap);assert.equal(perSecond(base),storedPassive);
  base.equipment.tank.deployed=true;assert.ok(perTap(base,T)>storedTap);assert.ok(perSecond(base)>storedPassive);
});

test('new passive layers handle safe integer boundaries, wallet minus one and exact storage',()=>{
  const s=army();for(const id of ids)s.personalLevels[id]=10;
  for(const amount of [Number.MAX_SAFE_INTEGER-1,Number.MAX_SAFE_INTEGER,9007199254740993n,MAX_GOLD-1n]){
    assert.equal(exact(withPersonalEquipmentIncome(s,amount)),ratio(amount,220));
    assert.equal(exact(withPersonalIncome(s,amount,'tap')),ratio(ratio(amount,230),165));
    assert.equal(exact(withPersonalIncome(s,amount)),ratio(ratio(amount,220),165));
    s.gold=amount;const restored=parseSave(serializeSave(s),T);
    assert.equal(restored.gold,amount);assert.deepEqual(restored.personalLevels,s.personalLevels);
  }
  s.gold=MAX_GOLD-1n;assert.equal(tapGold(s,T),1);assert.equal(s.gold,MAX_GOLD);assert.equal(tapGold(s,T),0);
});

test('sword and revolver use all home bonuses exactly once, including eight-hour settlement and reload',()=>{
  const s=army();s.gold=0;s.equipment.icbm={level:20,count:1,deployed:true};
  s.facilities=['kitchen','gym'];s.facilityLevels={kitchen:20,gym:20};s.campaignCleared=80;
  for(const id of ids)s.personalLevels[id]=10;
  activateSword(s,T);activateAutoTouch(s,T);
  const tap=exact(baseTapIncome(s));assert.equal(exact(perTap(s,T)),tap*2n);
  const passive=exact(perSecond(s));accrue(s,T+300);
  assert.equal(exact(s.gold),passive*300n/1000n+tap*2n);
  const restored=parseSave(serializeSave(s),T+300);accrue(restored,T+300);
  assert.equal(restored.gold,s.gold);assert.equal(restored.autoTouchTicks,1);
  const offline=army();offline.gold=0;
  for(const id of ids)offline.personalLevels[id]=10;
  const expected=exact(perSecond(offline))*BigInt(MAX_OFFLINE_MS)/1000n;
  accrue(offline,T+MAX_OFFLINE_MS*2);assert.equal(exact(offline.gold),expected);
  assert.equal(parseSave(serializeSave(offline),offline.lastAccrual).gold,offline.gold);
});

test('paid passive upgrade settles old income before new level and never alters battle attributes',()=>{
  const s=army();s.gold=5_000_000_000_000;
  for(const id of ids){
    const before=s.gold,old=perSecond(s),at=s.lastAccrual+1000;
    const result=enhancePersonalEquipment(s,at,id,()=>0);
    assert.equal(exact(s.gold),exact(before)+exact(old)-exact(result.cost));
  }
  s.equipment.tank={level:20,count:1,deployed:true};
  const before=createBattle(s,1,{equipment:['tank']});
  for(const id of ids)s.personalLevels[id]=10;
  const after=createBattle(s,1,{equipment:['tank']});
  assert.deepEqual(after,before);
});

test('three original personal icons cache ten distinct detailed upgrade appearances',()=>{
  const all=[];
  for(const kind of ['compass','tablet','seal']){
    const levels=Array.from({length:10},(_,i)=>personalIcon(kind,i+1));
    assert.equal(new Set(levels).size,10);assert.equal(personalIcon(kind,10),levels[9]);
    assert.ok((levels[0].match(/<rect|<polygon/g)||[]).length>45);
    assert.match(levels[0],/viewBox="0 0 192 256"/);all.push(...levels);
  }
  assert.equal(new Set(all).size,30);assert.doesNotMatch(all.join(''),/undefined|NaN|<image|https?:|<script/);
});
