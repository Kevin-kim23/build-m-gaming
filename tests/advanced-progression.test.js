import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, MAX_GOLD, MAX_SOLDIERS, upgradeSchool, recruit, recruitOffer, perTap, perSecond, parseSave, serializeSave } from '../src/game.js';
import { ADVANCED_OFFICERS } from '../src/advanced-officers.js';
import { UNITS, armyPower } from '../src/units.js';
import { RANKS, RANK_REQUIREMENTS, RANK_DEFINITIONS, rankForArmy } from '../src/ranks.js';
import { FIELD_ARMY_SIZE, ARMY_GROUP_SIZE, ALLIED_ARMY_SIZE, groupSoldiers } from '../src/formations.js';
import { schoolOffer } from '../src/schools.js';
import { schoolsMarkup, schoolDetailMarkup } from '../src/school-panels.js';
import { schoolIcon } from '../src/school-art.js';
import { reconcileAchievements } from '../src/achievements.js';
import { medalSvg } from '../src/achievement-art.js';
import { layoutFieldArmy } from '../src/field-layout.js';
import { ownedSchools, layoutFieldSchools, fieldArmyArea } from '../src/field-schools.js';
import { layoutFieldEquipment } from '../src/field-layout.js';
import { personalIcon } from '../src/personal-art.js';
import { activateSword } from '../src/game.js';
const T=1_800_000_000_000;
const army=rank=>({...freshState(T),gold:MAX_GOLD,soldiers:RANK_REQUIREMENTS[RANKS.indexOf(rank)]-3000,sergeants:300,ncoSchoolLevel:5,officerSchoolLevel:5});

test('four field armies form an army group, four groups form allied command, ranks use five and six stars',()=>{
  assert.equal(ARMY_GROUP_SIZE,FIELD_ARMY_SIZE*4);assert.equal(ALLIED_ARMY_SIZE,ARMY_GROUP_SIZE*4);
  for(const [rank,id,power,stars] of [['원수','armyGroup',1310720,5],['대원수','alliedArmy',5242880,6]]) {
    const s=army(rank);s.soldiers--;
    assert.equal(rankForArmy(s),RANKS.indexOf(rank)-1);
    const oldPower=armyPower(s);assert.equal(recruit(s,T).promoted,true);
    assert.equal(RANKS[rankForArmy(s)],rank);assert.equal(armyPower(s),oldPower+1);
    assert.equal(RANK_DEFINITIONS[rankForArmy(s)].marks,stars);
    assert.deepEqual(groupSoldiers(power).map(g=>[g.id,g.count]),[[id,1]]);
    assert.ok(s.earnedAchievements.includes(id));
    assert.deepEqual(reconcileAchievements(s),[]);
    assert.deepEqual(parseSave(serializeSave(s),T),s);
    s.sergeants=299;assert.equal(RANKS[rankForArmy(s)],'대령');
  }
});

test('advanced academy requires officer level five and sequential rank-gated upgrades',()=>{
  const s=army('대장');s.officerSchoolLevel=4;
  assert.equal(schoolOffer(s,'advanced').visible,false);
  assert.equal(upgradeSchool(s,T,'advanced').reason,'locked');
  s.officerSchoolLevel=5;s.soldiers--;
  assert.equal(schoolOffer(s,'advanced').visible,true);
  assert.equal(upgradeSchool(s,T,'advanced').reason,'locked');
  s.soldiers++;
  for(const grade of ADVANCED_OFFICERS) {
    const need=RANK_REQUIREMENTS[RANKS.indexOf(grade.unlockRank)];
    s.soldiers=need-3001;
    assert.equal(upgradeSchool(s,T,'advanced').reason,'locked');
    s.soldiers++;
    s.gold=grade.academyCost-1;const before=structuredClone(s);
    assert.equal(upgradeSchool(s,T,'advanced').reason,'gold');assert.deepEqual(s,before);
    s.gold=grade.academyCost;
    assert.equal(upgradeSchool(s,T,'advanced').level,grade.schoolLevel);assert.equal(s.gold,0);
    for(const u of ADVANCED_OFFICERS)assert.equal(recruitOffer(s,u.id).locked,u.schoolLevel>grade.schoolLevel);
  }
  assert.equal(upgradeSchool(s,T,'advanced').reason,'max');
});

test('new officers spend their independent price and add only their catalog strength and income',()=>{
  const s={...army('대원수'),advancedSchoolLevel:5};
  for(const grade of ADVANCED_OFFICERS) {
    const before={gold:s.gold,power:armyPower(s),tap:perTap(s,T),income:perSecond(s)};
    const prices=Object.fromEntries(ADVANCED_OFFICERS.map(g=>[g.id,recruitOffer(s,g.id).cost]));
    assert.equal(recruit(s,T,grade.id).ok,true);
    assert.equal(s[grade.field],1);
    assert.equal(before.gold-s.gold,BigInt(prices[grade.id]));
    assert.equal(armyPower(s)-before.power,grade.power);
    assert.equal(perTap(s,T)-before.tap,grade.tap);assert.equal(perSecond(s)-before.income,grade.passive);
    for(const other of ADVANCED_OFFICERS)assert.equal(recruitOffer(s,other.id).cost===prices[other.id],other.id!==grade.id);
  }
  assert.deepEqual(parseSave(serializeSave(s),T).gold,s.gold);
});

test('version sixteen migration preserves assets and ignores injected advanced units',()=>{
  const old={...army('대장'),version:16,gold:99_999_999_999_999,advancedSchoolLevel:5,colonels:999,generals:1,campaignCleared:20};
  const loaded=parseSave(serializeSave(old),T);
  assert.equal(loaded.version,18);assert.equal(loaded.advancedSchoolLevel,0);
  for(const grade of ADVANCED_OFFICERS)assert.equal(loaded[grade.field],0);
  for(const key of ['gold','soldiers','sergeants','ncoSchoolLevel','officerSchoolLevel','campaignCleared'])assert.equal(loaded[key],old[key]);
  assert.deepEqual(loaded.equipment,old.equipment);
  for(const patch of [{advancedSchoolLevel:6},{advancedSchoolLevel:1,officerSchoolLevel:4},{colonels:-1},{generals:1.5},{majorGenerals:undefined},{soldiers:MAX_SOLDIERS,generals:1}])
    assert.equal(parseSave(serializeSave({...loaded,...patch}),T),null);
});

test('advanced school UI lists each required rank and has five distinct cached campuses',()=>{
  const s=army('대장');
  assert.match(schoolsMarkup(s),/고급 사관학교/);
  const detail=schoolDetailMarkup(s,'advanced').body;
  for(const rank of ['대장','원수','대원수'])assert.ok(detail.includes(rank+' 이상 필수'));
  const icons=ADVANCED_OFFICERS.map(g=>schoolIcon('advanced',g.schoolLevel));
  assert.equal(new Set(icons).size,5);
  for(let level=1;level<=5;level++)assert.equal(schoolIcon('advanced',level),icons[level-1]);
  assert.notEqual(medalSvg('armyGroup'),medalSvg('alliedArmy'));
  assert.doesNotMatch(icons.join('')+medalSvg('alliedArmy'),/undefined|NaN|https?:|<image/);
});

test('three campuses and upper formations fit beside weapons on narrow and short fields',()=>{
  const s={...army('대원수'),advancedSchoolLevel:5,soldiers:MAX_SOLDIERS-3000-1};
  for(const width of [160,195,240])for(const height of [110,140,210,300]) {
    const gear=layoutFieldEquipment(Array.from({length:4},()=>({})),width,height);
    const schools=layoutFieldSchools(ownedSchools(s),gear,width,height);
    const area=fieldArmyArea(schools,gear,width,height), buildings=layoutFieldArmy(s,area);
    assert.equal(schools.length,3);assert.ok(buildings.length>0,`${width}x${height}`);
    for(const item of buildings) {
      assert.ok(item.x>=0&&item.x+item.boxWidth<=width&&item.y>=0);
      assert.ok(item.y+item.boxHeight<gear[0].y);
      for(const school of schools)assert.ok(item.x>=school.x+school.width+4||item.y+item.boxHeight<school.y);
    }
  }
});

test('extended personal reward art is distinct and 70/80 second skills survive reload',()=>{
  for(const [rank,duration,baton,sword] of [['원수',70000,7,5],['대원수',80000,8,6]]) {
    const s=army(rank);assert.equal(activateSword(s,T).ok,true);assert.equal(s.swordDurationMs,duration);
    assert.equal(parseSave(serializeSave(s),T).swordDurationMs,duration);
    assert.notEqual(personalIcon('baton',baton),personalIcon('baton',baton-1));
    assert.notEqual(personalIcon('sword',sword),personalIcon('sword',sword-1));
  }
});

test('maximum legal troop incomes remain safe integers before exact time multiplication',()=>{
  for(const unit of Object.values(UNITS)) {
    const s={...freshState(T),[unit.field]:Math.floor(MAX_SOLDIERS/unit.power),campaignCleared:80};
    for(const id of ['helicopter','rocketLauncher','transport','fighter'])s.equipment[id]={level:20,count:100000,deployed:true};
    assert.ok(Number.isSafeInteger(perSecond(s)*100));assert.ok(Number.isSafeInteger(perTap(s,T)*400));
  }
});
