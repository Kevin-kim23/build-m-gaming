import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,perSecond,perTap} from '../src/game.js';
import {incomeEffects} from '../src/income-effects.js';
import {FACILITIES} from '../src/facilities.js';
import {RANKS,RANK_REQUIREMENTS} from '../src/ranks.js';
import {MAX_GOLD,serializeSave} from '../src/money.js';
import {parseSave} from '../src/save.js';
const T=1800000000000;
const army=()=>({...freshState(T),soldiers:RANK_REQUIREMENTS[RANKS.indexOf('대원수')]-3000,sergeants:300});
const effects=(s,kind)=>Object.fromEntries(incomeEffects(s)[kind].map(e=>[e.label,e.percent]));

test('fresh saves have no bonuses; locked personal levels do not claim a benefit',()=>{
  const s=freshState(T);
  for(const id of Object.keys(s.personalLevels))s.personalLevels[id]=10;
  assert.deepEqual(effects(s,'passive'),{});assert.deepEqual(effects(s,'tap'),{});
});

test('facility fractions and conquest appear only in the income they actually affect',()=>{
  const s=freshState(T);s.facilities=FACILITIES.map(f=>f.id);
  s.facilityLevels=Object.fromEntries(s.facilities.map(id=>[id,20]));s.campaignCleared=35;
  assert.deepEqual(effects(s,'passive'),{'시설':96.25,'점령':35});
  assert.deepEqual(effects(s,'tap'),{'시설':77});
  s.facilityLevels={...s.facilityLevels,kitchen:1};
  assert.notEqual(effects(s,'passive')['시설'],96.25);
});

test('personal equipment combines multiplicatively, with equipment-only boosts kept separate',()=>{
  const s=army();
  assert.equal(effects(s,'passive')['개인장비'],164); // 2.2 × 1.2
  assert.equal(effects(s,'tap')['개인장비'],68); // 1.4 × 1.2
  assert.equal(effects(s,'passive')['장비 수입'],undefined);
  s.equipment.tank={level:0,count:1,deployed:true};
  assert.equal(effects(s,'passive')['장비 수입'],30);
  assert.equal(effects(s,'tap')['장비 수입'],30);
  for(const id of Object.keys(s.personalLevels))s.personalLevels[id]=10;
  assert.equal(effects(s,'passive')['개인장비'],560); // 4 × 1.65
  assert.equal(effects(s,'tap')['개인장비'],279.5); // 2.3 × 1.65
  assert.equal(effects(s,'tap')['장비 수입'],120);
  s.equipment.tank.deployed=false;
  assert.equal(effects(s,'tap')['장비 수입'],undefined);
});

test('displaying bonuses never mutates money, income or saves across safe-number and wallet boundaries',()=>{
  const s=army();s.equipment.tank={level:20,count:1,deployed:true};
  for(const gold of [Number.MAX_SAFE_INTEGER-1,Number.MAX_SAFE_INTEGER,9007199254740992n,MAX_GOLD-1n,MAX_GOLD]){
    s.gold=gold;const before=serializeSave(s),passive=perSecond(s),tap=perTap(s,T);
    incomeEffects(s);
    assert.equal(serializeSave(s),before);assert.equal(perSecond(s),passive);assert.equal(perTap(s,T),tap);
    assert.equal(parseSave(before,T).gold,gold);
  }
});
