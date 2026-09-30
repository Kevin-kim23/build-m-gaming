import { test } from "node:test";
import assert from "node:assert/strict";
import { freshState } from "../src/game.js";
import { EQUIPMENT } from "../src/equipment.js";
import {
  BATTLE_RULES, STAGES, battleAccess, defaultLoadout, normalizeLoadout,
  createBattle, advanceBattle, fireVolley, equipmentCombatStats,
} from "../src/battle.js";

function army(power = 1280, level = 3) {
  return { ...freshState(1000), soldiers: power - 600, sergeants: 40, staffSergeants: 10,
    battleCleared: 10,
    equipment: Object.fromEntries(["artillery", "tank", "selfPropelled"].map((id) => [id, { level, deployed: true }])),
  };
}
function simulate(state, stageId, tapsPerSecond = 2, loadout) {
  let battle = createBattle(state, stageId, loadout), nextTap = 0;
  while (battle.status === "running") {
    if (tapsPerSecond > 0 && battle.elapsedMs >= nextTap) {
      battle = fireVolley(battle);
      nextTap += 1000 / tapsPerSecond;
    }
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

test("ten stages contain two battles for each formation and enforce sequential progress", () => {
  assert.equal(STAGES.length, 10);
  assert.deepEqual(STAGES.map((s) => s.name), ["대대 전투1", "대대 전투2", "연대 전투1", "연대 전투2", "사단 전투1", "사단 전투2", "군단 전투1", "군단 전투2", "야전군 전투1", "야전군 전투2"]);
  const s = { ...army(), battleCleared: 0 };
  assert.equal(createBattle(s, 1).stageId, 1);
  assert.throws(() => createBattle(s, 2), RangeError);
  assert.throws(() => createBattle(s, 11), RangeError);
  assert.throws(() => createBattle(s, "1"), RangeError);
  s.battleCleared = 1;
  assert.equal(createBattle(s, 2).stageId, 2);
});

test("deployment clamps actual headcounts and rejects unknown or unowned equipment", () => {
  const s = army();
  s.staffSergeants = 3;
  s.equipment.tank = null;
  s.equipment.artillery.deployed = false;
  const chosen = normalizeLoadout(s, {
    units: { soldier: 99.5, sergeant: -1, staffSergeant: 9, alien: 10 },
    equipment: ["artillery", "artillery", "tank", "unknown"],
  });
  assert.deepEqual(chosen, { units: { soldier: 10, sergeant: 0, staffSergeant: 3, masterSergeant: 0, sergeantMajor: 0, lieutenant: 0, firstLieutenant: 0, captain: 0, major: 0, lieutenantColonel: 0 }, equipment: ["artillery"] });
  assert.equal(normalizeLoadout(s, { units: { soldier: NaN } }).units.soldier, 0);
  assert.deepEqual(defaultLoadout(s).equipment, ["artillery", "selfPropelled"]);
  assert.throws(() => createBattle(army(), 1, { units: {}, equipment: [] }), RangeError);
});

test("each headquarters has exactly the largest single formation's power as HP", () => {
  for (const [power, hp] of [[1280, 1280], [5120, 5120], [10240, 5120], [20480, 20480], [81920, 81920], [327680, 327680]]) {
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

test("one accepted tap fires all deployed infantry and never changes the original save or battle", () => {
  const state = army(), saved = structuredClone(state), initial = createBattle(state, 1);
  const before = structuredClone(initial), fired = fireVolley(initial);
  assert.deepEqual(initial, before);
  assert.ok(Math.abs(initial.enemy.hq.hp - fired.enemy.hq.hp -
    fired.player.units.reduce((n, u) => n + u.damage, 0)) < 1e-8);
  assert.ok(fired.player.units.every((u) => u.lastShotMs === 0));
  assert.equal(fireVolley(fired), fired);
  const ready = advanceBattle(fired, BATTLE_RULES.volleyCooldownMs);
  assert.notEqual(fireVolley(ready), ready);
  assert.deepEqual(state, saved);
  state.equipment.artillery.level = 10;
  state.soldiers = 9999;
  assert.equal(fired.player.equipment.find((g) => g.id === "artillery").level, 3);
  assert.equal(fired.player.units.find((u) => u.id === "soldier").count, 10);
});

test("all ten enhancements increase both damage and automatic attack speed", () => {
  for (const id of Object.keys(EQUIPMENT)) {
    let previous = equipmentCombatStats(id, 0);
    for (let level = 1; level <= 10; level++) {
      const current = equipmentCombatStats(id, level);
      assert.ok(current.damage > previous.damage);
      assert.ok(current.intervalMs < previous.intervalMs);
      previous = current;
    }
  }
  assert.throws(() => equipmentCombatStats("tank", 11), RangeError);
  const colonel = createBattle(army(5120), 3), general = createBattle(army(10240), 3);
  assert.equal(colonel.player.hq.hp, general.player.hq.hp);
  assert.equal(general.player.units[0].damage, colonel.player.units[0].damage * 2);
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
  assert.ok(b.player.units.every((u) => u.lastShotMs === -1));
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
  assert.equal(fireVolley(done), done);
  assert.equal(advanceBattle(done, 250), done);
});

test("representative forces win their tier but cannot skip to a four-times-larger headquarters", () => {
  for (const [power, level, stage] of [[1280, 0, 1], [1280, 4, 2], [5120, 5, 3], [10240, 4, 4], [20480, 5, 5], [20480, 8, 6], [81920, 7, 7], [81920, 10, 8], [327680, 9, 9], [327680, 10, 10]]) {
    assert.equal(simulate(army(power, level), stage).status, "victory", `power=${power} +${level} stage=${stage}`);
  }
  for (const [power, stage] of [[1280, 3], [5120, 5], [20480, 7], [81920, 9]])
    assert.equal(simulate(army(power, 10), stage, 3).status, "defeat");
  assert.equal(simulate(army(1280, 0), 1, 0).status, "defeat");
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
