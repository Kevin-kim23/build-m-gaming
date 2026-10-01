import { test } from "node:test";
import assert from "node:assert/strict";
import { freshState } from "../src/game.js";
import { EQUIPMENT } from "../src/equipment.js";
import {
  BATTLE_RULES, STAGES, battleAccess, defaultLoadout, normalizeLoadout,
  createBattle, advanceBattle, useSpecial, battleSlots, equipmentCombatStats, matchupMultiplier, stageEnemyType,
} from "../src/battle.js";

function army(power = 1280, level = 3) {
  return { ...freshState(1000), soldiers: power - 600, sergeants: 40, staffSergeants: 10,
    campaignCleared: 80,
    equipment: Object.fromEntries(["artillery", "tank", "selfPropelled"].map((id) => [id, { level, deployed: true }])),
  };
}
// 필살기를 쓸 수 있을 때마다 바로 쓰는 플레이어(special=false면 자동 공격만).
function simulate(state, stageId, special = true, loadout) {
  let battle = createBattle(state, stageId, loadout);
  while (battle.status === "running") {
    if (special) for (const gun of battle.player.equipment) battle = useSpecial(battle, gun.id);
    battle = advanceBattle(battle, 50);
  }
  return battle;
}

test("battle menu appears at private first class and entry uses the sergeant-gated lieutenant colonel rank", () => {
  assert.deepEqual(battleAccess(freshState(0)), { visible: false, unlocked: false });
  assert.deepEqual(battleAccess({ ...freshState(0), soldiers: 4 }), { visible: true, unlocked: false });
  assert.equal(battleAccess(army(1279)).unlocked, false);
  assert.equal(battleAccess(army(1280)).unlocked, true);
  const bypass = { ...army(327680), sergeants: 39 };
  assert.equal(battleAccess(bypass).unlocked, false);
  assert.throws(() => createBattle(bypass, 1), RangeError);
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

test("campaign headquarters HP grows continuously with total army power", () => {
  for (const [power, hp] of [[1280, 1280], [5120, 5120], [10240, 10240], [20480, 20480], [81920, 81920], [327680, 327680]]) {
    const b = createBattle(army(power), 1);
    assert.equal(b.player.hq.hp, hp);
    assert.equal(b.player.hq.maxHp, hp);
  }
  for (const stage of STAGES) {
    const b = createBattle(army(), stage.id);
    assert.equal(b.enemy.hq.maxHp, stage.hqPower);
    assert.equal(b.enemy.hq.id, stage.formationId);
    assert.equal(b.enemy.equipment.length, 3);
  }
});

test("a special fires one deployed gear for burst damage, then waits for its cooldown, without touching the save", () => {
  const state = army(), saved = structuredClone(state), initial = createBattle(state, 1);
  assert.equal(useSpecial(initial, "artillery"), initial, "not ready before the first-ready time");
  const ready = advanceBattle({ ...initial, elapsedMs: BATTLE_RULES.specialFirstReadyMs, remainderMs: 0 }, 50);
  const before = structuredClone(ready), fired = useSpecial(ready, "artillery");
  assert.deepEqual(ready, before);
  const gun = ready.player.equipment.find((g) => g.id === "artillery");
  assert.ok(Math.abs(ready.enemy.hq.hp - fired.enemy.hq.hp - gun.damage * BATTLE_RULES.specialMultiplier) < 1e-8);
  assert.equal(fired.player.equipment.find((g) => g.id === "artillery").specialReadyMs, ready.elapsedMs + BATTLE_RULES.specialCooldownMs);
  assert.equal(useSpecial(fired, "artillery"), fired);
  assert.equal(useSpecial(ready, "unknown"), ready);
  assert.notEqual(useSpecial(ready, "tank"), ready);
  assert.deepEqual(state, saved);
  state.equipment.artillery.level = 10;
  assert.equal(fired.player.equipment.find((g) => g.id === "artillery").level, 3);
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
  assert.throws(() => equipmentCombatStats("tank", 21), RangeError);
  const colonel = createBattle(army(5120), 3), general = createBattle(army(10240), 3);
  assert.equal(colonel.player.hq.hp * 2, general.player.hq.hp);
  assert.equal(general.player.equipment[0].damage, colonel.player.equipment[0].damage * 2);
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

test("both sides' equipment and enemy infantry attack without player taps", () => {
  let b = createBattle(army(), 1);
  for (let i = 0; i < 70; i++) b = advanceBattle(b, 50);
  assert.ok(b.player.hq.hp < b.player.hq.maxHp);
  assert.ok(b.enemy.hq.hp < b.enemy.hq.maxHp);
  assert.equal(b.player.units.length, 0);
  assert.ok(b.enemy.units.every((u) => u.lastShotMs > 0));
  assert.ok(b.player.equipment.every((g) => g.lastShotMs > 0));
  assert.ok(b.enemy.equipment.every((g) => g.lastShotMs > 0));
});

test("simultaneous headquarters destruction draws and a finished battle cannot fire or advance", () => {
  const b = createBattle(army(), 1);
  b.player.hq.hp = b.enemy.hq.hp = 1;
  b.player.equipment[0].nextShotMs = b.enemy.equipment[0].nextShotMs = 50;
  const done = advanceBattle(b, 50);
  assert.equal(done.status, "draw");
  assert.equal(done.player.hq.hp, 0);
  assert.equal(done.enemy.hq.hp, 0);
  assert.equal(useSpecial(done, "artillery"), done);
  assert.equal(advanceBattle(done, 250), done);
});

test("conquest opening requires a developed army and cannot be won by the old entry force", () => {
  assert.equal(simulate(army(327680,10),1).status,'victory');
  assert.equal(simulate(army(1280,10),1).status,'defeat');
});

test("the three-minute limit ends a surviving battle as a draw", () => {
  const battle = createBattle(army(), 1);
  battle.elapsedMs = BATTLE_RULES.maxDurationMs - BATTLE_RULES.stepMs;
  const result = advanceBattle(battle, BATTLE_RULES.stepMs);
  assert.equal(result.elapsedMs, BATTLE_RULES.maxDurationMs);
  assert.equal(result.status, "draw");
  assert.ok(result.player.hq.hp > 0 && result.enemy.hq.hp > 0);
  assert.equal(advanceBattle(result, 250), result);
});

test("matchups: stage type rotates, strong x1.3, weak x0.8, healing untouched, default loadout prefers the advantage", () => {
  assert.deepEqual([1, 2, 3, 4].map((id) => stageEnemyType(id).id), ["armored", "airDefense", "artilleryNest", "armored"]);
  assert.equal(matchupMultiplier(1, "helicopter"), 1.3);
  assert.equal(matchupMultiplier(1, "artillery"), 0.8);
  assert.equal(matchupMultiplier(1, "tank"), 1);
  assert.equal(matchupMultiplier(2, "artillery"), 1.3);
  assert.equal(matchupMultiplier(3, "tank"), 1.3);
  const s = army(); s.equipment.helicopter = { level: 3, deployed: true };
  const b = createBattle(s, 1, { equipment: ["helicopter", "artillery"] });
  const dmg = (id) => b.player.equipment.find((g) => g.id === id).damage;
  assert.ok(dmg("helicopter") / equipmentCombatStats("helicopter", 3, 1280).damage > dmg("artillery") / equipmentCombatStats("artillery", 3, 1280).damage);
  assert.ok(defaultLoadout(s, 1).equipment.includes("helicopter"));
});

test("enemy gear differs by stage type but total enemy gear power stays equal to the old three-gun roster", async () => {
  const { ENEMY_TYPES, ENEMY_EQUIPMENT, enemyBalanceFactor } = await import("../src/battle-balance.js");
  assert.equal(new Set(ENEMY_TYPES.map((t) => t.gear.join())).size, 3);
  const raw = (ids, factor = 1) => ids.reduce((n, id) => { const c = equipmentCombatStats(id, 5, 1280, 1, false); return n + c.damage / c.intervalMs * factor; }, 0);
  for (const id of [1, 2, 3]) {
    const type = stageEnemyType(id), b = createBattle(army(), id);
    assert.deepEqual(b.enemy.equipment.map((g) => g.id), type.gear);
    assert.ok(Math.abs(raw(type.gear, enemyBalanceFactor(id)) - raw(ENEMY_EQUIPMENT)) / raw(ENEMY_EQUIPMENT) < 0.03); // 간격은 50ms 단위로 반올림되므로 오차 3% 허용
  }
});

test("the fortress marker survives battle steps so the fortress picture keeps showing", () => {
  const s = army(327680); s.equipment.artillery = { level: 3, deployed: true };
  let b = createBattle({ ...s, campaignCleared: 80 }, 20);
  assert.equal(b.enemy.fortress, "serdin");
  b = advanceBattle(advanceBattle(b, 50), 50);
  assert.equal(b.enemy.fortress, "serdin");
  assert.equal(createBattle({ ...s, campaignCleared: 80 }, 19).enemy.fortress, null);
});
