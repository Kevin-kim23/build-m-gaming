import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/state.js';
import {parseSave} from '../src/save.js';
import {serializeSave,MAX_GOLD,exact,subtractMoney} from '../src/money.js';
import {PERSONAL_EQUIPMENT} from '../src/personal-catalog.js';
import {personalUpgradeStep,personalUpgradeOffer} from '../src/personal-enhancement.js';
import {EQUIPMENT,enhancementCost,equipmentStage} from '../src/equipment.js';
import {enhanceEquipment,enhancePersonalEquipment} from '../src/game.js';
const T=1800000000000;
const army=()=>({...freshState(T),soldiers:10000,sergeants:300,galacticMarshals:64});
test('only the division flag reaches40, all quotes fit the exact wallet cap',()=>{
 for(const item of Object.values(PERSONAL_EQUIPMENT))assert.equal(item.maxLevel,item.id==='divisionFlag'?40:30);
 const s=army();s.personalLevels.divisionFlag=30;
 let previous=exact(personalUpgradeStep('divisionFlag',29).cost);
 for(let level=30;level<40;level++){
  const cost=personalUpgradeStep('divisionFlag',level).cost;
  assert.ok(exact(cost)>previous&&cost<=MAX_GOLD);previous=exact(cost);
  s.gold=subtractMoney(cost,1);assert.equal(enhancePersonalEquipment(s,T,'divisionFlag').reason,'gold');
  s.gold=cost;assert.equal(enhancePersonalEquipment(s,T,'divisionFlag').ok,true);assert.equal(s.gold,0);
  assert.equal(parseSave(serializeSave(s),T).personalLevels.divisionFlag,level+1);
 }
 assert.equal(personalUpgradeOffer(s,'divisionFlag').reason,'max');
});
test('all17 military weapons upgrade41..50 and stop without charging at50',()=>{
 for(const id of Object.keys(EQUIPMENT)){
  const s=army();s.personalLevels.divisionFlag=40;s.equipment[id]={level:40,count:1,deployed:true};
  let previous=exact(enhancementCost(39,id));
  for(let level=40;level<50;level++){
   const cost=enhancementCost(level,id);assert.ok(exact(cost)>previous&&cost<=MAX_GOLD);previous=exact(cost);
   s.gold=subtractMoney(cost,1);assert.equal(enhanceEquipment(s,T,id).reason,'gold');
   s.gold=cost;assert.equal(enhanceEquipment(s,T,id).ok,true);assert.equal(s.gold,0);
   assert.ok(equipmentStage(id,level+1));assert.equal(parseSave(serializeSave(s),T).equipment[id].level,level+1);
  }
  s.gold=MAX_GOLD-1n;assert.equal(enhanceEquipment(s,T,id).reason,'max');assert.equal(s.gold,MAX_GOLD-1n);
 }
});
test('save35 preserves40강 but cannot claim new flag40 or military50',()=>{
 const s=army();s.version=35;s.campaignStars=Array(160).fill(0);s.personalLevels.divisionFlag=30;s.equipment.tank={level:40,count:1,deployed:true};
 assert.equal(parseSave(serializeSave(s),T).equipment.tank.level,40);
 s.personalLevels.divisionFlag=31;assert.equal(parseSave(serializeSave(s),T),null);
 s.personalLevels.divisionFlag=30;s.equipment.tank.level=41;assert.equal(parseSave(serializeSave(s),T),null);
});
