import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,buildFacility,upgradeFacility,perSecond,accrue,tapGold} from '../src/game.js';
import {FACILITIES,facilityLevel,facilityStats,facilityBonus,facilityUpgradeCost,facilityUpgradeOffer,withFacilityIncome,ownedFacilities} from '../src/facilities.js';
import {MAX_FACILITY_LEVEL} from '../src/facility-catalog.js';
import {MAX_GOLD,exact,serializeSave,subtractMoney} from '../src/money.js';
import {inspectSave,parseSave} from '../src/save.js';
import {SAVE_VERSION} from '../src/state.js';
import {prepareOfflineReward,claimOfflineReward} from '../src/offline-reward.js';
const T=1800000000000;
const ready=(id='operations',level=1)=>({...freshState(T),soldiers:10000,sergeants:300,gold:MAX_GOLD,
  facilities:[id],facilityLevels:{[id]:level}});

test('facilities build at level one, upgrade to twenty and never create a duplicate',()=>{
  const s=ready();s.facilities=[];s.facilityLevels={};
  assert.equal(facilityLevel(s,'operations'),0);
  assert.equal(upgradeFacility(s,T,'operations').reason,'unowned');
  assert.equal(buildFacility(s,T,'operations').ok,true);
  assert.equal(facilityLevel(s,'operations'),1);
  for(let level=1;level<MAX_FACILITY_LEVEL;level++){
    const previous=s.gold,offer=facilityUpgradeOffer(s,'operations');
    assert.equal(offer.level,level);assert.equal(offer.nextLevel,level+1);assert.equal(offer.canUpgrade,true);
    assert.deepEqual(upgradeFacility(s,T,'operations'),{ok:true,id:'operations',cost:offer.cost,level:level+1});
    assert.equal(exact(s.gold),exact(previous)-exact(offer.cost));
    assert.equal(facilityLevel(s,'operations'),level+1);
  }
  const before=serializeSave(s);
  assert.equal(upgradeFacility(s,T,'operations').reason,'max');
  assert.equal(buildFacility(s,T,'operations').reason,'owned');
  assert.equal(serializeSave(s),before);assert.deepEqual(s.facilities,['operations']);
  assert.equal(facilityUpgradeCost('operations',20),null);
});

test('level bonuses preserve fractional percentages and cached totals invalidate on an upgrade',()=>{
  const s=ready('kitchen');
  const first=facilityBonus(s);assert.deepEqual(first,{passive:5,tap:0});assert.equal(first,facilityBonus(s));
  upgradeFacility(s,T,'kitchen');
  assert.deepEqual(facilityBonus(s),{passive:6,tap:0});assert.notEqual(first,facilityBonus(s));
  assert.equal(ownedFacilities(s)[0].level,2);
  for(let level=1;level<=20;level++){
    const stats=facilityStats('kitchen',level);
    assert.equal(stats.passive,5*(100+20*(level-1))/100);
    for(const value of [1,10,Number.MAX_SAFE_INTEGER,9007199254740993n,MAX_GOLD-1n]){
      s.facilityLevels={kitchen:level};
      assert.equal(exact(withFacilityIncome(s,value,'passive')),exact(value)*BigInt(10000+5*(100+20*(level-1)))/10000n);
    }
  }
  s.facilities=FACILITIES.map(f=>f.id);s.facilityLevels=Object.fromEntries(s.facilities.map(id=>[id,20]));
  assert.deepEqual(facilityBonus(s),{passive:720,tap:619.2});
});

test('facility costs are exact rational geometric values across the safe integer boundary',()=>{
  let hasBigInt=false;
  for(const f of FACILITIES)for(let level=1;level<20;level++){
    const divisor=(2n**BigInt(level))*1000n;
    const expected=(BigInt(f.cost)*3n*BigInt(f.upgradeNumerator??5)**BigInt(level-1)+divisor-1n)/divisor*1000n;
    const cost=facilityUpgradeCost(f.id,level);
    assert.equal(exact(cost),expected);assert.ok(cost>0 && cost<MAX_GOLD);
    if(level>1)assert.ok(cost>facilityUpgradeCost(f.id,level-1));
    hasBigInt ||= typeof cost==='bigint';
  }
  assert.equal(hasBigInt,true);
  for(const level of [-1,0,1.1,21,Infinity,NaN])assert.throws(()=>facilityUpgradeCost('kitchen',level),RangeError);
  assert.throws(()=>facilityUpgradeCost('__proto__',1),RangeError);
});

test('upgrade spending and insufficient balance stay exact, settle old income, and reject invalid IDs before mutation',()=>{
  const cost=facilityUpgradeCost('operations',19);
  for(const gold of [Number.MAX_SAFE_INTEGER,9007199254740993n,subtractMoney(cost,1),cost,MAX_GOLD-1n]){
    const s=ready('operations',19);s.gold=gold;
    const offer=facilityUpgradeOffer(s,'operations');
    assert.equal(offer.canUpgrade,gold>=cost);
    if(gold<cost)assert.equal(exact(subtractMoney(offer.cost,gold)),exact(cost)-exact(gold));
    assert.equal(upgradeFacility(s,T,'operations').ok,gold>=cost);
    assert.equal(exact(s.gold),exact(gold)-(gold>=cost?exact(cost):0n));
    const restored=parseSave(serializeSave(s),T);assert.ok(restored);assert.equal(restored.gold,s.gold);
    assert.deepEqual(restored.facilityLevels,s.facilityLevels);
  }
  const s=ready('kitchen');s.gold=facilityUpgradeCost('kitchen',1);
  const oldIncome=perSecond(s),before=serializeSave(s);
  assert.throws(()=>upgradeFacility(s,T+1000,'constructor'),RangeError);assert.equal(serializeSave(s),before);
  upgradeFacility(s,T+1000,'kitchen');assert.equal(s.gold,oldIncome);
  const newIncome=perSecond(s);assert.ok(newIncome>oldIncome);
  accrue(s,T+2000);assert.equal(s.gold,oldIncome+newIncome);
  s.gold=MAX_GOLD-1n;assert.equal(tapGold(s,T+2000),1);assert.equal(s.gold,MAX_GOLD);
  assert.equal(parseSave(serializeSave(s),T+2000).gold,MAX_GOLD);
});

test('version25 owned facilities migrate to level one without changing saves or balances',()=>{
  const s=ready('futsal');s.version=25;delete s.facilityLevels;
  s.gold=9007199254740993n;s.equipment.tank={level:13,count:1,deployed:true};
  s.offlineReward={id:T,durationMs:3600000,amount:9007199254740993n};
  const next=parseSave(serializeSave(s),T);assert.ok(next);
  assert.equal(next.version,SAVE_VERSION);assert.deepEqual(next.facilityLevels,{futsal:1});
  for(const key of ['facilities','gold','soldiers','sergeants','equipment','personalLevels','offlineReward'])assert.deepEqual(next[key],s[key]);
  const v24={...s,version:24};delete v24.facilities;
  assert.deepEqual(parseSave(serializeSave(v24),T).facilityLevels,{});
  assert.deepEqual(parseSave(serializeSave(next),T).facilityLevels,{futsal:1});
});

test('version26 rejects missing, extra, unknown or malformed facility levels with diagnostics',()=>{
  for(const levels of [undefined,null,[],{}, {kitchen:0},{kitchen:21},{kitchen:1.5},{kitchen:'2'},
    {kitchen:1,gym:1},{unknown:1},{constructor:1},JSON.parse('{"kitchen":1,"__proto__":1}')]){
    const result=inspectSave(serializeSave({...ready('kitchen'),facilityLevels:levels}),T);
    assert.equal(result.state,null,JSON.stringify(levels));assert.equal(result.issue.field,'facilityLevels');
  }
  const unowned={...freshState(T),facilityLevels:{kitchen:1}};
  assert.equal(inspectSave(serializeSave(unowned),T).issue.field,'facilityLevels');
  for(const level of [1,20])assert.ok(parseSave(serializeSave(ready('kitchen',level)),T));
});

test('maximum facility bonuses survive reload and eight-hour offline settlement without double payment',()=>{
  const s=ready();s.gold=0;s.facilities=FACILITIES.map(f=>f.id);
  s.facilityLevels=Object.fromEntries(s.facilities.map(id=>[id,20]));
  const income=perSecond(s),later=T+12*3600000;
  prepareOfflineReward(s,later);
  assert.equal(exact(s.offlineReward.amount),exact(income)*8n*3600n);
  const restored=parseSave(serializeSave(s),later),id=restored.offlineReward.id;
  assert.equal(perSecond(restored),income);
  const claim=claimOfflineReward(restored,id,2);
  assert.equal(exact(claim.amount),exact(income)*8n*3600n*2n);
  const balance=restored.gold;
  assert.equal(claimOfflineReward(restored,id,2).ok,false);assert.equal(restored.gold,balance);
});
