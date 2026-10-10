import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/state.js';
import {GALACTIC_OFFICERS} from '../src/galactic-officers.js';
import {CONSTELLATION_OFFICERS} from '../src/constellation-officers.js';
import {COMMAND_OFFICERS} from '../src/command-officers.js';
import {recruitOffer} from '../src/game.js';
import {MAX_GOLD} from '../src/money.js';

test('prebuilt late academies cannot recruit above the player rank',()=>{
 const s={...freshState(),gold:MAX_GOLD,soldiers:10000,sergeants:300,commandSchoolLevel:5,galacticSchoolLevel:5,constellationSchoolLevel:5};
 for(const unit of [...COMMAND_OFFICERS,...GALACTIC_OFFICERS,...CONSTELLATION_OFFICERS])assert.equal(recruitOffer(s,unit.id).reason,'locked',unit.name);
});
import {RANKS,rankForArmy} from '../src/ranks.js';
import {schoolOffer} from '../src/schools.js';
import {referenceArmy} from '../tools/campaign-sim.mjs';
import {campaignStages} from '../src/campaign.js';
import {parseSave} from '../src/save.js';
import {serializeSave,exact,subtractMoney} from '../src/money.js';
import {recruit} from '../src/game.js';
test('each late academy and prebuilt recruitment unlock exactly at its named player rank',()=>{
 for(const u of [...COMMAND_OFFICERS,...GALACTIC_OFFICERS,...CONSTELLATION_OFFICERS]){
  const s=referenceArmy(campaignStages[0],{power:u.recruitRankPower});Object.assign(s,{gold:MAX_GOLD,ncoSchoolLevel:5,officerSchoolLevel:5,advancedSchoolLevel:5,commandSchoolLevel:5,galacticSchoolLevel:5,constellationSchoolLevel:5});
  const field={command:'commandSchoolLevel',galactic:'galacticSchoolLevel',constellation:'constellationSchoolLevel'}[u.school];
  assert.equal(RANKS[rankForArmy(s)],u.name);assert.equal(recruitOffer(s,u.id).locked,false);
  s[field]=u.schoolLevel-1;assert.equal(schoolOffer(s,u.school).reason,null);
  s.soldiers--;assert.equal(schoolOffer(s,u.school).reason,'locked');s[field]=5;assert.equal(recruitOffer(s,u.id).locked,true);
 }
});
test('galactic marshal recruits can bridge the sixteenfold boundary and round-trip beyond the former legacy cap',()=>{
 const u=GALACTIC_OFFICERS[4],s=referenceArmy(campaignStages[159],{power:u.recruitRankPower});Object.assign(s,{gold:MAX_GOLD,ncoSchoolLevel:5,officerSchoolLevel:5,advancedSchoolLevel:5,commandSchoolLevel:5,galacticSchoolLevel:5});
 for(let i=0;i<960;i++)assert.equal(recruit(s,1800000000000,u.id).ok,true);
 assert.equal(RANKS[rankForArmy(s)],'은하단 준장');assert.ok(parseSave(serializeSave(s),1800000000000));
});
import {upgradeSchool} from '../src/game.js';
test('raised academy prices charge exactly, reject one-gold shortfalls and preserve paid levels',()=>{
 const catalogs=[COMMAND_OFFICERS,GALACTIC_OFFICERS,CONSTELLATION_OFFICERS];
 const previousBases=[10000000000000000n,10000000000000000n,5000000000000000000000n];
 for(const [group,units] of catalogs.entries())for(const [i,u]of units.entries()){
  const expected=group===0?previousBases[0]*4n**BigInt(i)*5n:group===1?previousBases[1]*[120n,240n,400n,640n,900n][i]*5n:previousBases[2]*2n**BigInt(i)*10n;
  assert.equal(exact(u.academyCost),expected);
  const s=referenceArmy(campaignStages[0],{power:u.recruitRankPower});Object.assign(s,{ncoSchoolLevel:5,officerSchoolLevel:5,advancedSchoolLevel:5,commandSchoolLevel:5,galacticSchoolLevel:5,constellationSchoolLevel:0});
  const field={command:'commandSchoolLevel',galactic:'galacticSchoolLevel',constellation:'constellationSchoolLevel'}[u.school];s[field]=i;
  // Only schools through the one being tested have been constructed.
  if(group===0)s.galacticSchoolLevel=0;
  s.gold=subtractMoney(u.academyCost,1);const before=serializeSave(s);
  assert.equal(upgradeSchool(s,1800000000000,u.school).reason,'gold');assert.equal(serializeSave(s),before);
  s.gold=u.academyCost;assert.equal(upgradeSchool(s,1800000000000,u.school).ok,true);assert.equal(s.gold,0);
  assert.equal(parseSave(serializeSave(s),1800000000000)[field],i+1);
 }
});
test('constellation recruitment prices grow smoothly across the960-person promotion range with exact bulk settlement',()=>{
 for(const u of CONSTELLATION_OFFICERS){
  const [base,linear,quadratic]=u.price.map(exact);
  assert.ok(linear*1600n<=base&&quadratic*2560000n<=base);
  for(const count of [63,64,65,959,960,961]){
   const n=BigInt(count),cost=unitCost(count,u.id);assert.equal(exact(cost),base+linear*n+quadratic*n*n);
   assert.ok(exact(unitCost(count+1,u.id))>exact(cost));
  }
  const s=referenceArmy(campaignStages[199],{power:CONSTELLATION_OFFICERS.at(-1).recruitRankPower});
  Object.assign(s,{ncoSchoolLevel:5,officerSchoolLevel:5,advancedSchoolLevel:5,commandSchoolLevel:5,galacticSchoolLevel:5,constellationSchoolLevel:5});s.personalLevels.commandBaton=30;const owned=u===CONSTELLATION_OFFICERS.at(-1)?100:700;s[u.field]=owned;
  const quote=Array.from({length:100},(_,i)=>exact(unitCost(owned+i,u.id))).reduce((a,b)=>a+b,0n);
  s.gold=quote-1n;const before=serializeSave(s);assert.equal(recruit(s,1800000000000,u.id,100).reason,'gold');assert.equal(serializeSave(s),before);
  s.gold=quote;assert.equal(recruit(s,1800000000000,u.id,100).ok,true);assert.equal(s.gold,0);assert.equal(s[u.field],owned+100);
  const loaded=parseSave(serializeSave(s),1800000000000);assert.equal(loaded[u.field],owned+100);assert.equal(loaded.gold,0);
 }
});
import {unitCost} from '../src/game.js';
