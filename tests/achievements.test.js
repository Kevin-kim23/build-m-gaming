import { test } from "node:test";
import assert from "node:assert/strict";
import { FORMATIONS } from "../src/formations.js";
import { freshState, recruit, recruitOffer, parseSave, perSecond, perTap, MAX_GOLD, SAVE_KEY } from "../src/game.js";

const T = 1800000000000;
const ids = ["squad", "platoon", "company", "battalion", "regiment", "division", "corps", "fieldArmy"];
const state = (power) => ({ ...freshState(T), soldiers: power, gold: MAX_GOLD });
const rules = () => import("../src/achievements.js");

test("achievement definitions reuse all eight formation thresholds in ascending order", async () => {
  const { FORMATION_ACHIEVEMENTS: ACHIEVEMENTS } = await rules();
  assert.deepEqual(ACHIEVEMENTS.map(a => a.id), ids);
  assert.deepEqual(ACHIEVEMENTS.map(a => a.title), ["분대장", "소대장", "중대장", "대대장", "연대장", "사단장", "군단장", "야전군사령관"]);
  ACHIEVEMENTS.forEach((a, tier) => {
    const formation = FORMATIONS.find(f => f.id === a.id);
    assert.equal(a.required, formation.size);
    assert.equal(a.formationName, formation.name);
    assert.equal(a.tier, tier);
  });
});

test("each medal is awarded exactly at its formation boundary with no duplicate grants", async () => {
  const { FORMATION_ACHIEVEMENTS: ACHIEVEMENTS, reconcileAchievements } = await rules();
  for (const [index, a] of ACHIEVEMENTS.entries()) {
    const s = state(a.required - 1);
    assert.deepEqual(reconcileAchievements(s), ids.slice(0, index));
    assert.deepEqual(s.earnedAchievements, ids.slice(0, index));
    s.soldiers++;
    const previous = s.earnedAchievements;
    assert.deepEqual(reconcileAchievements(s), [a.id]);
    assert.notEqual(s.earnedAchievements, previous);
    assert.deepEqual(previous, ids.slice(0, index));
    const earned = s.earnedAchievements;
    assert.deepEqual(reconcileAchievements(s), []);
    assert.equal(s.earnedAchievements, earned);
  }
});

test("equivalent power from mixed troops awards medals independently of promotion gates", async () => {
  const { reconcileAchievements } = await rules();
  const mixed = { ...state(10), sergeants: 5, staffSergeants: 1 };
  assert.deepEqual(reconcileAchievements(mixed), ["squad", "platoon"]);
  const noOfficers = state(1280);
  assert.equal(noOfficers.sergeants, 0);
  assert.deepEqual(reconcileAchievements(noOfficers), ids.slice(0, 4));
});

test("a successful hundred-recruit transaction awards every qualifying missed formation together", () => {
  const s = { ...state(4620), sergeants: 40 };
  const cost = recruitOffer(s, "soldier", 100).cost;
  s.gold = cost;
  const result = recruit(s, T, "soldier", 100);
  assert.equal(result.ok, true);
  assert.deepEqual(result.achievements, ids.slice(0, 5));
  assert.deepEqual(s.earnedAchievements, ids.slice(0, 5));
  assert.equal(s.gold, 0);
  assert.equal(s.soldiers, 4720);
});

test("failed recruitment grants no medals and successful single recruitment retains normal economics", async () => {
  const noGold = { ...state(80), gold: 0 };
  assert.equal(recruit(noGold, T).ok, false);
  assert.deepEqual(noGold.earnedAchievements, []);
  const s = { ...state(19), gold: recruitOffer(state(19)).cost };
  const oldTap = perTap(s), oldIncome = perSecond(s);
  const result = recruit(s, T);
  assert.deepEqual(result.achievements, ["squad"]);
  assert.equal(s.gold, 0);
  assert.equal(perTap(s), oldTap + 10);
  assert.equal(perSecond(s), oldIncome + 1);
  const { reconcileAchievements } = await rules();
  const snapshot = structuredClone(s);
  reconcileAchievements(s);
  assert.deepEqual(s, snapshot);
});

test("consolidated armies receive lower medals and earned records survive later power reductions", async () => {
  const { reconcileAchievements, achievementProgress } = await rules();
  const s = state(327680);
  assert.deepEqual(reconcileAchievements(s), ids);
  s.soldiers = 0;
  assert.deepEqual(reconcileAchievements(s), []);
  assert.deepEqual(s.earnedAchievements, ids);
  assert.deepEqual(achievementProgress(s, "fieldArmy"), { earned: true, current: 0, required: 327680, ratio: 1 });
  assert.deepEqual(parseSave(JSON.stringify(s), T).earnedAchievements, ids);
});

test("achievement progress is read-only, uses current equivalent power, and caps at its threshold", async () => {
  const { achievementProgress } = await rules();
  const s = { ...state(0), sergeants: 1 }, before = structuredClone(s);
  assert.deepEqual(achievementProgress(s, "squad"), { earned: false, current: 10, required: 20, ratio: 0.5 });
  assert.deepEqual(s, before);
  s.soldiers = 100;
  assert.deepEqual(achievementProgress(s, "squad"), { earned: false, current: 20, required: 20, ratio: 1 });
  assert.throws(() => achievementProgress(s, "unknown"), RangeError);
});

test("old version seven assets migrate intact and receive currently earned medals", () => {
  const old = { ...state(680), version: 7, sergeants: 40, staffSergeants: 10, battleCleared: 4,
    taps: 234, sound: true, revision: 22, gold: 7654321,
    equipment: { artillery: { level: 4, deployed: false }, tank: { level: 10, deployed: true }, selfPropelled: null } };
  delete old.earnedAchievements;
  const restored = parseSave(JSON.stringify(old), T);
  const { version, earnedAchievements, ...assets } = restored;
  const { version: oldVersion, ...oldAssets } = old;
  assert.equal(oldVersion, 7);
  assert.equal(version, 16);
  assert.deepEqual(assets, {...oldAssets,ncoSchoolLevel:2,equipment:{...Object.fromEntries(Object.entries(oldAssets.equipment).map(([id, gear]) => [id, gear ? {...gear, count: 1} : null])),helicopter:null,rocketLauncher:null,transport:null,fighter:null}});
  assert.deepEqual(earnedAchievements, ids.slice(0, 4));
  assert.equal(SAVE_KEY, "budae-kiugi-recruits-v3");
});

test("all legacy save versions gain medals from preserved power without trusting injected medal records", () => {
  for (const version of [3, 4, 5, 6, 7]) {
    const old = { ...state(80), version, earnedAchievements: ["fieldArmy"] };
    const restored = parseSave(JSON.stringify(old), T);
    assert.equal(restored.version, 16);
    assert.deepEqual(restored.earnedAchievements, ["squad", "platoon"]);
    assert.equal(restored.gold, MAX_GOLD);
  }
  const v2 = parseSave(JSON.stringify({ version: 2, gold: 50, taps: 50, rank: 0, sound: false }), T);
  assert.equal(v2.version, 16);
  assert.deepEqual(v2.earnedAchievements, []);
});

test("version eight rejects corrupt medal arrays and fills valid missing earned medals", async () => {
  const { validAchievementIds } = await rules();
  assert.equal(validAchievementIds([]), true);
  assert.equal(validAchievementIds(ids), true);
  for (const bad of [undefined, null, {}, "squad", ["unknown"], ["squad", "squad"], [1], [...ids, "squad"], Array(1)]) {
    assert.equal(validAchievementIds(bad), false);
    assert.equal(parseSave(JSON.stringify({ ...state(20), version: 8, earnedAchievements: bad }), T), null);
  }
  const loaded = parseSave(JSON.stringify({ ...state(80), version: 8, earnedAchievements: ["fieldArmy"] }), T);
  assert.deepEqual(loaded.earnedAchievements, ["fieldArmy", "squad", "platoon"]);
  assert.deepEqual(parseSave(JSON.stringify(loaded), T), loaded);
});
