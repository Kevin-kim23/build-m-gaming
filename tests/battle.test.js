import { test } from "node:test";
import assert from "node:assert/strict";
import { freshState } from "../src/game.js";
import { EQUIPMENT } from "../src/equipment.js";
import {
  BATTLE_RULES, STAGES, UNIT_TRAITS, battleAccess, defaultLoadout, normalizeLoadout,
  createBattle, advanceBattle, deploy, battleSlots, equipmentCombatStats, matchupMultiplier, stageEnemyType,
  classMatchup, fortressShieldClass, isFortress, enemyLane,
} from "../src/battle.js";
import { enemyStack } from "../src/battle-balance.js";
import { quietBattle, until, deployNow, play } from "./lane-helpers.js";

function army(power = 1280, level = 3) {
  return { ...freshState(1000), soldiers: power - 600, sergeants: 40, staffSergeants: 10,
    campaignCleared: 80,
    equipment: Object.fromEntries(["artillery", "tank", "selfPropelled"].map((id) => [id, { level, deployed: true }])),
  };
}
test("battle menu previews at private first class and captain needs military equipment to enter", () => {
  assert.equal(battleAccess(freshState(0)).visible,false);
  assert.equal(battleAccess({ ...freshState(0), soldiers: 4 }).visible,true);
  const s={...freshState(0),soldiers:320};
  assert.equal(battleAccess(s).unlocked,false);
  s.equipment.artillery={level:0,count:1,deployed:true};
  assert.equal(battleAccess(s).unlocked,true);
  s.soldiers=319;assert.equal(battleAccess(s).unlocked,false);
  assert.throws(()=>createBattle(s,1),RangeError);
});

test("eighty conquest regions enforce sequential progress across four countries", () => {
  assert.equal(STAGES.length, 80);
  assert.equal(new Set(STAGES.map(s=>s.name)).size,80);
  const s = { ...army(), campaignCleared: 0 };
  assert.equal(createBattle(s, 1).stageId, 1);
  assert.throws(() => createBattle(s, 2), RangeError);
  assert.throws(() => createBattle(s, 81), RangeError);
  assert.throws(() => createBattle(s, "1"), RangeError);
  s.campaignCleared = 1;
  assert.equal(createBattle(s, 2).stageId, 2);
});

test("deployment is equipment only, limited by rank slots, and rejects unknown or unowned equipment", () => {
  const s = army();
  s.equipment.tank = null;
  s.equipment.artillery.deployed = false;
  const chosen = normalizeLoadout(s, { units: { soldier: 5 }, equipment: ["artillery", "artillery", "tank", "unknown"] });
  assert.deepEqual(chosen, { equipment: ["artillery"] });
  assert.deepEqual(defaultLoadout(s).equipment.sort(), ["artillery", "selfPropelled"]);
  assert.throws(() => createBattle(army(), 1, { equipment: [] }), RangeError);
  assert.equal(createBattle(army(), 1, { units: { soldier: 10 }, equipment: ["tank"] }).player.units.length, 0);
  assert.deepEqual(createBattle(army(), 1, { equipment: ["tank"] }).deck.map((c) => c.id), ["tank"]);
});

test("slots: 3 at lieutenant colonel, +1 each at brigadier, lieutenant general and general", () => {
  assert.equal(battleSlots(army(1280)), 3);
  assert.equal(battleSlots(army(20480)), 3);
  const slots = [327680, 655360, 1310720].map((p) => battleSlots({ ...army(p), soldiers: p - 10000 }));
  assert.ok(slots.every((n) => n >= 3 && n <= 6));
  const many = { ...army(327680), equipment: Object.fromEntries(Object.keys(EQUIPMENT).map((id) => [id, { level: 1, deployed: true }])) };
  assert.equal(normalizeLoadout(many, { equipment: Object.keys(EQUIPMENT) }).equipment.length, battleSlots(many));
  assert.equal(defaultLoadout(many).equipment.length, battleSlots(many));
});

test("campaign base HP grows continuously with total army power and the enemy base matches the stage", () => {
  for (const [power, hp] of [[1280, 1280], [5120, 5120], [10240, 10240], [20480, 20480], [81920, 81920], [327680, 327680]]) {
    const b = createBattle(army(power), 1);
    assert.equal(b.player.hq.hp, hp);
    assert.equal(b.player.hq.maxHp, hp);
  }
  for (const stage of STAGES) {
    const b = createBattle(army(), stage.id);
    assert.equal(b.enemy.hq.maxHp, stage.hqPower);
    assert.equal(b.enemy.hq.id, stage.formationId);
    assert.equal(b.enemy.units.length, 0, "the enemy starts with an empty lane and sends units over time");
  }
});

test('advancing turret fire leaves the input battle unchanged and reproducible',()=>{
  const b=deploy(createBattle(army(),1),'artillery',0);
  b.player.units[0].x=950;b.enemy.turret.nextShotMs=0;
  const before=structuredClone(b),first=advanceBattle(b,50);
  assert.deepEqual(b,before);
  assert.deepEqual(advanceBattle(b,50),first);
  assert.notEqual(first.enemy.turret.nextShotMs,b.enemy.turret.nextShotMs);
});

test("mana: starts at 40, fills 8 per second up to 100, and a card needs enough mana and no cooldown", () => {
  let b = createBattle(army(), 1);
  assert.equal(b.mana, BATTLE_RULES.manaStart);
  assert.equal(deploy(b, "unknown"), b);
  const cheap = deploy(b, "artillery");
  assert.notEqual(cheap, b);
  assert.equal(cheap.mana, BATTLE_RULES.manaStart - UNIT_TRAITS.artillery.cost);
  assert.equal(cheap.player.units.length, 1);
  assert.equal(deploy(cheap, "artillery"), cheap, "same card is on cooldown");
  b.mana = 5;
  assert.equal(deploy(b, "artillery"), b, "not enough mana");
  b = advanceBattle(createBattle(army(), 1), 250);
  assert.ok(Math.abs(b.mana - (BATTLE_RULES.manaStart + BATTLE_RULES.manaPerSecond * 0.25)) < 1e-9);
  b = createBattle(army(), 1); b.mana = 99.9; b = advanceBattle(b, 250);
  assert.equal(b.mana, BATTLE_RULES.manaMax);
});

test("a deployed gear becomes a unit with stats from its level and count, then waits for its cooldown", () => {
  const state = army(); state.equipment.tank = { level: 3, count: 2, deployed: true };
  const b = deployNow(quietBattle(state, 1, ["tank"]), "tank"), u = b.player.units[0], stats = equipmentCombatStats("tank", 3, 1280, 2);
  assert.equal(u.cls, "armor"); assert.equal(u.count, 2);
  assert.equal(u.damage, stats.damage); assert.equal(u.intervalMs, stats.intervalMs);
  assert.equal(b.deck[0].readyMs, b.elapsedMs + UNIT_TRAITS.tank.cooldownMs);
  state.equipment.tank.level = 10; assert.equal(u.level, 3, "later upgrades never change a battle in progress");
});

test("units march toward the enemy base, stop to fire at the nearest foe in range, and win by destroying the base", () => {
  let b = deployNow(quietBattle(army(327680), 1, ["artillery"]), "artillery");
  const x0 = b.player.units[0].x; b = until(b, 1000);
  assert.ok(b.player.units[0].x > x0, "advances");
  b = until(b, 120_000);
  assert.equal(b.status, "victory"); assert.equal(b.enemy.hq.hp, 0);
  const near = createBattle(army(), 1); near.enemy.nextSpawnMs = Infinity;
  const mine = deployNow(near, "tank"), foe = { ...mine.player.units[0], side: "enemy", uid: 99, dir: -1, x: 200, hp: 1e9, maxHp: 1e9, damage: 0 };
  mine.enemy.units.push(foe);
  const fought = until(mine, 4000);
  assert.ok(fought.enemy.units[0].hp < 1e9, "the tank shoots the enemy unit before moving past it");
});

test("class triangle: air beats armor, armor beats firepower, firepower beats air; stronger in later countries", () => {
  assert.equal(classMatchup("air", "armor", 1), 1.3); assert.equal(classMatchup("armor", "air", 1), 0.8);
  assert.equal(classMatchup("armor", "firepower", 1), 1.3); assert.equal(classMatchup("firepower", "armor", 1), 0.8);
  assert.equal(classMatchup("firepower", "air", 1), 1.3); assert.equal(classMatchup("air", "firepower", 1), 0.8);
  assert.equal(classMatchup("armor", "armor", 1), 1); assert.equal(classMatchup("support", "armor", 1), 1);
  assert.deepEqual([1, 21, 41, 61].map((id) => classMatchup("air", "armor", id)), [1.3, 1.4, 1.5, 1.6]);
  assert.deepEqual([22, 23, 24, 25].map((id) => stageEnemyType(id).id), ["armored", "artilleryNest", "airWing", "armored"]);
  assert.equal(matchupMultiplier(22, "helicopter"), 1.4); assert.equal(matchupMultiplier(22, "artillery"), 0.7);
});

test("one shot from the counter class deals x1.3 and from the wrong class x0.8 against an armored target", () => {
  const state = army(81920); state.equipment.helicopter = { level: 3, count: 1, deployed: true };
  const firstShot = (id) => {
    let b = deployNow(quietBattle(state, 1, [id]), id);
    const u = b.player.units[0];
    b.enemy.units.push({ ...u, side: "enemy", uid: 99, dir: -1, cls: "armor", x: u.x + 40, hp: 1e12, maxHp: 1e12, damage: 0, nextShotMs: Infinity });
    b = until(b, u.nextShotMs + 50);
    return { dealt: 1e12 - b.enemy.units[0].hp, unitDamage: u.damage };
  };
  const air = firstShot("helicopter"), fire = firstShot("artillery");
  assert.ok(Math.abs(air.dealt - air.unitDamage * 1.3) < 1e-3);
  assert.ok(Math.abs(fire.dealt - fire.unitDamage * 0.8) < 1e-3);
});

test("enemy sends its stage-type pool over time with stage stats", () => {
  for (const id of [1, 2, 3]) {
    const type = stageEnemyType(id), stage = STAGES[id - 1];
    let b = createBattle(army(), id);
    b = until(b, stage.spawnMs * 2 + stage.enemyFirstSpawnMs);
    assert.ok(b.enemy.units.length >= 2);
    assert.deepEqual(b.enemy.units.slice(0, 2).map((u) => u.id), [type.pool[0],type.pool[1%type.pool.length]]);
    const u = b.enemy.units[0];
    assert.ok(Math.abs(u.damage - equipmentCombatStats(u.id, stage.enemyLevel, stage.enemyPower, 1, false).damage * stage.enemyModifier * enemyStack(id, stage.enemyLevel)) < 1e-6);
  }
});

test("base turrets shoot units that come close; fortress turrets are stronger", () => {
  const b = quietBattle(army(), 1, ["tank"]); const e = quietBattle(army(), 20, ["tank"]);
  assert.ok(e.enemy.turret.damage > b.enemy.turret.damage * 1.5);
  const c = deployNow(b, "tank"); c.player.units[0].x = 900; c.player.units[0].hp = 1e12; c.player.units[0].maxHp = 1e12;
  const d = until(c, 3000);
  assert.ok(d.player.units[0].hp < 1e12 || d.status !== "running");
});

test("capital fortress: harder base, a visible fortress marker, and the counter class does less to the base", () => {
  for (const stage of STAGES.filter((s) => s.capital)) {
    const before = STAGES[stage.id - 2];
    assert.ok(stage.hqPower / stage.recommendedPower > before.hqPower / before.recommendedPower);
    const shield = fortressShieldClass(stage.id); assert.equal(shield, stageEnemyType(stage.id).counter);
    assert.equal(isFortress(stage.id), true);
  }
  assert.equal(fortressShieldClass(19), null);
  const s = army(); s.equipment.tank = { level: 3, count: 1, deployed: true };
  let b = createBattle(s, 20, { equipment: ["tank"] });
  assert.equal(b.enemy.fortress, "serdin");
  b = advanceBattle(advanceBattle(b, 50), 50);
  assert.equal(b.enemy.fortress, "serdin");
  assert.equal(createBattle(s, 19, { equipment: ["tank"] }).enemy.fortress, null);
  // 이 지역(포병 진지)을 잡는 정석은 기갑 → 요새 기지는 기갑 피해를 40% 덜 받는다.
  const strike = (id) => { const t = army(); t.equipment[id] = { level: 3, count: 1, deployed: true }; const q = quietBattle(t, 20, [id]); q.enemy.hq.hp = q.enemy.hq.maxHp = 1e12; return 1e12 - deployNow(q, id).enemy.hq.hp; };
  const t = army(); t.equipment.icbm = { level: 3, count: 1, deployed: true };
  assert.equal(strike("icbm") > 0, true);
});

test("fixed-step combat is deterministic and frame delay cannot produce offline battle", () => {
  const b = createBattle(army(), 1), slow = advanceBattle(b, 50_000);
  assert.equal(slow.elapsedMs, BATTLE_RULES.maxFrameMs);
  let small = b;
  for (let i = 0; i < 5; i++) small = advanceBattle(small, 50);
  assert.deepEqual(small, advanceBattle(b, 250));
  assert.deepEqual(advanceBattle(advanceBattle(b, 23), 27), advanceBattle(b, 50));
  for (const dt of [0, -1, NaN, Infinity]) assert.equal(advanceBattle(b, dt), b);
  assert.equal(b.elapsedMs, 0);
});

test("simultaneous base destruction draws and a finished battle cannot deploy or advance", () => {
  const b = createBattle(army(), 1);
  b.player.hq.hp = b.enemy.hq.hp = 0;
  const done = advanceBattle(b, 50);
  assert.equal(done.status, "draw");
  assert.equal(deploy(done, "artillery"), done);
  assert.equal(advanceBattle(done, 250), done);
});

test("without ever sending equipment you cannot win; sending equipment wins the opening region", () => {
  assert.notEqual(play(army(327680), 1, { policy: "none" }).status, "victory");
  assert.equal(play(army(327680), 1).status, "victory");
  assert.notEqual(play(army(1280), 1, { policy: "none" }).status, "victory");
});

test("the three-minute limit ends a surviving battle as a draw", () => {
  const battle = createBattle(army(), 1);
  battle.elapsedMs = BATTLE_RULES.maxDurationMs - BATTLE_RULES.stepMs;
  battle.enemy.nextSpawnMs = Infinity;
  const result = advanceBattle(battle, BATTLE_RULES.stepMs);
  assert.equal(result.elapsedMs, BATTLE_RULES.maxDurationMs);
  assert.equal(result.status, "draw");
  assert.ok(result.player.hq.hp > 0 && result.enemy.hq.hp > 0);
  assert.equal(advanceBattle(result, 250), result);
});

test("all ten enhancements increase both damage and automatic attack speed", () => {
  for (const id of Object.keys(EQUIPMENT)) {
    let previous = equipmentCombatStats(id, 0);
    for (let level = 1; level <= 10; level++) {
      const current = equipmentCombatStats(id, level);
      assert.ok((current.healing ?? current.damage) > (previous.healing ?? previous.damage));
      assert.ok(current.intervalMs < previous.intervalMs);
      previous = current;
    }
  }
  assert.throws(() => equipmentCombatStats("tank", 31), RangeError);
  const colonel = createBattle(army(5120), 3), general = createBattle(army(10240), 3);
  assert.equal(colonel.player.hq.hp * 2, general.player.hq.hp);
});

test("lanes: a card goes to the chosen lane (0 left, 1 middle, 2 right); invalid lanes do nothing", () => {
  const b = createBattle(army(), 1);
  for (const lane of [0, 1, 2]) assert.equal(deploy(b, "tank", lane).player.units[0].lane, lane);
  assert.equal(deploy(b, "tank").player.units[0].lane, 1, "default is the middle lane");
  for (const lane of [-1, 3, 1.5, "1", NaN, null]) assert.equal(deploy(b, "tank", lane), b);
  assert.equal(BATTLE_RULES.lanes, 3);
});

test("units only fight foes in their own lane and ignore other lanes until they reach a base", () => {
  const state = army(); state.equipment.artillery = { level: 3, deployed: true };
  let b = deployNow(quietBattle(state, 1, ["artillery"]), "artillery", 0);
  const u = b.player.units[0];
  b.enemy.units.push({ ...u, side: "enemy", uid: 99, dir: -1, lane: 2, x: 500, hp: 1e12, maxHp: 1e12, damage: 0, nextShotMs: Infinity });
  b = until(b, 6000);
  assert.equal(b.enemy.units[0].hp, 1e12, "no damage across lanes");
  assert.ok(b.player.units[0].x > u.x, "the unit keeps marching up its own lane");
  let c = deployNow(quietBattle(state, 1, ["artillery"]), "artillery", 2);
  c.enemy.units.push({ ...c.player.units[0], side: "enemy", uid: 99, dir: -1, lane: 2, x: c.player.units[0].x + 40, hp: 1e12, maxHp: 1e12, damage: 0, nextShotMs: Infinity });
  c = until(c, 6000);
  assert.ok(c.enemy.units[0].hp < 1e12, "same lane: the artillery shoots it");
});

test("enemies appear without warning in a fixed, repeatable lane order that uses all three lanes", () => {
  for (const id of [1, 20, 41]) {
    const lanes = Array.from({ length: 30 }, (_, n) => enemyLane(id, n));
    assert.deepEqual(lanes, Array.from({ length: 30 }, (_, n) => enemyLane(id, n)), "deterministic");
    assert.ok(lanes.every((l) => [0, 1, 2].includes(l)));
    for (const l of [0, 1, 2]) assert.ok(lanes.filter((x) => x === l).length >= 4, `lane ${l} is used for stage ${id}`);
  }
  let b = createBattle(army(), 1); b = until(b, STAGES[0].enemyFirstSpawnMs + 100);
  assert.equal(b.enemy.units[0].lane, enemyLane(1, 0));
});
