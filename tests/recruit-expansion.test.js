import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, MAX_SOLDIERS, SAVE_VERSION } from '../src/state.js';
import { NEW_RECRUITS, SPECIALIST_UNITS } from '../src/specialist-units.js';
import { UNITS, armyPower } from '../src/units.js';
import { RANKS, rankForArmy } from '../src/ranks.js';
import { recruit, recruitOffer, unitCost, perSecond, perTap, tapGold } from '../src/game.js';
import { inspectSave } from '../src/save.js';
import { MAX_GOLD, serializeSave, exact } from '../src/money.js';
import { schoolOffer } from '../src/schools.js';
import { insignia } from '../src/home-view.js';
const T=1800000000000;

test('specialists unlock at private/corporal/sergeant enlisted thresholds and cannot bypass locks',()=>{
  for(const u of SPECIALIST_UNITS) {
    const s={...freshState(T),gold:MAX_GOLD,soldiers:u.unlockPower-1};
    const before=serializeSave(s);
    assert.equal(recruit(s,T,u.id).reason,'locked');assert.equal(serializeSave(s),before);
    s.soldiers++;const gold=s.gold,power=armyPower(s),income=perSecond(s),tap=perTap(s);
    assert.equal(recruit(s,T,u.id).ok,true);
    assert.equal(s.gold,gold-exact(unitCost(0,u.id)));
    assert.equal(armyPower(s),power+u.power);assert.equal(perSecond(s),income+u.passive);assert.equal(perTap(s),tap+u.tap);
  }
});
test('warrant rank sits at 120 power, gold diamond is distinct and NCO school five unlocks recruitment',()=>{
  for(const [power,name] of [[119,'원사'],[120,'준위'],[159,'준위'],[160,'소위']])
    assert.equal(RANKS[rankForArmy({...freshState(T),soldiers:power})],name);
  assert.match(insignia(RANKS.indexOf('준위')),/insignia warrant/);
  const s={...freshState(T),ncoSchoolLevel:4,gold:MAX_GOLD};
  assert.equal(recruit(s,T,'warrantOfficer').reason,'locked');
  assert.match(schoolOffer(s,'nco').effect,/준위 모집/);
  s.ncoSchoolLevel=5;
  assert.equal(recruit(s,T,'warrantOfficer').ok,true);
  assert.equal(armyPower(s),120);assert.equal(perSecond(s),10000);assert.equal(perTap(s),80001);
  assert.ok(unitCost(0,'warrantOfficer')>unitCost(0,'sergeantMajor'));
});
test('version 23 saves migrate without changing money, existing troops, equipment or pending reward',()=>{
  const old={...freshState(T),version:23,gold:9007199254740993n,soldiers:5000,sergeants:300,ncoSchoolLevel:5,
    offlineReward:{id:T,durationMs:3600000,amount:9007199254740993n}};
  old.equipment.artillery={count:1,level:10,deployed:true};
  for(const u of NEW_RECRUITS) delete old[u.field];
  const {state:s,issue}=inspectSave(serializeSave(old),T);
  assert.equal(issue,null);assert.equal(s.version,SAVE_VERSION);
  for(const key of ['gold','soldiers','sergeants','ncoSchoolLevel','equipment','offlineReward'])assert.deepEqual(s[key],old[key]);
  for(const u of NEW_RECRUITS)assert.equal(s[u.field],0);
  for(const u of NEW_RECRUITS) {
    const invalid={...s,[u.field]:-1};assert.equal(inspectSave(serializeSave(invalid),T).issue.field,u.field);
  }
});
test('new recruits retain exact large money and respect total power cap',()=>{
  for(const u of NEW_RECRUITS) {
    const s={...freshState(T),gold:MAX_GOLD-1n,soldiers:MAX_SOLDIERS-u.power,ncoSchoolLevel:5};
    const other=unitCost(25,'sergeant'),price=unitCost(0,u.id);
    assert.equal(recruit(s,T,u.id).ok,true);assert.equal(s.gold,MAX_GOLD-1n-exact(price));
    assert.equal(unitCost(25,'sergeant'),other);assert.equal(recruitOffer(s,u.id).reason,'limit');
    const restored=inspectSave(serializeSave(s),T);assert.equal(restored.issue,null);assert.equal(restored.state[u.field],1);
    s.gold=MAX_GOLD-1n;assert.equal(tapGold(s,T),1);assert.equal(s.gold,MAX_GOLD);
  }
});
