import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState, recruit, recruitOffer, unitCost} from '../src/game.js';
import {MAX_GOLD, exact, serializeSave} from '../src/money.js';
import {UNITS, unitAccess} from '../src/units.js';
import {RANKS, rankForArmy, promotionProgress, RANK_DEFINITIONS} from '../src/ranks.js';
import {BULK_RECRUIT, bulkRecruitAccess} from '../src/personal-equipment.js';
import {personalLevelEffect} from '../src/personal-panels.js';
const T=1800000000000;
const army=()=>({...freshState(T),soldiers:1280,gold:MAX_GOLD,ncoSchoolLevel:5});

test('baton level one recruits all four enlisted types without shifting later levels',()=>{
  for(const id of ['soldier','administrator','driver','medic']){
    const s=army(),field=UNITS[id].field;
    assert.equal(BULK_RECRUIT[id]?.level,1);
    assert.equal(bulkRecruitAccess(s,id).unlocked,true);
    const expected=Array.from({length:100},(_,i)=>exact(unitCost(s[field]+i,id))).reduce((a,b)=>a+b,0n);
    assert.equal(exact(recruitOffer(s,id,100).cost),expected);
    const before=s[field];
    assert.equal(recruit(s,T,id,100).ok,true);
    assert.equal(s[field],before+100);assert.equal(exact(s.gold),MAX_GOLD-expected);
  }
  assert.equal(BULK_RECRUIT.sergeant.level,2);
  assert.equal(BULK_RECRUIT.lieutenant.level,6);
  assert.match(personalLevelEffect('commandBaton',1),/일반병.*행정병.*운전병.*의무병/);
});

test('warrant officer shares baton level five with sergeant major and still needs school',()=>{
  const s=army();s.personalLevels.commandBaton=4;
  assert.equal(recruitOffer(s,'warrantOfficer',100).locked,true);
  s.personalLevels.commandBaton=5;
  assert.equal(BULK_RECRUIT.warrantOfficer?.level,BULK_RECRUIT.sergeantMajor.level);
  assert.equal(recruitOffer(s,'warrantOfficer',100).locked,false);
  s.ncoSchoolLevel=4;
  const before=serializeSave(s);
  assert.equal(recruit(s,T,'warrantOfficer',100).ok,false);
  assert.equal(serializeSave(s),before);
  assert.match(personalLevelEffect('commandBaton',5),/원사.*준위/);
});

test('major and every later rank depend on power, never mandatory soldier or sergeant counts',()=>{
  const units=Object.values(UNITS).filter(u=>!['soldier','sergeant'].includes(u.id)).reverse();
  for(let rank=RANKS.indexOf('소령');rank<RANKS.length;rank++){
    const required=exact(RANK_DEFINITIONS[rank].required),s=freshState(T);
    let remaining=required;
    for(const unit of units){
      const factor=exact(unit.power);s[unit.field]=Number(remaining/factor);remaining%=factor;
    }
    assert.equal(rankForArmy(s),rank,RANKS[rank]);
    assert.equal(s.soldiers,0);assert.equal(s.sergeants,0);
    assert.doesNotMatch(promotionProgress(s).text,/하사|일반병|명/);
  }
});

test('rank-gated officer recruitment no longer demands unrelated troop headcounts',()=>{
  for(const unit of Object.values(UNITS).filter(u=>u.recruitRankPower)){
    const s=army();
    for(const key of ['ncoSchoolLevel','officerSchoolLevel','advancedSchoolLevel','commandSchoolLevel','galacticSchoolLevel','constellationSchoolLevel'])s[key]=5;
    s.soldiers=0;s.sergeants=0;s.constellationMarshals=100;
    assert.equal(unitAccess(s,unit).unlocked,true,unit.id);
  }
});
