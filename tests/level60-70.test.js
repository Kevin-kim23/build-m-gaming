import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,SAVE_VERSION} from '../src/state.js';
import {parseSave} from '../src/save.js';
import {serializeSave,MAX_GOLD,exact,subtractMoney} from '../src/money.js';
import {PERSONAL_EQUIPMENT,GENERAL_SWORD,AUTO_TOUCH} from '../src/personal-catalog.js';
import {personalUpgradeStep,personalUpgradeOffer} from '../src/personal-enhancement.js';
import {enhancementLimitForFlag} from '../src/personal-equipment.js';
import {EQUIPMENT,enhancementCost,equipmentStage,equipmentLevelLimit} from '../src/equipment.js';
import {equipmentCombatPower} from '../src/battle-balance.js';
import {enhanceEquipment,enhancePersonalEquipment} from '../src/game.js';
import {personalIcon} from '../src/personal-art.js';

// 0.77.0: 지휘봉 제외 개인 장비 Lv.60, 군사 장비 Lv.70. 시험용 기록만 쓴다.
const T=1800000000000;
const army=()=>({...freshState(T),soldiers:10000,sergeants:300,galacticMarshals:64});

test('personal gear: baton stays Lv.30, the other seven reach Lv.60 with exact 5/4 steps inside the wallet',()=>{
  for(const item of Object.values(PERSONAL_EQUIPMENT))assert.equal(item.maxLevel,item.id==='commandBaton'?30:60);
  for(const item of Object.values(PERSONAL_EQUIPMENT).filter(item=>item.maxLevel===60)){
    const from=item.id==='divisionFlag'?40:30;
    for(let level=from;level<60;level++){
      const before=exact(personalUpgradeStep(item.id,level-1).cost),cost=exact(personalUpgradeStep(item.id,level).cost);
      assert.equal(cost,before*5n/4n,`${item.id} ${level}`);
    }
    assert.ok(exact(personalUpgradeStep(item.id,59).cost)<MAX_GOLD);
  }
  assert.equal(exact(personalUpgradeStep('supremeSeal',30).cost),640_000_000_000_000_000_000n);
  assert.equal(enhancementLimitForFlag(60),70);
});

test('a Lv.59 upgrade charges exactly, refuses 1 G short, survives reload and then stops at max',()=>{
  const s=army();s.personalLevels.supremeSeal=59;
  const {cost}=personalUpgradeStep('supremeSeal',59);
  s.gold=subtractMoney(cost,1);assert.equal(enhancePersonalEquipment(s,T,'supremeSeal').reason,'gold');
  s.gold=MAX_GOLD-1n;assert.equal(enhancePersonalEquipment(s,T,'supremeSeal').ok,true);
  assert.equal(s.gold,MAX_GOLD-1n-exact(cost));
  const loaded=parseSave(serializeSave(s),T);assert.equal(loaded.personalLevels.supremeSeal,60);assert.equal(loaded.gold,s.gold);
  assert.equal(personalUpgradeOffer(loaded,'supremeSeal').reason,'max');
});

test('military gear climbs 51..70 behind a Lv.60 flag with rising payable prices and new stage names',()=>{
  for(const id of Object.keys(EQUIPMENT)){
    const s=army();s.personalLevels.divisionFlag=60;s.equipment[id]={level:50,count:1,deployed:true};
    assert.equal(equipmentLevelLimit(s),70);
    let previous=exact(enhancementCost(49,id));
    for(let level=50;level<70;level++){
      const cost=enhancementCost(level,id);assert.ok(exact(cost)>previous&&cost<MAX_GOLD,`${id} ${level}`);previous=exact(cost);
      s.gold=subtractMoney(cost,1);assert.equal(enhanceEquipment(s,T,id).reason,'gold');
      s.gold=cost;assert.equal(enhanceEquipment(s,T,id).ok,true);assert.equal(s.gold,0);
    }
    assert.equal(parseSave(serializeSave(s),T).equipment[id].level,70);
    s.gold=MAX_GOLD-1n;assert.equal(enhanceEquipment(s,T,id).reason,'max');assert.equal(s.gold,MAX_GOLD-1n);
  }
  const names=Array.from({length:20},(_,i)=>equipmentStage('tank',51+i));
  assert.equal(new Set(names).size,20);assert.equal(names.at(-1),'최종 초신성 사양');
});

test('Lv.70 gear is at least twice as strong in battle as Lv.50, and each level adds power',()=>{
  for(const id of Object.keys(EQUIPMENT)){
    for(let level=51;level<=70;level++)assert.ok(equipmentCombatPower(id,level)>=equipmentCombatPower(id,level-1),`${id} ${level}`);
    assert.ok(equipmentCombatPower(id,70)>=equipmentCombatPower(id,50)*2,id);
  }
});

test('save43 keeps Lv.30/flag 40/military 50 and cannot claim the new caps; save44 round-trips them',()=>{
  const old=army();old.version=43;old.gold=MAX_GOLD-1n;
  for(const id of Object.keys(old.personalLevels))old.personalLevels[id]=id==='divisionFlag'?40:30;
  old.equipment.tank={level:50,count:1,deployed:true};
  old.swordDurationMs=GENERAL_SWORD.durationMs+29*GENERAL_SWORD.durationStepMs;
  const loaded=parseSave(serializeSave(old),T);
  assert.equal(loaded.version,SAVE_VERSION);assert.equal(loaded.gold,old.gold);
  assert.deepEqual(loaded.personalLevels,old.personalLevels);assert.deepEqual(loaded.equipment.tank,old.equipment.tank);
  for(const patch of [{personalLevels:{...old.personalLevels,generalSword:31}},{personalLevels:{...old.personalLevels,divisionFlag:41}},
    {equipment:{...old.equipment,tank:{level:51,count:1,deployed:true}}},{swordDurationMs:old.swordDurationMs+GENERAL_SWORD.durationStepMs}])
    assert.equal(parseSave(serializeSave({...old,...patch}),T),null);
  for(const id of Object.keys(loaded.personalLevels))loaded.personalLevels[id]=id==='commandBaton'?30:60;
  loaded.equipment.tank.level=70;
  loaded.swordDurationMs=GENERAL_SWORD.durationMs+59*GENERAL_SWORD.durationStepMs;
  loaded.autoTouchDurationMs=AUTO_TOUCH.durationMs+59*AUTO_TOUCH.durationStepMs;
  assert.deepEqual(parseSave(serializeSave(loaded),T),loaded);
  for(const patch of [{personalLevels:{...loaded.personalLevels,commandBaton:31}},{personalLevels:{...loaded.personalLevels,generalSword:61}},
    {equipment:{...loaded.equipment,tank:{level:71,count:1,deployed:true}}}])
    assert.equal(parseSave(serializeSave({...loaded,...patch}),T),null);
});

test('personal art keeps adding detail above Lv.30 and is cached per level',()=>{
  for(const kind of ['sword','flag','revolver','glaive','compass','seal']){
    assert.notEqual(personalIcon(kind,45),personalIcon(kind,30),kind);
    assert.notEqual(personalIcon(kind,60),personalIcon(kind,45),kind);
    assert.equal(personalIcon(kind,60),personalIcon(kind,99),'clamped to Lv.60');
  }
});
