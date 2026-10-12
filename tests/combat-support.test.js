import {CONSTELLATION_POWERS} from "../src/constellation-officers.js";
import test from 'node:test';
import assert from 'node:assert/strict';
import {equipmentCombatStats,BATTLE_RULES,STAGES} from '../src/battle-balance.js';
import {createBattle,advanceBattle} from '../src/battle.js';
import {EQUIPMENT} from '../src/equipment.js';
import {referenceArmy} from '../tools/campaign-sim.mjs';
import {parseSave} from '../src/save.js';
import {serializeSave} from '../src/money.js';
import {FORMATION_ACHIEVEMENTS,reconcileAchievements} from '../src/achievements.js';
import {medalSvg} from '../src/achievement-art.js';
import {achievementListMarkup} from '../src/achievement-markup.js';
test('all seventeen weapons receive player-only damage and health buffs at every enhancement',()=>{
 for(const id of Object.keys(EQUIPMENT))for(let level=0;level<=50;level++){
  const ally=equipmentCombatStats(id,level),enemy=equipmentCombatStats(id,level,undefined,1,true,false);
  assert.ok(Math.abs(ally.damage-enemy.damage*1.2)<=Math.abs(ally.damage)*1e-12);
  assert.ok(Math.abs(ally.hp-enemy.hp*1.15)<=Math.abs(ally.hp)*1e-12);
  assert.equal(ally.intervalMs,enemy.intervalMs);
 }
});
test('player mana regenerates faster while enemy regeneration remains eight and caps are respected',()=>{
 let b=createBattle(referenceArmy(STAGES[0]),1);assert.equal(b.mana,60);assert.equal(b.enemy.mana,40);
 b.enemy.nextSpawnMs=Infinity;b=advanceBattle(b,250);
 assert.equal(b.mana,62.5);assert.ok(Math.abs(b.enemy.mana-42)<1e-9);
 b.mana=99;b.enemy.mana=99;b=advanceBattle(b,250);assert.equal(b.mana,BATTLE_RULES.manaMax);assert.equal(b.enemy.mana,100);
});
test('existing maximum-rank save gains five ruby medals once and displays exact large thresholds',()=>{
 const s=referenceArmy(STAGES[179],{power:CONSTELLATION_POWERS.at(-1),level:50});reconcileAchievements(s);
 const awards=FORMATION_ACHIEVEMENTS.filter(a=>a.id.startsWith('constellation'));
 s.earnedAchievements=s.earnedAchievements.filter(id=>!id.startsWith('constellation'));
 const loaded=parseSave(serializeSave(s),s.lastSavedAt ?? 1800000000000);assert.ok(loaded);
 for(const a of awards){assert.ok(loaded.earnedAchievements.includes(a.id));assert.match(medalSvg(a.id),/#bd304c/);}
 assert.deepEqual(reconcileAchievements(loaded),[]);
 assert.doesNotMatch(achievementListMarkup(loaded),/NaN|undefined|Infinity/);
 assert.equal(loaded.gold,s.gold);
});
