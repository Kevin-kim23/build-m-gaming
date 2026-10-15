import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/state.js';
import {equipmentListUpgrade} from '../src/equipment-tiles.js';
import {EQUIPMENT,equipmentStats} from '../src/equipment.js';
import {facilityListPreview} from '../src/facility-panels.js';
import {FACILITIES,facilityEffect,facilityUpgradeCost} from '../src/facilities.js';
import {personalListPreview,personalListEffect} from '../src/personal-panels.js';
import {PERSONAL_EQUIPMENT} from '../src/personal-catalog.js';
import {fmtGold} from '../src/format.js';
import {exact,MAX_GOLD,serializeSave,subtractMoney} from '../src/money.js';

test('military next-upgrade labels use exact differences across every catalog level',()=>{
  for(const item of Object.values(EQUIPMENT))for(let level=0;level<item.maxLevel;level++){
    const before=equipmentStats(level,item.id),after=equipmentStats(level+1,item.id);
    const passive=exact(after.passive)-exact(before.passive),tap=exact(after.tap)-exact(before.tap);
    assert.equal(equipmentListUpgrade(item.id,level),`다음 강화 · 초당 +${fmtGold(passive)} G · 터치 +${fmtGold(tap)} G`);
    assert.ok(passive>0n&&tap>0n);
  }
  for(const item of Object.values(EQUIPMENT))assert.equal(equipmentListUpgrade(item.id,item.maxLevel),'');
});

test('facility preview distinguishes future effects, locked access, next level and exact shortfall without changing state',()=>{
  const state=freshState(1800000000000),before=serializeSave(state);
  for(const facility of FACILITIES){
    const preview=facilityListPreview(state,facility.id);
    assert.equal(preview.effect,`건설 후 · ${facilityEffect(facility,1)}`);
    assert.equal(preview.next,'');
    assert.match(preview.status,new RegExp(facility.rank+' 진급 시 해금'));
  }
  assert.equal(serializeSave(state),before);
  const facility=FACILITIES.find(f=>f.id==='operations');
  state.facilities=[facility.id];state.facilityLevels={[facility.id]:19};
  assert.equal(typeof facilityUpgradeCost(facility.id,19),'bigint');
  state.gold=subtractMoney(facilityUpgradeCost(facility.id,19),1);
  const nearMax=facilityListPreview(state,facility.id);
  assert.equal(nearMax.effect,`현재 · ${facilityEffect(facility,19)}`);
  assert.equal(nearMax.next,`강화 후 · ${facilityEffect(facility,20)}`);
  assert.equal(nearMax.status,'1 G 부족');
  state.gold=MAX_GOLD;state.facilityLevels[facility.id]=20;
  assert.equal(facilityListPreview(state,facility.id).next,'');
  assert.equal(facilityListPreview(state,facility.id).status,'');
});

test('personal previews never claim locked rewards are active or show upgrades past the cap',()=>{
  for(const item of Object.values(PERSONAL_EQUIPMENT)){
    const locked=personalListPreview(item.id,1,false);
    assert.equal(locked.effect,`획득 후 · ${personalListEffect(item.id,1)}`);
    assert.equal(locked.next,'');
    for(const level of [1,item.maxLevel-1]){
      const owned=personalListPreview(item.id,level,true);
      assert.equal(owned.effect,`현재 · ${personalListEffect(item.id,level)}`);
      assert.equal(owned.next,`강화 후 · ${personalListEffect(item.id,level+1)}`);
    }
    assert.equal(personalListPreview(item.id,item.maxLevel,true).next,'');
  }
});
