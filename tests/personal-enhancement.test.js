import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from '../src/game.js';
import * as personal from '../src/personal-equipment.js';
import { RANKS, RANK_REQUIREMENTS } from '../src/ranks.js';
import { MAX_GOLD, serializeSave, subtractMoney } from '../src/money.js';
import { equipmentLevelLimit } from '../src/equipment.js';
import { personalIcon } from '../src/personal-art.js';
import { personalDetailMarkup, personalMarkup } from '../src/personal-panels.js';
const T = 1800000000000;
const army = (rank = '대원수') => ({ ...game.freshState(T), soldiers: RANK_REQUIREMENTS[RANKS.indexOf(rank)] - 3000,
  sergeants: 300, gold: MAX_GOLD, ncoSchoolLevel: 5, officerSchoolLevel: 5 });

test('promotion grants Lv.1 only and cannot replace paid personal levels', () => {
  const s = army('소장');
  assert.equal(personal.commandBatonStatus(s).level, 1);
  assert.equal(personal.generalSwordStatus(s).level, 1);
  assert.equal(personal.divisionFlagStatus(s).level, 1);
  s.personalLevels.commandBaton = 6;
  s.soldiers = army().soldiers;
  assert.equal(personal.commandBatonStatus(s).level, 6);
  assert.equal(personal.generalSwordStatus(s).level, 1);
  assert.equal(personal.generalRevolverStatus(s).level, 1);
});
test('v18 migrates once to Lv.1 while preserving exact gold, military gear and running skills', () => {
  const s = { ...army(), version: 18, gold: MAX_GOLD - 1n, swordActivatedAt: T - 5000, swordDurationMs: 80000,
    autoTouchActivatedAt: T - 900, autoTouchTicks: 3 };
  s.equipment.tank = { level: 20, count: 1, deployed: true };
  const next = game.parseSave(serializeSave(s), T);
  assert.equal(next.version, 19);
  for (const level of Object.values(next.personalLevels)) assert.equal(level, 1);
  assert.equal(next.gold, s.gold); assert.deepEqual(next.equipment, s.equipment);
  assert.equal(personal.swordSkillStatus(next,T).activeMs, 75000);
  assert.equal(next.autoTouchDurationMs, 60000); assert.equal(next.autoTouchTicks, 3);
  assert.equal(equipmentLevelLimit(next), 11); assert.equal(next.equipment.tank.level, 20);
  next.personalLevels.commandBaton = 10;
  assert.equal(game.parseSave(serializeSave(next),T).personalLevels.commandBaton, 10);
});
test('personal detail descriptions name the original award rank, not the current rank', () => {
  const s = army();
  for (const [id, rank] of [['commandBaton','중령'],['generalSword','준장'],['divisionFlag','소장'],['generalRevolver','중장']]) {
    const detail = personalDetailMarkup(s,id).body;
    assert.match(detail, new RegExp(`${rank} 진급 보상`));
    assert.doesNotMatch(detail, /대원수 진급 보상|진급할 때마다|자동 성장/);
    assert.match(detail, /강화 확률표/);
  }
  assert.equal((personalMarkup(s).match(/data-detail-personal=/g)||[]).length, 4);
});
test('all ten levels of every personal icon are distinct and cached', () => {
  for (const kind of ['baton','sword','flag','revolver']) {
    const icons = Array.from({length:10},(_,i)=>personalIcon(kind,i+1));
    assert.equal(new Set(icons).size,10,kind);
    icons.forEach((svg,i)=>assert.equal(personalIcon(kind,i+1),svg));
    assert.doesNotMatch(icons.join(''),/NaN|undefined|<image|https?:/);
  }
});
test('all nine published success thresholds match every possible integer draw', async () => {
  const { PERSONAL_UPGRADE_CHANCES, personalRollSucceeds } = await import('../src/personal-enhancement.js');
  assert.deepEqual(PERSONAL_UPGRADE_CHANCES, [100,95,90,80,70,60,50,40,30]);
  for (let level=1;level<10;level++) {
    let successes=0;
    for(let roll=0;roll<10000;roll++) if(personalRollSucceeds(level,roll)) successes++;
    assert.equal(successes,PERSONAL_UPGRADE_CHANCES[level-1]*100);
  }
});
test('success or failure charges once; failures retain level; max, locks and low gold never roll', async () => {
  const { personalUpgradeOffer } = await import('../src/personal-enhancement.js');
  for(const id of ['commandBaton','generalSword','divisionFlag','generalRevolver']) {
    const s=army();s.personalLevels[id]=2;
    const cost=personalUpgradeOffer(s,id).cost,before=s.gold;
    let calls=0;
    const fail=game.enhancePersonalEquipment(s,T,id,()=>{calls++;return 9999;});
    assert.equal(fail.ok,true);assert.equal(fail.success,false);assert.equal(s.personalLevels[id],2);
    assert.equal(s.gold,subtractMoney(before,cost));assert.equal(calls,1);
    assert.equal(game.enhancePersonalEquipment(s,T,id,()=>0).success,true);
    assert.equal(s.personalLevels[id],3);assert.equal(s.gold,subtractMoney(before,cost*2));
    s.personalLevels[id]=10;const capped=structuredClone(s);
    assert.equal(game.enhancePersonalEquipment(s,T,id,()=>{throw Error('no roll');}).reason,'max');
    assert.deepEqual(s,capped);
    s.personalLevels[id]=1;s.gold=personalUpgradeOffer(s,id).cost-1;
    assert.equal(game.enhancePersonalEquipment(s,T,id,()=>{throw Error('no roll');}).reason,'gold');
    assert.equal(game.enhancePersonalEquipment(game.freshState(T),T,id,()=>{throw Error('no roll');}).reason,'locked');
  }
});
test('revolver duration and paid pulses use activation level across upgrades, reload and clock rollback', () => {
  const s=army();s.gold=0;
  s.personalLevels.generalRevolver=2;
  assert.equal(game.activateAutoTouch(s,T).ok,true);assert.equal(s.autoTouchDurationMs,70000);
  s.personalLevels.generalRevolver=10;
  assert.equal(personal.autoTouchStatus(s,T+69999).active,true);
  assert.equal(personal.autoTouchStatus(s,T+70000).active,false);
  game.accrue(s,T+150000);assert.equal(s.autoTouchTicks,233);
  const restored=game.parseSave(serializeSave(s),T+150000),gold=restored.gold;
  game.accrue(restored,T+70000);assert.equal(restored.gold,gold);
  assert.equal(game.activateAutoTouch(restored,T+1800000).ok,true);
  assert.equal(restored.autoTouchDurationMs,150000);
  game.accrue(restored,T+1950000);assert.equal(restored.autoTouchTicks,500);
});

test('every gear step charges its published cost on either outcome and the next quote grows only on success', async () => {
  const { personalUpgradeStep,personalUpgradeOffer }=await import('../src/personal-enhancement.js');
  for(const id of Object.keys(army().personalLevels))for(let level=1;level<10;level++)for(const roll of [0,9999]) {
    const s=army();s.personalLevels[id]=level;
    const step=personalUpgradeStep(id,level);s.gold=step.cost;
    const result=game.enhancePersonalEquipment(s,T,id,()=>roll);
    assert.equal(result.ok,true);assert.equal(s.gold,0);
    assert.equal(s.personalLevels[id],level+(roll<step.chance*100?1:0));
    assert.equal(personalUpgradeOffer(s,id).cost,s.personalLevels[id]===10?null:step.cost*(result.success?2:1));
  }
});
test('v19 validates every persisted level and activation duration, while v18 cannot inject paid levels', () => {
  const state=army();
  for(const bad of [null,[],{},'10',{...state.personalLevels,generalSword:0},{...state.personalLevels,generalSword:11},
    {...state.personalLevels,commandBaton:1.5},{...state.personalLevels,generalRevolver:'2'}])
    assert.equal(game.parseSave(serializeSave({...state,personalLevels:bad}),T),null);
  for(const patch of [{autoTouchDurationMs:undefined},{autoTouchDurationMs:60001},{autoTouchDurationMs:160000},{swordDurationMs:130000}])
    assert.equal(game.parseSave(serializeSave({...state,...patch}),T),null);
  state.personalLevels.generalSword=10;
  assert.equal(game.parseSave(serializeSave({...state,version:18}),T).personalLevels.generalSword,1);
});
test('uniform random draws reject the excess uint32 range, and invalid RNG never charges', async () => {
  const {drawPersonalRoll}=await import('../src/personal-enhancement.js');
  const values=[0xffffffff,4000009999];let calls=0;
  assert.equal(drawPersonalRoll(buffer=>{buffer[0]=values[calls++];}),9999);assert.equal(calls,2);
  for(const roll of [-1,10000,NaN,1.5]) {
    const s=army(),before=structuredClone(s);
    assert.throws(()=>game.enhancePersonalEquipment(s,T,'generalSword',()=>roll),RangeError);
    assert.deepEqual(s,before);
  }
});
test('a paid failure persists through failed writes, retry and reload without another roll or charge', async () => {
  const {createGameSession}=await import('../src/session.js');
  const s=army();s.personalLevels.generalSword=2;
  const values=new Map([[game.SAVE_KEY,serializeSave(s)]]);
  let deny=false,rolls=0;
  const session=createGameSession({storage:{getItem:k=>values.get(k)??null,setItem(k,v){if(deny)throw Error('quota');values.set(k,v);}},now:()=>T,setTimer:()=>1,clearTimer:()=>{}});
  session.start();deny=true;
  assert.equal(session.change(state=>game.enhancePersonalEquipment(state,T,'generalSword',()=>{rolls++;return 9999;})).success,false);
  const gold=session.state.gold;deny=false;session.flush();session.pause();session.start();
  assert.equal(session.state.gold,gold);assert.equal(session.state.personalLevels.generalSword,2);assert.equal(rolls,1);
  session.pause();
});
