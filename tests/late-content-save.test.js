import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, SAVE_VERSION } from '../src/state.js';
import { inspectSave, parseSave } from '../src/save.js';
import { MAX_GOLD, serializeSave } from '../src/money.js';
import { RANKS, RANK_REQUIREMENTS } from '../src/ranks.js';
import { personalStatus } from '../src/personal-equipment.js';
import { personalAwardsBetween } from '../src/personal-awards.js';
const T=1_800_000_000_000;
const gearIds=['carrier','flyingFortress','orbitalAssault'];
const personalIds=['admiralsCompass','strategicTablet','supremeSeal'];
const army=()=>({...freshState(T),soldiers:RANK_REQUIREMENTS[RANKS.indexOf('대원수')]-3000,sergeants:300,gold:MAX_GOLD-1n});

test('version26 adds only new gear defaults, preserves all paid assets and pending return reward',()=>{
  const old=army();old.version=26;
  for(const id of gearIds)delete old.equipment[id];
  for(const id of personalIds)delete old.personalLevels[id];
  old.equipment.icbm={level:19,count:1,deployed:false};old.personalLevels.generalSword=8;
  old.facilities=['futsal','kitchen'];old.facilityLevels={futsal:20,kitchen:7};
  old.offlineReward={id:T,durationMs:28_800_000,amount:9007199254740993n};
  const next=parseSave(serializeSave(old),T);assert.ok(next);assert.equal(next.version,SAVE_VERSION);
  for(const field of ['gold','soldiers','sergeants','facilities','facilityLevels','offlineReward','lastAccrual','campaignStars'])assert.deepEqual(next[field],old[field]);
  for(const [id,value] of Object.entries(old.equipment))assert.deepEqual(next.equipment[id],value);
  for(const [id,value] of Object.entries(old.personalLevels))assert.equal(next.personalLevels[id],value);
  for(const id of gearIds)assert.equal(next.equipment[id],null);
  for(const id of personalIds){assert.equal(next.personalLevels[id],1);assert.equal(personalStatus(next,id).owned,true);}
  assert.deepEqual(parseSave(serializeSave(next),T),next);
});

test('new military ownership and personal upgrades survive exact large-gold reload; malformed additions fail closed',()=>{
  const state=army();
  for(const id of gearIds)state.equipment[id]={level:20,count:1,deployed:true};
  for(const id of personalIds)state.personalLevels[id]=10;
  const restored=parseSave(serializeSave(state),T);assert.ok(restored);
  for(const id of gearIds)assert.deepEqual(restored.equipment[id],state.equipment[id]);
  for(const id of personalIds)assert.equal(restored.personalLevels[id],10);
  assert.equal(restored.gold,MAX_GOLD-1n);
  for(const id of gearIds){const bad=structuredClone(state);delete bad.equipment[id];assert.equal(inspectSave(serializeSave(bad),T).issue?.field,'equipment');}
  for(const id of personalIds)for(const value of [undefined,0,11,1.5]){
    const bad=structuredClone(state);bad.personalLevels[id]=value;
    assert.equal(inspectSave(serializeSave(bad),T).issue?.field,`personalLevels.${id}`);
  }
});

test('new promotion rewards include all three late ranks and never replay them at the same rank',()=>{
  const rank=name=>RANKS.indexOf(name);
  assert.deepEqual(personalAwardsBetween(rank('준원수'),rank('대원수')).map(item=>item.id),personalIds);
  for(const [i,name] of ['소원수','중원수','대원수'].entries()){
    assert.deepEqual(personalAwardsBetween(rank(name)-1,rank(name)).map(item=>item.id),[personalIds[i]]);
    assert.deepEqual(personalAwardsBetween(rank(name),rank(name)),[]);
  }
});
