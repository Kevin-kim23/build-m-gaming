import { serializeSave } from '../src/money.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, buyEquipment, enhanceEquipment, buyAdditionalEquipment, setEquipmentDeployed, parseSave, perSecond, perTap, MAX_GOLD, MAX_OFFLINE_MS, accrue, SAVE_KEY } from '../src/game.js';
import { EQUIPMENT, MAX_EQUIPMENT_COUNT, additionalEquipmentCost, additionalEquipmentOffer, equipmentStats, deployedEquipment } from '../src/equipment.js';
import { createBattle, advanceBattle, equipmentCombatStats } from '../src/battle.js';
import { createGameSession } from '../src/session.js';
import { RANKS, RANK_REQUIREMENTS } from '../src/ranks.js';
const T = 1_800_000_000_000;
const army = () => ({ ...freshState(T), soldiers: RANK_REQUIREMENTS[RANKS.indexOf('원수')] - 3000, sergeants: 300, gold:100_000_000_000_000, ncoSchoolLevel: 5, officerSchoolLevel: 1 });
function maxGun(s, id) { assert.equal(buyEquipment(s,T,id).ok,true); for(let n=0;n<10;n++) assert.equal(enhanceEquipment(s,T,id).ok,true); }

test('legacy quotes remain calculable but additional purchases are locked', () => {
  for (const id of Object.keys(EQUIPMENT)) {
    const s = army(), before = s.gold;
    maxGun(s,id);
    const total = before - s.gold;
    assert.equal(additionalEquipmentCost(id),total);
    s.gold = total * 2;
    for (const count of [2,3]) {
      assert.deepEqual(buyAdditionalEquipment(s,T,id),{ok:false,reason:'disabled'});assert.equal(s.equipment[id].count,1);
      assert.equal(s.equipment[id].level,10);
    }
    assert.equal(s.gold,total*2);
    assert.equal(buyEquipment(s,T,id).reason,'owned');
  }
});
test('repeat purchase remains disabled regardless of flags, ownership, enhancement, gold or capacity', () => {
  const s = army(); maxGun(s,'tank'); const cost = additionalEquipmentCost('tank');
  for (const [patch, gear, reason] of [
    [{soldiers:7240},s.equipment.tank,'locked'],
    [{sergeants:299},s.equipment.tank,'locked'],
    [{},null,'unowned'], [{},{level:9,deployed:true,count:1},'enhancement'],
    [{gold:cost-1},s.equipment.tank,'gold'],
    [{},{level:10,deployed:true,count:MAX_EQUIPMENT_COUNT},'limit'],
  ]) {
    const state = {...structuredClone(s),...patch,equipment:{...s.equipment,tank:gear ? {...gear} : null}}, before = structuredClone(state);
    assert.equal(additionalEquipmentOffer(state,'tank').reason,'disabled');
    assert.equal(buyAdditionalEquipment(state,T,'tank').reason,'disabled');
    assert.deepEqual(state,before);
  }
  const before = structuredClone(s);
  assert.throws(()=>buyAdditionalEquipment(s,T+1000,'unknown'),RangeError); assert.deepEqual(s,before);
});
test('quantity calculation compatibility retains one slot and sums per copy', () => {
  const s = army(); for(const id of Object.keys(EQUIPMENT)) maxGun(s,id);
  assert.equal(deployedEquipment(s).length,4); assert.equal(s.equipment.rocketLauncher.deployed,false);
  const income = perSecond(s), tap = perTap(s,T), before = s.gold, stats = equipmentStats(10,'tank');
  accrue(s,T+1000);s.equipment.tank.count=2;
  assert.equal(s.gold,before + income);
  assert.equal(perSecond(s),income + stats.passive*220/100); assert.equal(perTap(s,T),tap + stats.tap);
  const beforeStored = perSecond(s);
  s.equipment.rocketLauncher.count=2;
  assert.equal(perSecond(s),beforeStored); assert.equal(deployedEquipment(s).length,4);
  assert.equal(setEquipmentDeployed(s,true,T+1000,'rocketLauncher').reason,'capacity');
  setEquipmentDeployed(s,false,T+1000,'tank');
  assert.equal(perSecond(s),beforeStored - stats.passive * 2*220/100);
  setEquipmentDeployed(s,true,T+1000,'rocketLauncher');
  assert.equal(perSecond(s),beforeStored - stats.passive * 2*220/100 + equipmentStats(10,'rocketLauncher').passive * 2*220/100);
  assert.deepEqual(parseSave(serializeSave(s),T).equipment,s.equipment);
});
test('v12 quantity migration preserves all assets, deployment, theme and running cooldown', () => {
  const old = {...army(),version:12,fieldTheme:'concrete',swordActivatedAt:T-1000,taps:987,battleCleared:3};
  for(const [i,id] of ['artillery','tank','selfPropelled','helicopter','rocketLauncher'].entries())old.equipment[id]={level:i+5,deployed:i<4};
  const next = parseSave(serializeSave(old),T);
  for(const key of ['gold','soldiers','sergeants','fieldTheme','swordActivatedAt','taps','battleCleared'])assert.equal(next[key],old[key]);
  assert.equal(next.version, 20);
  for(const id of ['artillery','tank','selfPropelled','helicopter','rocketLauncher'])assert.deepEqual(next.equipment[id],{...old.equipment[id],count:1});
  assert.equal(next.equipment.transport,null);assert.equal(next.equipment.fighter,null);
  old.equipment.tank.count = 900;
  assert.equal(parseSave(serializeSave(old),T).equipment.tank.count,1);
  assert.deepEqual(parseSave(serializeSave(next),T),next);
});
test('current saves reject missing, malformed and impossible quantities', () => {
  const s = army();maxGun(s,'tank');
  for(const count of [undefined,null,0,-1,1.2,'2',MAX_EQUIPMENT_COUNT+1]) {
    s.equipment.tank.count=count;assert.equal(parseSave(serializeSave(s),T),null);
  }
  s.equipment.tank={level:9,deployed:true,count:2}; assert.equal(parseSave(serializeSave(s),T),null);
  s.equipment.tank.level=10;assert.equal(parseSave(serializeSave(s),T).equipment.tank.count,2);
});
test('one grouped volley adds all copies without accelerating or duplicating selected ids', () => {
  const s = army();maxGun(s,'tank');s.equipment.tank.count=2;
  const one = equipmentCombatStats('tank',10,s.soldiers+3000);
  let battle = createBattle(s,1,{units:{},equipment:['tank','tank']});
  assert.equal(battle.player.equipment.length,1); assert.equal(battle.player.equipment[0].count,2);
  assert.equal(battle.player.equipment[0].damage,one.damage*2);assert.equal(battle.player.equipment[0].intervalMs,one.intervalMs);
  const hp = battle.enemy.hq.hp;
  for(let ms=0;ms<one.intervalMs;ms+=50)battle=advanceBattle(battle,50);
  assert.equal(battle.enemy.hq.hp,Math.max(0,hp-one.damage*2));
  assert.ok(battle.enemy.equipment.every(g=>g.count===1));
});
test('large valid quantities retain exact arithmetic and clamp offline income to wallet limit', () => {
  const s = army();
  for(const [i,id] of Object.keys(EQUIPMENT).entries())s.equipment[id]={count:MAX_EQUIPMENT_COUNT,level:20,deployed:i>=Object.keys(EQUIPMENT).length-4};
  s.gold=MAX_GOLD-1n;
  assert.ok(Number.isSafeInteger(perSecond(s))); assert.ok(Number.isSafeInteger(perTap(s,T)));
  accrue(s,T+MAX_OFFLINE_MS);assert.equal(s.gold,MAX_GOLD);assert.equal(s.incomeRemainder,0);
  assert.ok(parseSave(serializeSave(s),T));
});
test('blocked additional purchase never creates copies after checkpoint, reload or inactive calls', () => {
  const initial = army();maxGun(initial,'tank');initial.gold=additionalEquipmentCost('tank');
  const values=new Map([[SAVE_KEY,serializeSave(initial)]]),writes=[];
  const storage={getItem:key=>values.get(key)??null,setItem(key,value){writes.push(key);values.set(key,value);}};
  const session=createGameSession({storage,now:()=>T,setTimer:()=>1,clearTimer:()=>{}});
  session.start();assert.equal(session.change(s=>buyAdditionalEquipment(s,T,'tank')).reason,'disabled');
  assert.deepEqual(writes,[SAVE_KEY]);
  assert.equal(values.has(SAVE_KEY+'-backup'),false);
  session.pause();session.start();assert.equal(session.state.equipment.tank.count,1);assert.equal(session.state.gold,initial.gold);
  session.pause();assert.equal(session.change(s=>buyAdditionalEquipment(s,T,'tank')),undefined);
});
