import test from 'node:test';
import assert from 'node:assert/strict';
import {equipmentListStats} from '../src/equipment-tiles.js';
import {equipmentStats,EQUIPMENT} from '../src/equipment.js';
import {equipmentCombatPower} from '../src/battle-balance.js';
import {compactGuidePower} from '../src/power-format.js';
import {fmtGold} from '../src/format.js';
import {personalListEffect,personalLevelEffect} from '../src/personal-panels.js';
import {PERSONAL_EQUIPMENT} from '../src/personal-catalog.js';
import {readFileSync} from 'node:fs';
test('military list agrees with detail calculations at purchase and enhancement levels',()=>{
 for(const id of Object.keys(EQUIPMENT))for(const level of [0,1,10,20,30]){
  const stats=equipmentStats(level,id),text=equipmentListStats(id,level);
  assert.equal(text,`초당 ${fmtGold(stats.passive)} G · 터치당 ${fmtGold(stats.tap)} G · 전투력 ${compactGuidePower(BigInt(equipmentCombatPower(id,level)))}`);
  assert.notEqual(text,equipmentListStats(id,level+1));
 }
});
test('baton summary shows last unlocked recruit, other equipment reflects current level',()=>{
 assert.equal(personalListEffect('commandBaton',1),'의무병까지 100명 모집');
 assert.equal(personalListEffect('commandBaton',5),'준위까지 100명 모집');
 assert.equal(personalListEffect('commandBaton',6),'소위까지 100명 모집');
 for(const item of Object.values(PERSONAL_EQUIPMENT).filter(i=>i.id!=='commandBaton'))
  for(const level of [1,10,20])assert.equal(personalListEffect(item.id,level),personalLevelEffect(item.id,level));
});
test('max booster no longer adds a gold field overlay',()=>{
 const css=readFileSync(new URL('../src/home-actions.css',import.meta.url),'utf8');
 assert.doesNotMatch(css,/#tap-zone(?:\.max-boost-active)?::after/);
});
