import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, MAX_SOLDIERS, SAVE_KEY, SAVE_VERSION } from '../src/state.js';
import { parseSave } from '../src/save.js';
import { serializeSave, MAX_GOLD } from '../src/money.js';
import { recruit, perSecond, perTap } from '../src/game.js';
import { RANKS, rankForArmy, promotionProgress } from '../src/ranks.js';
import { FORMATIONS, groupArmy, ALLIED_ARMY_SIZE, GRAND_ALLIED_ARMY_SIZE, SUPREME_COMMAND_SIZE, GALACTIC_COMMAND_SIZE, GALACTIC_GRAND_ALLIED_ARMY_SIZE } from '../src/formations.js';
import { armyPower } from '../src/units.js';
import { schoolOffer } from '../src/schools.js';
import { personalStatus } from '../src/personal-equipment.js';
import { PERSONAL_EQUIPMENT } from '../src/personal-catalog.js';
import { EQUIPMENT, equipmentPurchaseOffer } from '../src/equipment.js';
import { supremeRankSymbol } from '../src/rank-emblem.js';
import { drawHighCommand } from '../src/command-art.js';
import { medalSvg } from '../src/achievement-art.js';
import { createBattle } from '../src/battle.js';
import { layoutFieldArmy } from '../src/field-layout.js';
const T=1_800_000_000_000;
const army=power=>({...freshState(T),gold:MAX_GOLD,soldiers:power-3000,sergeants:300,ncoSchoolLevel:5,officerSchoolLevel:5,advancedSchoolLevel:5});

test('new marshal boundaries consolidate four commands and promotion follows actual strength',()=>{
  assert.equal(GRAND_ALLIED_ARMY_SIZE,ALLIED_ARMY_SIZE*4);
  assert.equal(SUPREME_COMMAND_SIZE,GRAND_ALLIED_ARMY_SIZE*4);
  for(const [power,rank,id] of [[20971520,'중원수','grandAlliedArmy'],[83886080,'대원수','supremeCommand']]){
    const s=army(power-1),before=structuredClone(s);
    assert.equal(rankForArmy(s),RANKS.indexOf(rank)-1);
    assert.ok(promotionProgress(s).text.includes(power.toLocaleString('ko-KR')));
    const result=recruit(s,T);
    assert.equal(result.promoted,true);assert.equal(RANKS[result.rank],rank);
    assert.equal(armyPower(s),power);assert.equal(s.soldiers,before.soldiers+1);
    assert.deepEqual(groupArmy(s).map(g=>[g.id,g.count]),[[id,1]]);
    assert.ok(s.earnedAchievements.includes(id));assert.deepEqual(parseSave(serializeSave(s),T),s);
    s.equipment.artillery={level:1,count:1,deployed:true};
    assert.equal(createBattle(s,1,{equipment:['artillery']}).player.hq.id,id);
    s.sergeants=299;assert.equal(RANKS[rankForArmy(s)],'대령');
  }
  assert.equal(MAX_SOLDIERS,GALACTIC_GRAND_ALLIED_ARMY_SIZE*4);
});

test('version 20 keeps paid gear, exact money, troops, skills and campaign when rank names change',()=>{
  for(const [power,rank] of [[1310720,'준원수'],[5242880,'소원수'],[20971520,'중원수']]){
    const s={...army(power),version:20,gold:1_000_000_000_000_000_001n,campaignCleared:20,
      swordActivatedAt:T-1000,swordDurationMs:120000,autoTouchActivatedAt:T-900,autoTouchDurationMs:150000,autoTouchTicks:3};
    for(const id of Object.keys(s.personalLevels))s.personalLevels[id]=10;
    for(const [i,id] of Object.keys(EQUIPMENT).entries())s.equipment[id]={level:20,count:1,deployed:i<4};
    const expected=structuredClone(s);
    for(const item of Object.values(PERSONAL_EQUIPMENT))if(item.introducedVersion>20)expected.personalLevels[item.id]=1;
    for(const item of Object.values(EQUIPMENT))if((item.introducedVersion??0)>20)expected.equipment[item.id]=null;
    const loaded=parseSave(serializeSave(s),T);
    assert.equal(SAVE_KEY,'budae-kiugi-recruits-v3');assert.equal(loaded.version,SAVE_VERSION);
    for(const key of Object.keys(s).filter(k=>!['version','earnedAchievements'].includes(k)))assert.deepEqual(loaded[key],expected[key],key);
    assert.equal(RANKS[rankForArmy(loaded)],rank);
    assert.equal(perSecond(loaded),perSecond(expected));assert.equal(perTap(loaded,T),perTap(expected,T));
    assert.deepEqual(parseSave(serializeSave(loaded),T),loaded);
  }
});

test('renamed ranks retain the old ICBM, glaive and advanced academy unlock thresholds',()=>{
  const junior=army(1310720),minor=army(5242880);
  assert.equal(equipmentPurchaseOffer(junior,'icbm').locked,false);
  assert.equal(personalStatus(junior,'marshalGlaive').level,1);
  junior.advancedSchoolLevel=1;assert.equal(schoolOffer(junior,'advanced').reason,null);
  junior.advancedSchoolLevel=3;assert.equal(schoolOffer(junior,'advanced').reason,null);
  minor.advancedSchoolLevel=3;assert.equal(schoolOffer(minor,'advanced').reason,null);
});

test('marshal insignia keeps five, one, two and three stars without laurels and white stars for all three upper marshal ranks',()=>{
  for(const invalid of ['5',0,21,NaN,Infinity,5.5])assert.throws(()=>supremeRankSymbol(invalid),RangeError);
  for(const [tier,count] of [[5,5],[6,1],[7,2],[8,3],[9,4],[10,5]]){
    const svg=supremeRankSymbol(tier);
    assert.equal((svg.match(/data-rank-star/g)||[]).length,count);
    assert.equal((svg.match(/data-laurel/g)||[]).length,0);
    assert.equal((svg.match(/data-metal="white"/g)||[]).length,tier>=6?count:0);
    const points=[...svg.matchAll(/points="([^"]+)"/g)].flatMap(m=>m[1].split(' ').map(p=>p.split(',').map(Number)));
    for(const [x,y] of points){assert.ok(x>=0&&x<=64&&y>=0&&y<=64);}
    assert.equal(supremeRankSymbol(tier),svg);
  }
});

test('command buildings have distinct detailed silhouettes, fit their sprite and gain distinct medals',()=>{
  const signatures=[];
  for(const id of ['alliedArmy','grandAlliedArmy','supremeCommand']){
    const f=FORMATIONS.find(f=>f.id===id),ops=[];
    const c={fillRect(x,y,w,h){assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=f.width&&y+h<=f.height,`${id}: ${[x,y,w,h]}`);ops.push([this.fillStyle,x,y,w,h]);}};
    assert.equal(drawHighCommand(c,id,f.width,f.height),true);
    assert.ok(ops.length>400);signatures.push(JSON.stringify(ops));
    assert.doesNotMatch(medalSvg(id),/undefined|NaN/);
    assert.equal(medalSvg(id),medalSvg(id));
  }
  assert.equal(new Set(signatures).size,3);
  assert.notEqual(medalSvg('grandAlliedArmy'),medalSvg('supremeCommand'));
});

test('narrow command area retains the supreme headquarters with a wrapped name',()=>{
  const s=army(GALACTIC_COMMAND_SIZE-1),before=structuredClone(s);
  const area={x:106,y:22,width:46,height:45},items=layoutFieldArmy(s,area);
  assert.ok(items.length);assert.equal(items[0].id,'supremeCommand');assert.equal(items[0].wrapLabel,true);
  for(const item of items){assert.ok(item.x+item.boxWidth<=152);assert.ok(item.y+item.boxHeight<=67);}
  assert.deepEqual(s,before);
});
