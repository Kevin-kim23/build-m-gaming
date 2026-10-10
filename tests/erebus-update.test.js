import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,SAVE_VERSION,MAX_ARMY_POWER} from '../src/state.js';
import {parseSave} from '../src/save.js';
import {serializeSave,MAX_GOLD,exact} from '../src/money.js';
import {COUNTRIES,CONTINENTS,campaignStages} from '../src/campaign.js';
import {referenceArmy,simulateBattle} from '../tools/campaign-sim.mjs';
import {CONSTELLATION_POWERS} from '../src/constellation-officers.js';
import {campaignMarkup} from '../src/campaign-map.js';
import {countryRegions,inside} from '../src/campaign-geometry.js';
import {supremeRankSymbol} from '../src/rank-emblem.js';
const T=1800000000000;
test('format37 preserves paid schools, troops, exact wallet and 160 conquests, appending40 empty regions',()=>{
 const s={...freshState(T),version:37,gold:MAX_GOLD-1n,soldiers:5000,sergeants:300,ncoSchoolLevel:5,officerSchoolLevel:5,advancedSchoolLevel:5,commandSchoolLevel:5,galacticSchoolLevel:5,constellationSchoolLevel:5,galacticMarshals:64,constellationBrigadiers:777,campaignCleared:160,campaignStars:Array(160).fill(3)};
 const loaded=parseSave(serializeSave(s),T);assert.ok(loaded);
 for(const k of ['gold','soldiers','sergeants','galacticSchoolLevel','constellationSchoolLevel','galacticMarshals','constellationBrigadiers','campaignCleared'])assert.equal(loaded[k],s[k]);
 assert.equal(loaded.version,SAVE_VERSION);assert.deepEqual(loaded.campaignStars,[...s.campaignStars,...Array(40).fill(0)]);
 assert.deepEqual(parseSave(serializeSave(loaded),T),loaded);
 assert.equal(parseSave(serializeSave({...s,campaignStars:Array(200).fill(0)}),T),null);
});
test('erebus has40 original sequential regions, two contiguous nations and safe navigation',()=>{
 assert.equal(CONTINENTS[2].firstStage,161);assert.equal(CONTINENTS[2].lastStage,200);
 const countries=COUNTRIES.filter(c=>c.continentId==='erebus');assert.equal(countries.length,2);
 for(const c of countries){const regions=countryRegions(c.id);assert.equal(regions.length,20);for(const r of regions)assert.ok(inside(r.point,c.polygon));}
 const s=referenceArmy(campaignStages[179]);s.campaignCleared=160;
 const html=campaignMarkup(s,null,null,null,'erebus');assert.match(html,/루브리온/);assert.match(html,/모르드라스/);
 assert.match(campaignMarkup({...s,campaignCleared:180},'mordrath',181),/장기 도전 지역/);
 assert.ok(exact(campaignStages[199].recommendedPower)<=MAX_ARMY_POWER);
});
test('maximum-rank50강 clears the first20, while all last20 remain long-term siege objectives',()=>{
 for(const stage of campaignStages.slice(160)){
  const s=referenceArmy(stage,{power:CONSTELLATION_POWERS.at(-1),level:50});
  const b=simulateBattle(s,stage.id);
  if(stage.id<=180)assert.equal(b.status,'victory',String(stage.id));
  else {assert.notEqual(b.status,'victory',String(stage.id));assert.equal(stage.longTerm,true);}
 }
 for(const stage of campaignStages.slice(160,180)){
  const b=simulateBattle(referenceArmy(stage),stage.id);
  assert.equal(b.status,'victory',String(stage.id));assert.ok(b.elapsedMs>=90000&&b.elapsedMs<=150000,`${stage.id}:${b.elapsedMs}`);
 }
});
test('three and five ruby stars retain the previous single horizontal row',()=>{
 for(const [tier,count]of [[18,3],[20,5]]){
  const polygons=[...supremeRankSymbol(tier).matchAll(/<polygon data-rank-star[^>]*points="([^"]+)"/g)];
  assert.equal(polygons.length,count);
  const tips=polygons.map(m=>m[1].split(' ')[0].split(',').map(Number));
  assert.equal(new Set(tips.map(p=>p[1])).size,1);
  for(let i=1;i<tips.length;i++)assert.ok(tips[i][0]>tips[i-1][0]);
  assert.match(supremeRankSymbol(tier),/data-metal="ruby"/);
 }
});
test('legacy37 combined galactic cap is still enforced while38 permits further recruitment',()=>{
 const s={...freshState(T),version:37,soldiers:5000,sergeants:300,ncoSchoolLevel:5,officerSchoolLevel:5,advancedSchoolLevel:5,commandSchoolLevel:5,galacticSchoolLevel:5,campaignStars:Array(160).fill(0),galacticMarshals:256};
 assert.equal(parseSave(serializeSave(s),T),null);
 s.version=38;s.campaignStars=Array(200).fill(0);assert.ok(parseSave(serializeSave(s),T));
});
