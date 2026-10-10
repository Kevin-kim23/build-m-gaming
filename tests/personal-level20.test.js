import { LEGACY_MAX_GOLD } from '../src/money.js';
import { serializeLegacySave } from './legacy-save-fixture.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,SAVE_VERSION} from '../src/state.js';
import {RANKS,RANK_REQUIREMENTS} from '../src/ranks.js';
import {PERSONAL_EQUIPMENT} from '../src/personal-catalog.js';
import {personalUpgradeStep,personalUpgradeOffer} from '../src/personal-enhancement.js';
import {enhancePersonalEquipment,enhanceEquipment,recruit,recruitOffer,unitCost,activateSword,activateAutoTouch,accrue,perSecond,baseTapIncome,tapGold,MAX_OFFLINE_MS} from '../src/game.js';
import {equipmentStats,equipmentLevelLimit,equipmentIncome,EQUIPMENT,enhancementOffer} from '../src/equipment.js';
import {equipmentCombatStats} from '../src/battle-balance.js';
import {swordSkillStatus,autoTouchStatus} from '../src/personal-equipment.js';
import {MAX_GOLD,subtractMoney,addMoney,scaleMoney,exact,serializeSave} from '../src/money.js';
import {parseSave} from '../src/save.js';
import {reconcileAchievements} from '../src/achievements.js';
import {personalUpgradeTableMarkup,personalLevelEffect} from '../src/personal-panels.js';
const T=1800000000000;
const army=()=>({...freshState(T),soldiers:RANK_REQUIREMENTS[RANKS.indexOf('특전원수')]-3000,sergeants:300,
  ncoSchoolLevel:5,officerSchoolLevel:5,advancedSchoolLevel:5,gold:MAX_GOLD});

test('all eight items upgrade every paid step exactly once, without random outcomes, up to 20',()=>{
  for(const id of Object.keys(PERSONAL_EQUIPMENT)) {
    const s=army();let previous=0;
    for(let level=1;level<20;level++) {
      const step=personalUpgradeStep(id,level);
      assert.ok(step.cost>previous&&step.cost<MAX_GOLD);previous=step.cost;
      s.gold=step.cost;
      const result=enhancePersonalEquipment(s,T,id,()=>{throw Error('RNG must never run');});
      assert.equal(result.ok,true);assert.equal(result.success,true);
      assert.equal(s.gold,0);assert.equal(s.personalLevels[id],level+1);
      assert.equal(parseSave(serializeSave(s),T).personalLevels[id],level+1);
    }
    s.gold=MAX_GOLD;const before=structuredClone(s);
    assert.equal(enhancePersonalEquipment(s,T,id).reason,'max');assert.deepEqual(s,before);
    s.personalLevels[id]=19;const cost=personalUpgradeStep(id,19).cost;
    s.gold=subtractMoney(cost,1);const poor=structuredClone(s);
    assert.equal(enhancePersonalEquipment(s,T,id).reason,'gold');assert.deepEqual(s,poor);
    assert.equal(enhancePersonalEquipment(freshState(T),T,id).reason,'locked');
    assert.throws(()=>personalUpgradeStep(id,20),RangeError);
    assert.equal(personalUpgradeStep(id,9).cost,PERSONAL_EQUIPMENT[id].baseUpgradeCost*256);
    for(let level=11;level<20;level++)assert.equal(personalUpgradeStep(id,level).cost,scaleMoney(personalUpgradeStep(id,level-1).cost,8,5));
    const table=personalUpgradeTableMarkup(id).body;
    assert.doesNotMatch(table,/undefined|NaN|확률|성공|실패/);
    assert.match(table,/Lv.19 → 20/);assert.ok(table.includes(personalLevelEffect(id,20)));
  }
});

test('v29 preserves earned levels, exact wallet, equipment and running windows; v30 validates new caps',()=>{
  const old=army();old.version=29;old.gold=LEGACY_MAX_GOLD-1n;
  for(const id of Object.keys(old.personalLevels))old.personalLevels[id]=10;
  old.equipment.tank={level:20,count:1,deployed:true};
  old.swordActivatedAt=T-1000;old.swordDurationMs=120000;
  old.autoTouchActivatedAt=T-1000;old.autoTouchDurationMs=150000;old.autoTouchTicks=3;
  old.campaignCleared=80;old.campaignStars.fill(3,0,80);
  old.offlineReward={id:T-2000,durationMs:3600000,amount:12345678901234567n};
  reconcileAchievements(old);
  const restored=parseSave(serializeLegacySave(old),T);
  assert.deepEqual(restored,{...old,version:SAVE_VERSION});
  for(const id of Object.keys(restored.personalLevels))restored.personalLevels[id]=20;
  restored.equipment.tank.level=30;restored.swordDurationMs=220000;restored.autoTouchDurationMs=250000;
  assert.deepEqual(parseSave(serializeSave(restored),T),restored);
  for(const key of Object.keys(restored.personalLevels)) {
    const bad=structuredClone(restored);bad.personalLevels[key]=21;
    assert.equal(parseSave(serializeSave(bad),T),null,key);
  }
  const badGear=structuredClone(restored);badGear.equipment.tank.level=31;
  assert.equal(parseSave(serializeSave(badGear),T),null);
  for(const patch of [{personalLevels:restored.personalLevels},{equipment:restored.equipment},
    {swordDurationMs:220000},{autoTouchDurationMs:250000}])assert.equal(parseSave(serializeLegacySave({...old,...patch}),T),null);
});

test('flag advances each military cap through 30; all gear gains income, firepower or healing and speed',()=>{
  const s=army();
  for(const id of Object.keys(EQUIPMENT)) {
    s.equipment[id]={level:20,count:1,deployed:true};
    for(let level=11;level<=20;level++) {
      s.personalLevels.divisionFlag=level;s.gold=MAX_GOLD;
      assert.equal(equipmentLevelLimit(s),level+10);
      const before=equipmentStats(level+9,id),combat=equipmentCombatStats(id,level+9);
      const offer=enhancementOffer(s,id),cost=offer.cost;
      assert.equal(enhanceEquipment(s,T,id).level,level+10);
      assert.equal(s.gold,subtractMoney(MAX_GOLD,cost));
      assert.equal(enhanceEquipment(s,T,id).reason,'max');
      const after=equipmentStats(level+10,id),nextCombat=equipmentCombatStats(id,level+10);
      assert.ok(after.passive>before.passive&&after.tap>before.tap);
      assert.ok((nextCombat.healing??nextCombat.damage)>(combat.healing??combat.damage));
      assert.ok(nextCombat.intervalMs<=combat.intervalMs);
    }
    assert.equal(equipmentStats(30,id).passive,EQUIPMENT[id].passive*34);
  }
});

test('baton adds five advanced officer batches and preserves exact batch prices at levels16..20',()=>{
  const s=army();
  for(const [i,id] of ['colonel','brigadierGeneral','majorGeneral','lieutenantGeneral','general'].entries()) {
    s.personalLevels.commandBaton=10+i;assert.equal(recruitOffer(s,id,100).reason,'locked');
    s.personalLevels.commandBaton=11+i;assert.equal(recruitOffer(s,id,100).canBuy,true);
  }
  s.soldiers=20_000_000; // Leaves capacity for the largest batch while retaining school access.
  const base=Array.from({length:100},(_,i)=>unitCost(s.soldiers+i,'soldier')).reduce(addMoney,0);
  assert.equal(typeof base,'bigint');
  for(let level=15;level<=20;level++) {
    s.personalLevels.commandBaton=level;
    assert.equal(recruitOffer(s,'soldier',100).cost,base);
    assert.equal(recruitOffer(s,'soldier').cost,unitCost(s.soldiers,'soldier'));
  }
  const quote=recruitOffer(s,'soldier',100).cost;s.gold=subtractMoney(quote,1);
  assert.equal(recruit(s,T,'soldier',100).reason,'gold');s.gold=quote;
  assert.equal(recruit(s,T,'soldier',100).ok,true);assert.equal(s.gold,0);assert.equal(s.soldiers,20_000_100);
  s.personalLevels.commandBaton=20;s.advancedSchoolLevel=0;s.gold=MAX_GOLD;
  assert.equal(recruit(s,T,'colonel',100).reason,'locked');
});

test('level20 active skills snapshot duration and settle exactly once across reload and rollback',()=>{
  const s=army();s.personalLevels.generalSword=19;s.personalLevels.generalRevolver=19;
  activateSword(s,T);activateAutoTouch(s,T);
  enhancePersonalEquipment(s,T,'generalSword');enhancePersonalEquipment(s,T,'generalRevolver');
  assert.equal(swordSkillStatus(s,T).durationMs,210000);assert.equal(autoTouchStatus(s,T).durationMs,240000);
  accrue(s,T+1800000);activateSword(s,T+1800000);activateAutoTouch(s,T+1800000);s.gold=0;
  assert.equal(s.swordDurationMs,220000);assert.equal(s.autoTouchDurationMs,250000);
  const expected=exact(perSecond(s))*250n+exact(baseTapIncome(s))*(833n+733n);
  accrue(s,T+2050000);assert.equal(s.autoTouchTicks,833);assert.equal(exact(s.gold),expected);
  const restored=parseSave(serializeSave(s),s.lastAccrual);
  accrue(restored,s.lastAccrual);accrue(restored,T);assert.equal(restored.gold,s.gold);
});

test('maximum personal and military gear preserves exact eight-hour income and wallet cap',()=>{
  const s=army();s.gold=0;
  for(const id of Object.keys(s.personalLevels))s.personalLevels[id]=20;
  for(const id of Object.keys(EQUIPMENT))s.equipment[id]={level:30,count:100000,deployed:true};
  reconcileAchievements(s);
  const gear=equipmentIncome(s);
  for(const kind of ['passive','tap']) {
    const raw=Object.values(EQUIPMENT).reduce((sum,d)=>sum+BigInt(d[kind])*34n*100000n,0n);
    assert.equal(exact(gear[kind]),raw>MAX_GOLD?MAX_GOLD:raw);
  }
  const expected=exact(perSecond(s))*BigInt(MAX_OFFLINE_MS)/1000n;
  accrue(s,T+MAX_OFFLINE_MS*2);assert.equal(exact(s.gold),expected>MAX_GOLD?MAX_GOLD:expected);
  assert.deepEqual(parseSave(serializeSave(s),s.lastAccrual),s);
  s.gold=MAX_GOLD-1n;assert.equal(tapGold(s,s.lastAccrual),1);assert.equal(s.gold,MAX_GOLD);
});
