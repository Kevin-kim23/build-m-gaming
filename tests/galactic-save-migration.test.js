import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, SAVE_KEY, SAVE_VERSION } from '../src/state.js';
import { GALACTIC_OFFICERS } from '../src/galactic-officers.js';
import { EQUIPMENT } from '../src/equipment.js';
import { LEGACY_MAX_GOLD, serializeSave } from '../src/money.js';
import { inspectSave, parseSave } from '../src/save.js';
import { reconcileAchievements } from '../src/achievements.js';
import { GALACTIC_GROUP_COMMAND_SIZE } from '../src/formations.js';

const T=1_800_000_000_000;
function version33() {
  const state={...freshState(T),version:33,gold:LEGACY_MAX_GOLD-1n,soldiers:GALACTIC_GROUP_COMMAND_SIZE-3000,sergeants:300,
    ncoSchoolLevel:5,officerSchoolLevel:5,advancedSchoolLevel:5,commandSchoolLevel:5,
    campaignCleared:80,campaignStars:Array.from({length:80},(_,i)=>i%3+1),
    homeAutoTap:{owned:true,enabled:true,source:'test'},
    facilities:['nexus','futsal'],facilityLevels:{nexus:20,futsal:12},
    offlineReward:{id:T-2000,durationMs:3600000,amount:9_007_199_254_740_993n},
    swordActivatedAt:T-1000,swordDurationMs:220000,autoTouchActivatedAt:T-900,autoTouchDurationMs:250000,autoTouchTicks:3,
    sound:true,sfxVolume:.38,musicVolume:.62,taps:98765,revision:42,incomeRemainder:739,fieldTheme:'concrete'};
  for(const key of Object.keys(state.personalLevels))state.personalLevels[key]=20;
  state.equipment.tank={level:30,count:1,deployed:false};
  state.equipment.orbitalAssault={level:28,count:1,deployed:true};
  state.potions.red={count:7,startedAt:T-10000,expiresAt:T+50000};
  state.potions.blue={count:3,startedAt:null,expiresAt:null};
  delete state.galacticSchoolLevel;
  for(const unit of GALACTIC_OFFICERS)delete state[unit.field];
  for(const item of Object.values(EQUIPMENT))if(item.introducedVersion>=34)delete state.equipment[item.id];
  reconcileAchievements(state);
  return state;
}

test('actual version33 save preserves all prior progression, exact gold and grandfathered auto touch while opening only empty galaxy defaults',()=>{
  const old=version33(),raw=serializeSave(old),loaded=parseSave(raw,T);
  assert.ok(loaded);
  assert.equal(SAVE_KEY,'budae-kiugi-recruits-v3');
  assert.equal(loaded.version,SAVE_VERSION);
  assert.equal(loaded.galacticSchoolLevel,0);
  for(const unit of GALACTIC_OFFICERS)assert.equal(loaded[unit.field],0);
  assert.equal(loaded.campaignStars.length,200);
  assert.deepEqual(loaded.campaignStars.slice(0,80),old.campaignStars);
  assert.deepEqual(loaded.campaignStars.slice(80),Array(120).fill(0));
  for(const [key,value] of Object.entries(old))
    if(!['version','equipment','campaignStars'].includes(key))assert.deepEqual(loaded[key],value,key);
  for(const item of Object.values(EQUIPMENT))
    assert.deepEqual(loaded.equipment[item.id],item.introducedVersion>=34?null:old.equipment[item.id]);
  assert.equal(serializeSave(old),raw,'migration does not mutate the prior save');
  assert.deepEqual(parseSave(serializeSave(loaded),T),loaded);
});

test('legacy progress cannot claim regions beyond the old continent or inject galaxy troops and school levels',()=>{
  const old=version33();
  for(const cleared of [81,100,160]) {
    const result=inspectSave(serializeSave({...old,campaignCleared:cleared}),T);
    assert.equal(result.state,null);assert.equal(result.issue.field,'campaignCleared');
  }
  const longer=inspectSave(serializeSave({...old,campaignStars:[...old.campaignStars,...Array(80).fill(0)]}),T);
  assert.equal(longer.state,null);assert.equal(longer.issue.field,'campaignStars');
  const injected={...old,galacticSchoolLevel:5,...Object.fromEntries(GALACTIC_OFFICERS.map(unit=>[unit.field,56]))};
  const loaded=parseSave(serializeSave(injected),T);
  assert.ok(loaded);assert.equal(loaded.galacticSchoolLevel,0);
  for(const unit of GALACTIC_OFFICERS)assert.equal(loaded[unit.field],0);
});
