import { LEGACY_MAX_GOLD } from '../src/money.js';
import { SAVE_VERSION } from '../src/state.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,parseSave,serializeSave,enhanceEquipment,buyAdditionalEquipment,MAX_GOLD} from '../src/game.js';
import {RANKS,RANK_REQUIREMENTS} from '../src/ranks.js';
import {divisionFlagStatus,enhancementLimitForFlag} from '../src/personal-equipment.js';
import {EQUIPMENT,equipmentStats,equipmentLevelLimit,enhancementCost} from '../src/equipment.js';
import {personalMarkup,personalDetailMarkup} from '../src/personal-panels.js';
import {personalIcon} from '../src/personal-art.js';
import {supremeRankSymbol} from '../src/rank-emblem.js';
import {insignia,homeMarkup} from '../src/home-view.js';
import {createBattle,equipmentCombatStats,STAGES} from '../src/battle.js';
import {enemyStack} from '../src/battle-balance.js';
import {until} from './lane-helpers.js';
const T=1_800_000_000_000;
const army=rank=>({...freshState(T),gold:MAX_GOLD,soldiers:Math.max(5000,RANK_REQUIREMENTS[RANKS.indexOf(rank)]-3000),sergeants:300,ncoSchoolLevel:5});

test('paid flag levels add one enhancement step and promotion alone keeps level one',()=>{
  for(let level=0;level<=20;level++)assert.equal(enhancementLimitForFlag(level),10+level);
  for(const bad of [-1,21,1.5,NaN])assert.throws(()=>enhancementLimitForFlag(bad),RangeError);
  for(const [i,rank] of ['준장','소장','중장','대장','준원수','소원수'].entries()){
    const s=army(rank);assert.equal(divisionFlagStatus(s).level,i===0?0:1);if(i)s.personalLevels.divisionFlag=i;assert.equal(divisionFlagStatus(s).level,i);assert.equal(equipmentLevelLimit(s),10+i);
    s.equipment.tank={level:9+i,count:1,deployed:true};const before=s.gold;
    assert.equal(enhanceEquipment(s,T,'tank').ok,true);
    assert.equal(before-s.gold,BigInt(enhancementCost(9+i,'tank')));
    assert.equal(enhanceEquipment(s,T,'tank').reason,'max');
  }
});
test('previous copies collapse once while level, deployment, exact gold and troops survive',()=>{
  const s={...army('준원수'),version:17,gold:LEGACY_MAX_GOLD-123n};
  for(const [i,id] of Object.keys(EQUIPMENT).entries())s.equipment[id]={level:i===0?20:10+i,count:35+i,deployed:i<4};
  const migrated=parseSave(serializeSave(s),T);assert.equal(migrated.version,SAVE_VERSION);
  for(const key of ['gold','soldiers','sergeants','lastAccrual'])assert.equal(migrated[key],s[key]);
  for(const item of Object.values(EQUIPMENT))assert.deepEqual(migrated.equipment[item.id],item.introducedVersion>17?null:{...s.equipment[item.id],count:1});
  assert.equal(enhanceEquipment(migrated,T,'artillery').reason,'max');
  assert.equal(migrated.equipment.artillery.level,20);
  assert.deepEqual(parseSave(serializeSave(migrated),T),migrated);
});
test('repeat purchase is locked at every rank and cannot spend or mutate even through direct calls',()=>{
  for(const rank of ['준장','소장','중장','대장','준원수','소원수'])for(const id of Object.keys(EQUIPMENT)){
    const s=army(rank);s.equipment[id]={level:20,count:1,deployed:true};const before=structuredClone(s);
    assert.deepEqual(buyAdditionalEquipment(s,T+1000,id),{ok:false,reason:'disabled'});assert.deepEqual(s,before);
  }
});
test('equipment income is integer, grows increasingly, and reaches 6x and 17x',()=>{
  for(const d of Object.values(EQUIPMENT)){
    let delta=0;
    for(let level=1;level<=30;level++){
      const a=equipmentStats(level-1,d.id),b=equipmentStats(level,d.id);
      assert.ok(Number.isSafeInteger(b.passive)&&Number.isSafeInteger(b.tap));
      assert.ok(b.passive-a.passive>delta);delta=b.passive-a.passive;
      assert.ok(b.tap>d.tap+level*d.tapStep);
    }
    assert.equal(equipmentStats(10,d.id).passive,d.passive*6);
    assert.equal(equipmentStats(20,d.id).tap,d.tap*17);
    assert.equal(equipmentStats(30,d.id).tap,d.tap*34);
  }
});
test('player attack and healing upgrade rewards increase for players while enemy units keep their stage stats',()=>{
  for(const id of Object.keys(EQUIPMENT)){
    const old=equipmentCombatStats(id,15,1280,1,false),next=equipmentCombatStats(id,15);
    assert.ok((next.healing??next.damage)>(old.healing??old.damage));assert.equal(next.intervalMs,old.intervalMs);
  }
  const s={...army('소원수'),campaignCleared:80};s.equipment.tank={level:15,count:1,deployed:true};
  const stage=STAGES[79];let battle=createBattle(s,80,{equipment:['tank']});
  battle=until(battle,stage.spawnMs+3000); // 적이 출격할 때까지
  const enemy=battle.enemy.units[0];assert.ok(enemy);
  assert.ok(Math.abs(enemy.damage-equipmentCombatStats(enemy.id,stage.enemyLevel,stage.enemyPower,1,false).damage*stage.enemyModifier*enemyStack(80,stage.enemyLevel))<1e-6);
});
test('personal cards have only detail buttons, while home skill controls remain',()=>{
  const s=army('준원수'),html=personalMarkup(s);
  assert.equal((html.match(/<button /g)||[]).length,8);
  assert.equal((html.match(/data-detail-personal/g)||[]).length,8);
  assert.doesNotMatch(html,/data-use-sword|data-use-revolver|data-shop-category|data-equipment-category/);
  assert.match(homeMarkup(s),/data-use-sword/);assert.match(homeMarkup(s),/data-use-revolver/);
  const detail=personalDetailMarkup(s,'divisionFlag').body;
  assert.match(detail,/최대 11강/);assert.match(detail,/Lv.10 · 장비 최대 20강/);assert.match(detail,/골드로 강화/);
  assert.equal(new Set(Array.from({length:10},(_,i)=>personalIcon('flag',i+1))).size,10);
});
test('junior marshal keeps five stars; minor marshal has one star and both omit laurels',()=>{
  const marshal=supremeRankSymbol(5),grand=supremeRankSymbol(6);
  assert.equal((marshal.match(/data-rank-star/g)||[]).length,5);
  assert.equal((grand.match(/data-rank-star/g)||[]).length,1);
  assert.equal((grand.match(/data-laurel/g)||[]).length,0);
  assert.equal(supremeRankSymbol(5),marshal);assert.equal(supremeRankSymbol(6),grand);
  for(const [rank,symbol] of [['준원수',marshal],['소원수',grand]])assert.ok(insignia(RANKS.indexOf(rank)).includes(symbol));
});
