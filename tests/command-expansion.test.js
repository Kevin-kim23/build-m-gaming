import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,MAX_SOLDIERS,SAVE_VERSION} from '../src/state.js';
import {COMMAND_OFFICERS} from '../src/command-officers.js';
import {ADVANCED_OFFICERS} from '../src/advanced-officers.js';
import {RANKS,RANK_REQUIREMENTS,rankForArmy} from '../src/ranks.js';
import {GALACTIC_COMMAND_SIZE,GALACTIC_GROUP_COMMAND_SIZE,groupArmy,FORMATIONS} from '../src/formations.js';
import {recruit,recruitOffer,unitCost,upgradeSchool,perSecond,tapGold,accrue,MAX_OFFLINE_MS} from '../src/game.js';
import {schoolOffer} from '../src/schools.js';
import {schoolIcon} from '../src/school-art.js';
import {personalLevelEffect} from '../src/personal-panels.js';
import {MAX_GOLD,exact,serializeSave,subtractMoney} from '../src/money.js';
import {parseSave,inspectSave} from '../src/save.js';
import {facilityIcon} from '../src/facility-art.js';
import {FACILITIES,facilityUpgradeCost,facilityStats} from '../src/facilities.js';
import {layoutFieldWorld} from '../src/field-world.js';
import {drawHighCommand} from '../src/command-art.js';
import {drawModernCommand} from '../src/modern-command-art.js';
import {generalPromotionMarkup} from '../src/general-promotion.js';
import {promotionProfile} from '../src/promotion.js';
import {medalSvg} from '../src/achievement-art.js';
import {createBattle} from '../src/battle.js';
const T=1800000000000;
const army=rank=>({...freshState(T),soldiers:RANK_REQUIREMENTS[RANKS.indexOf(rank)]-3000,sergeants:300,
  ncoSchoolLevel:5,officerSchoolLevel:5,advancedSchoolLevel:5,gold:MAX_GOLD});

test('command academy follows a completable advanced academy and unlocks five ranks sequentially',()=>{
  const advanced=army('대장');advanced.advancedSchoolLevel=0;
  for(const grade of ADVANCED_OFFICERS){advanced.gold=grade.academyCost;assert.equal(upgradeSchool(advanced,T,'advanced').level,grade.schoolLevel);}
  assert.equal(schoolOffer(advanced,'command').reason,'locked');
  const s=army('준원수');s.advancedSchoolLevel=4;
  assert.equal(schoolOffer(s,'command').visible,false);assert.equal(upgradeSchool(s,T,'command').reason,'locked');s.advancedSchoolLevel=5;
  for(const grade of COMMAND_OFFICERS){
    const power=RANK_REQUIREMENTS[RANKS.indexOf(grade.unlockRank)];s.soldiers=power-3001;
    assert.equal(upgradeSchool(s,T,'command').reason,'locked');s.soldiers++;
    s.gold=subtractMoney(grade.academyCost,1);const before=serializeSave(s);
    assert.equal(upgradeSchool(s,T,'command').reason,'gold');assert.equal(serializeSave(s),before);
    s.gold=grade.academyCost;assert.equal(upgradeSchool(s,T,'command').level,grade.schoolLevel);assert.equal(s.gold,0);
    for(const u of COMMAND_OFFICERS)assert.equal(recruitOffer(s,u.id).locked,u.schoolLevel>grade.schoolLevel);
  }
  assert.equal(upgradeSchool(s,T,'command').reason,'max');
  assert.equal(new Set([1,2,3,4,5].map(l=>schoolIcon('command',l))).size,5);
});

test('baton16..20 unlocks marshal batches with exact individual sums and independent prices',()=>{
  for(const [i,u] of COMMAND_OFFICERS.entries()){
    const s=army('특전원수');s.commandSchoolLevel=5;s.personalLevels.commandBaton=15+i;
    assert.equal(recruitOffer(s,u.id,100).reason,'locked');s.personalLevels.commandBaton++;
    const expected=Array.from({length:100},(_,n)=>exact(unitCost(n,u.id))).reduce((a,b)=>a+b,0n);
    assert.equal(exact(recruitOffer(s,u.id,100).cost),expected);assert.ok(expected<MAX_GOLD);
    assert.match(personalLevelEffect('commandBaton',16+i),new RegExp(u.name+'까지'));
    assert.doesNotMatch(personalLevelEffect('commandBaton',16+i),/할인/);
    s.commandSchoolLevel=i;assert.equal(recruitOffer(s,u.id,100).reason,'locked');s.commandSchoolLevel=5;
    s.gold=expected-1n;assert.equal(recruit(s,T,u.id,100).reason,'gold');s.gold=expected;
    const other=COMMAND_OFFICERS[(i+1)%5],otherCost=unitCost(s[other.field],other.id);
    assert.equal(recruit(s,T,u.id,100).ok,true);assert.equal(s[u.field],100);assert.equal(s.gold,0);
    assert.equal(unitCost(s[other.field],other.id),otherCost);
    assert.equal(parseSave(serializeSave(s),T)[u.field],100);
    s.soldiers=MAX_SOLDIERS-s.sergeants*10-s[u.field]*u.power;s.gold=MAX_GOLD;
    assert.equal(recruit(s,T,u.id).reason,'limit');assert.equal(s.gold,MAX_GOLD);
  }
});

test('four galaxies promote to five-star deputy commander and award the galactic group medal once',()=>{
  assert.equal(GALACTIC_GROUP_COMMAND_SIZE,GALACTIC_COMMAND_SIZE*4);
  const s=army('부사령관');s.soldiers--;assert.equal(RANKS[rankForArmy(s)],'특전원수');
  const result=recruit(s,T);assert.equal(result.ok,true);assert.equal(RANKS[result.rank],'부사령관');
  assert.ok(result.achievements.includes('galacticGroupCommand'));
  assert.deepEqual(groupArmy(s).map(f=>[f.id,f.count]),[['galacticGroupCommand',1]]);
  assert.match(medalSvg('galacticGroupCommand'),/data-galactic-group-emblem/);
  const ceremony=generalPromotionMarkup(result.rank,promotionProfile(result.rank));
  assert.match(ceremony,/백색 별 다섯/);assert.doesNotMatch(ceremony,/undefined|NaN/);
  s.equipment.artillery={level:0,count:1,deployed:true};
  assert.equal(createBattle(s,1).player.hq.id,'galacticGroupCommand');
});

test('format30 keeps paid upgrades and all assets; new command data starts empty and format31 rejects corruption',()=>{
  const old=army('특전원수');old.version=30;old.personalLevels.commandBaton=20;old.personalLevels.divisionFlag=20;
  old.gold=MAX_GOLD-1n;old.equipment.tank={level:30,count:1,deployed:false};old.facilities=['futsal'];old.facilityLevels={futsal:20};
  old.offlineReward={id:T,durationMs:3600000,amount:9007199254740993n};
  old.commandSchoolLevel=5;for(const u of COMMAND_OFFICERS)old[u.field]=99;
  const migrated=parseSave(serializeSave(old),T);assert.equal(migrated.version,SAVE_VERSION);assert.equal(migrated.commandSchoolLevel,0);
  for(const u of COMMAND_OFFICERS)assert.equal(migrated[u.field],0);
  for(const key of ['gold','personalLevels','equipment','facilities','facilityLevels','offlineReward','soldiers'])assert.deepEqual(migrated[key],old[key]);
  for(const patch of [{commandSchoolLevel:6},{commandSchoolLevel:1,advancedSchoolLevel:4},{juniorMarshals:-1},{specialMarshals:1.5},{specialMarshals:undefined}])
    assert.equal(inspectSave(serializeSave({...migrated,...patch}),T).state,null);
});

test('full late base stops horizontal growth and adds vertical rows while every label remains accessible',()=>{
  const s=army('부사령관');s.commandSchoolLevel=5;s.facilities=FACILITIES.map(f=>f.id);s.facilityLevels=Object.fromEntries(s.facilities.map(id=>[id,20]));
  const old={...s,facilities:s.facilities.slice(0,10)};
  for(const width of [144,160,180,206,240,384])for(const height of [90,160,240,330]){
    const world=layoutFieldWorld(s,width,height),previous=layoutFieldWorld(old,width,height);
    assert.ok(world.width<=width*1.5);assert.ok(world.height>=previous.height);
    assert.equal(world.facilities.length,19);assert.equal(world.schools.length,4);assert.ok(world.army[0].width>=80);
    const items=[...world.army,...world.schools,...world.facilities,...world.equipment];
    for(const a of items)assert.ok(a.x>=0&&a.y>=30&&a.x+a.boxWidth<=world.width&&a.y+a.boxHeight<=world.height,a.id);
    for(const [i,a] of items.entries())for(const b of items.slice(i+1))
      assert.ok(a.x+a.boxWidth<=b.x||b.x+b.boxWidth<=a.x||a.y+a.boxHeight<=b.y||b.y+b.boxHeight<=a.y,a.id+'/'+b.id);
  }
});

test('late facilities afford every level below wallet cap, get stronger and have distinct growing original art',()=>{
  for(const f of FACILITIES.slice(10)){
    const drawings=[];let total=BigInt(f.cost);
    for(let level=1;level<=20;level++){
      const art=facilityIcon(f.id,level);assert.equal(art,facilityIcon(f.id,level));drawings.push(art);
      assert.doesNotMatch(art,/<image|href=|script|undefined|NaN/);
      const stats=facilityStats(f.id,level),initial=facilityStats(f.id,1);
      assert.ok(stats.passive+stats.tap>=initial.passive+initial.tap);
      if(level<20){const cost=facilityUpgradeCost(f.id,level);assert.ok(cost<MAX_GOLD);total+=exact(cost);}
    }
    assert.equal(new Set(drawings).size,20);assert.ok(total<MAX_GOLD,'one full facility must fit the wallet cap');
  }
});

test('modern headquarters and galactic group keep detailed pixels inside each growing footprint',()=>{
  const signatures=[];
  for(const id of ['division','corps','fieldArmy','armyGroup','galacticGroupCommand']){
    const f=FORMATIONS.find(f=>f.id===id),ops=[],c={fillStyle:'',fillRect(...rect){ops.push([this.fillStyle,...rect]);}};
    const draw=id==='galacticGroupCommand'?drawHighCommand:drawModernCommand;
    assert.equal(draw(c,id,f.width,f.height),true);
    assert.ok(ops.length>180);
    for(const [,x,y,w,h] of ops)assert.ok([x,y,w,h].every(Number.isFinite)&&x>=0&&y>=0&&w>0&&h>0&&x+w<=f.width&&y+h<=f.height,`${id}: ${x},${y},${w},${h}`);
    signatures.push(JSON.stringify(ops));
  }
  assert.equal(new Set(signatures).size,5);
});

test('new top power, marshal income and 19 facilities settle eight hours exactly and preserve one gold at the cap',()=>{
  for(const count of [1,400]){
  const s=army('부사령관');s.commandSchoolLevel=5;s.specialMarshals=count;s.soldiers=MAX_SOLDIERS-3000-count*COMMAND_OFFICERS[4].power;
  s.facilities=FACILITIES.map(f=>f.id);s.facilityLevels=Object.fromEntries(s.facilities.map(id=>[id,20]));s.gold=0;
  for(const id of Object.keys(s.personalLevels))s.personalLevels[id]=20;
  const expected=exact(perSecond(s))*BigInt(MAX_OFFLINE_MS)/1000n;
  assert.equal(expected>MAX_GOLD,count===400);
  accrue(s,T+MAX_OFFLINE_MS);assert.equal(exact(s.gold),expected>MAX_GOLD?MAX_GOLD:expected);
  const loaded=parseSave(serializeSave(s),T+MAX_OFFLINE_MS);assert.ok(loaded);assert.equal(loaded.gold,s.gold);
  s.gold=MAX_GOLD-1n;assert.equal(tapGold(s,T+MAX_OFFLINE_MS),1);assert.equal(s.gold,MAX_GOLD);
  }
});
