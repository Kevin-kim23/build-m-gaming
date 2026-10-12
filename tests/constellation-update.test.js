import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,MAX_ARMY_POWER,MAX_SOLDIERS} from '../src/state.js';
import {CONSTELLATION_OFFICERS as OFFICERS,CONSTELLATION_POWERS} from '../src/constellation-officers.js';
import {RANKS,rankFor,rankForArmy,promotionProgress} from '../src/ranks.js';
import {armyPower} from '../src/units.js';
import {recruit,recruitOffer,upgradeSchool} from '../src/game.js';
import {schoolOffer} from '../src/schools.js';
import {parseSave} from '../src/save.js';
import {exact,MAX_GOLD,GALACTIC_MAX_GOLD,serializeSave} from '../src/money.js';
import {equipmentCombatStats,equipmentCombatPower,UNIT_TRAITS,CLASS_BEATS} from '../src/battle-balance.js';
import {EQUIPMENT} from '../src/equipment.js';
import {chooseEnemyDeployment} from '../src/battle-ai.js';
import {recordBattleVictory} from '../src/battle-progress.js';
import {fixedStageGold,replayRemaining,rewardDay} from '../src/campaign-rewards.js';
import {galacticRankBadge} from '../src/rank-frame.js';
import {schoolIcon} from '../src/school-art.js';
import {layoutFieldArmy} from '../src/field-layout.js';
const T=1800000000000;
function armyAt(power){
 const s={...freshState(T),gold:MAX_GOLD,sergeants:300,ncoSchoolLevel:5,officerSchoolLevel:5,advancedSchoolLevel:5,commandSchoolLevel:5,galacticSchoolLevel:5,constellationSchoolLevel:5};
 let left=exact(power)-8000n;
 for(const u of [...OFFICERS].reverse()){s[u.field]=Number(left/u.power);left%=u.power;}
 s.soldiers=Number(left)+5000;return s;
}
test('new five thresholds are exactly sixteenfold, including the final one-power boundary',()=>{
 let previous=43980465111040n;
 for(const [i,power] of CONSTELLATION_POWERS.entries()){
  assert.equal(power,previous*16n);previous=power;
  assert.equal(rankFor(power-1n),29+i);assert.equal(rankFor(power),30+i);
  const s=armyAt(power-1n);assert.equal(exact(armyPower(s)),power-1n);assert.equal(rankForArmy(s),29+i);
  assert.ok(Number.isFinite(promotionProgress(s).ratio));
  const before=s.soldiers;assert.equal(recruit(s,T).ok,true);assert.equal(s.soldiers,before+1);assert.equal(rankForArmy(s),30+i);
  assert.deepEqual(parseSave(serializeSave(s),T),s);
 }
 const max=armyAt(MAX_ARMY_POWER);assert.equal(recruitOffer(max,OFFICERS[4].id).reason,'limit');
 assert.ok(layoutFieldArmy(max,{x:0,y:0,width:360,height:200}).length<40);
});
test('new academy requires sequential levels and its own rank; 100 recruits charge every gold',()=>{
 for(const [i,u] of OFFICERS.entries()){
  const s=armyAt(CONSTELLATION_POWERS[i]);s.constellationSchoolLevel=i;
  const cost=schoolOffer(s,'constellation').cost;s.gold=cost;
  assert.equal(upgradeSchool(s,T,'constellation').ok,true);assert.equal(s.gold,0);
  const lower=armyAt((CONSTELLATION_POWERS[i])-1n);lower.constellationSchoolLevel=i;
  assert.equal(schoolOffer(lower,'constellation').reason,'locked');
  s.personalLevels.commandBaton=26+i;s.gold=MAX_GOLD;const quote=recruitOffer(s,u.id,100);assert.equal(quote.canBuy,true);assert.ok(quote.cost<MAX_GOLD);
  s.gold=exact(quote.cost)-1n;const before=serializeSave(s);assert.equal(recruit(s,T,u.id,100).reason,'gold');assert.equal(serializeSave(s),before);
  s.gold=quote.cost;const old=s[u.field];assert.equal(recruit(s,T,u.id,100).ok,true);assert.equal(s[u.field],old+100);assert.equal(s.gold,0);
  assert.deepEqual(parseSave(serializeSave(s),T),s);
 }
});
test('v36 migration preserves paid assets and wallet; v37 handles the expanded exact cap',()=>{
 const s={...freshState(T),version:36,campaignStars:Array(160).fill(0),gold:GALACTIC_MAX_GOLD-1n};s.personalLevels.divisionFlag=40;s.equipment.tank={level:50,count:1,deployed:true};
 const restored=parseSave(serializeSave(s),T);assert.equal(restored.gold,s.gold);assert.deepEqual(restored.equipment,s.equipment);assert.equal(restored.constellationSchoolLevel,0);
 for(const u of OFFICERS)assert.equal(restored[u.field],0);
 restored.gold=MAX_GOLD-1n;assert.deepEqual(parseSave(serializeSave(restored),T),restored);
 assert.equal(parseSave(serializeSave({...restored,gold:MAX_GOLD+1n}),T),null);
 assert.equal(parseSave(serializeSave({...restored,constellationSchoolLevel:1,galacticSchoolLevel:4}),T),null);
});
test('all 17 weapons gain combat power at every level and never scale with recruits or legacy copies',()=>{
 for(const id of Object.keys(EQUIPMENT))for(let level=0;level<=50;level++){
  assert.deepEqual(equipmentCombatStats(id,level,320,1),equipmentCombatStats(id,level,MAX_ARMY_POWER,100000));
  if(level)assert.ok(equipmentCombatPower(id,level)>equipmentCombatPower(id,level-1),`${id}+${level}`);
 }
});
test('enemy counters the threatened lane but cannot spend absent mana or ignore cooldown',()=>{
 const b={elapsedMs:20000,stageId:20,player:{units:[{lane:2,cls:'armor',damage:100,intervalMs:1000,hp:100,x:800}]},enemy:{units:[],spawned:0,mana:100,ready:{}}};
 assert.deepEqual(chooseEnemyDeployment(b,['tank','helicopter'],UNIT_TRAITS,CLASS_BEATS),{id:'helicopter',lane:2});
 b.enemy.ready.helicopter=30000;assert.equal(chooseEnemyDeployment(b,['tank','helicopter'],UNIT_TRAITS,CLASS_BEATS).id,'tank');
 b.enemy.mana=0;assert.equal(chooseEnemyDeployment(b,['tank','helicopter'],UNIT_TRAITS,CLASS_BEATS),null);
});
test('fixed first clear and ten global daily replays persist across reload and clock rollback',()=>{
 const s={...freshState(T),soldiers:320};s.equipment.artillery={level:0,count:1,deployed:true};const win=id=>({stageId:id,status:'victory',elapsedMs:100000,enemy:{hq:{hp:0}},player:{hq:{hp:100,maxHp:100}}});
 assert.equal(recordBattleVictory(s,win(1),T).gold,fixedStageGold(1));assert.equal(recordBattleVictory(s,win(2),T).firstClear,true);
 for(let i=0;i<10;i++)assert.ok(recordBattleVictory(s,win(i%2+1),T).gold>0);
 assert.equal(replayRemaining(s,T),0);assert.equal(recordBattleVictory(s,win(1),T).gold,0);
 const copy=parseSave(serializeSave(s),T);assert.equal(replayRemaining(copy,T),0);assert.equal(replayRemaining(copy,T-86400000),0);
 assert.equal(replayRemaining(copy,T+86400000),10);assert.ok(recordBattleVictory(copy,win(2),T+86400000).gold>0);assert.equal(copy.replayRewardCount,1);
 assert.equal(rewardDay(Date.UTC(2026,9,10,15)),rewardDay(Date.UTC(2026,9,10,14,59,59))+1);
});
test('five new obsidian ruby rank badges and academy levels have resolved SVG IDs',()=>{
 for(let tier=16;tier<=20;tier++){
  const html=galacticRankBadge(tier);assert.match(html,/obsidian-ruby/);assert.equal((html.match(/data-rank-star/g)||[]).length,tier-15);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
  for(const [,id] of html.matchAll(/url\(#([^)]*)\)/g))assert.ok(ids.includes(id));
  assert.doesNotMatch(html,/undefined|NaN/);
 }
 assert.equal(new Set([1,2,3,4,5].map(n=>schoolIcon('constellation',n))).size,5);
});
