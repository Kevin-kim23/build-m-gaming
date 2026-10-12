import { SAVE_VERSION } from '../src/state.js';
import { serializeSave, exact } from '../src/money.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, buyEquipment, enhanceEquipment, buyAdditionalEquipment, setEquipmentDeployed, parseSave, perSecond, perTap, MAX_GOLD, MAX_OFFLINE_MS, accrue, SAVE_KEY } from '../src/game.js';
import { EQUIPMENT, MAX_EQUIPMENT_COUNT, additionalEquipmentCost, additionalEquipmentOffer, equipmentStats, deployedEquipment } from '../src/equipment.js';
import { equipmentCombatStats, UNIT_TRAITS } from '../src/battle.js';
import { quietBattle, deployNow } from './lane-helpers.js';
import { createGameSession } from '../src/session.js';
import { RANKS, RANK_REQUIREMENTS } from '../src/ranks.js';
const T = 1_800_000_000_000;
const legacyEquipment=Object.values(EQUIPMENT).filter(item=>(item.introducedVersion??0)<34).map(item=>item.id);
const army = () => ({ ...freshState(T), soldiers: RANK_REQUIREMENTS[RANKS.indexOf('대원수')] - 3000, sergeants: 300, gold:100_000_000_000_000, ncoSchoolLevel: 5, officerSchoolLevel: 1 });
function maxGun(s, id) { assert.equal(buyEquipment(s,T,id).ok,true); for(let n=0;n<10;n++) assert.equal(enhanceEquipment(s,T,id).ok,true); }

test('legacy quotes remain calculable but additional purchases are locked', () => {
  for (const id of legacyEquipment) {
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
  const s = army(); for(const id of legacyEquipment) maxGun(s,id);
  assert.equal(deployedEquipment(s).length,legacyEquipment.length);
  setEquipmentDeployed(s,false,T,'rocketLauncher');
  const income = perSecond(s), tap = perTap(s,T), before = s.gold, stats = equipmentStats(10,'tank');
  accrue(s,T+1000);s.equipment.tank.count=2;
  assert.equal(s.gold,before + income);
  // Tablet ×1.3, glaive ×2.2 / compass ×1.4, seal ×1.2 apply to the added copy.
  const passiveDelta=stats.passive*130/100*220/100*120/100,tapDelta=stats.tap*130/100*140/100*120/100;
  assert.equal(perSecond(s),income+passiveDelta); assert.equal(perTap(s,T),tap+tapDelta);
  const beforeStored = perSecond(s);
  s.equipment.rocketLauncher.count=2;
  assert.equal(perSecond(s),beforeStored); assert.equal(deployedEquipment(s).length,legacyEquipment.length-1);
  setEquipmentDeployed(s,false,T+1000,'tank');
  assert.equal(perSecond(s),beforeStored - passiveDelta*2);
  setEquipmentDeployed(s,true,T+1000,'rocketLauncher');
  assert.equal(perSecond(s),beforeStored - passiveDelta*2 + equipmentStats(10,'rocketLauncher').passive*2*130/100*220/100*120/100);
  assert.deepEqual(parseSave(serializeSave(s),T).equipment,s.equipment);
});
test('v12 quantity migration preserves all assets, deployment, theme and running cooldown', () => {
  const old = {...army(),version:12,fieldTheme:'concrete',swordActivatedAt:T-1000,taps:987,battleCleared:3};
  for(const [i,id] of ['artillery','tank','selfPropelled','helicopter','rocketLauncher'].entries())old.equipment[id]={level:i+5,deployed:i<4};
  const next = parseSave(serializeSave(old),T);
  for(const key of ['gold','soldiers','sergeants','fieldTheme','swordActivatedAt','taps','battleCleared'])assert.equal(next[key],old[key]);
  assert.equal(next.version, SAVE_VERSION);
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
test('legacy copies deploy as a single weapon without accelerating or duplicating selected ids', () => {
  const s = army();maxGun(s,'tank');s.equipment.tank.count=2;s.campaignCleared=80;
  const one = equipmentCombatStats('tank',10,s.soldiers+3000);
  const battle = deployNow(quietBattle(s,1,['tank','tank']),'tank');
  assert.equal(battle.deck.length,1);assert.equal(battle.player.units.length,1);
  const unit=battle.player.units[0];
  assert.equal(unit.count,1);assert.equal(unit.damage,one.damage);assert.equal(unit.intervalMs,one.intervalMs);
  assert.equal(unit.maxHp,one.hp,'legacy copies do not multiply combat HP');
});
test('large valid quantities retain exact arithmetic and clamp offline income to wallet limit', () => {
  const s = army();
  for(const [i,id] of Object.keys(EQUIPMENT).entries())s.equipment[id]={count:MAX_EQUIPMENT_COUNT,level:20,deployed:i>=Object.keys(EQUIPMENT).length-4};
  s.gold=MAX_GOLD-1n;
  assert.ok(exact(perSecond(s))>0n); assert.ok(exact(perTap(s,T))>0n);
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
