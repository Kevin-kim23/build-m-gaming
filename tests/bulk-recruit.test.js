import { serializeSave } from '../src/money.js';
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  freshState, recruitOffer, recruit, unitCost, parseSave, accrue,
  perSecond, perTap, MAX_GOLD, MAX_SOLDIERS,
} from "../src/game.js";
import { RANKS } from "../src/ranks.js";

const T = 1800000000000;
const army = (power = 1280) => ({
  ...freshState(T), soldiers: power - 400, sergeants: 40, gold:100_000_000_000_000,
});
const expectedBatchCost = (owned, type = 'soldier') =>
  Array.from({ length: 100 }, (_, index) => unitCost(owned + index, type)).reduce((sum, cost) => sum + cost, 0);

test("level one command baton is previewed at major and automatically owned from lieutenant colonel", async () => {
  const { COMMAND_BATON, commandBatonStatus } = await import("../src/personal-equipment.js");
  assert.equal(COMMAND_BATON.unlockRank,'중령');assert.equal(COMMAND_BATON.maxLevel,10);assert.equal(COMMAND_BATON.recruitAmount,100);
  assert.deepEqual(commandBatonStatus(army(639)), { visible: false, owned: false, level: 0 });
  assert.deepEqual(commandBatonStatus(army(640)), { visible: true, owned: false, level: 0 });
  assert.deepEqual(commandBatonStatus(army(1279)), { visible: true, owned: false, level: 0 });
  assert.deepEqual(commandBatonStatus(army(1280)), { visible: true, owned: true, level: 1 });
  assert.deepEqual(commandBatonStatus(army(327680)), { visible: true, owned: true, level: 1 });
});

test("bulk recruitment cannot bypass rank or the forty-sergeant promotion requirement", () => {
  for (const original of [army(640), army(1279), { ...army(327680), sergeants: 39 }]) {
    const s = structuredClone(original), offer = recruitOffer(s, "soldier", 100);
    assert.equal(offer.locked, true);
    assert.equal(offer.reason, "locked");
    assert.equal(offer.canBuy, false);
    assert.equal(recruit(s, T, "soldier", 100).reason, "locked");
    assert.deepEqual(s, original);
  }
});

test("bulk price equals one hundred consecutive individual prices without discounts", () => {
  for (const power of [1280, 10400]) {
    const s = army(power), individual = structuredClone(s), cost = expectedBatchCost(s.soldiers);
    const beforeGold = s.gold, beforeCount = s.soldiers;
    assert.equal(recruitOffer(s, "soldier", 100).cost, cost);
    assert.equal(recruitOffer(s, "soldier", 100).quantity, 100);
    const result = recruit(s, T, "soldier", 100);
    assert.equal(result.ok, true);
    assert.equal(result.count, 100);
    assert.equal(result.cost, cost);
    assert.equal(s.soldiers, beforeCount + 100);
    assert.equal(s.gold, beforeGold - cost);
    for (let i = 0; i < 100; i++) assert.equal(recruit(individual, T).count, 1);
    assert.deepEqual(s, individual);
  }
});

test("a hundred recruits are atomic when money or only ninety-nine power slots remain", () => {
  const lowGold = army();
  lowGold.gold = expectedBatchCost(lowGold.soldiers) - 1;
  const beforeGoldFailure = structuredClone(lowGold);
  assert.equal(recruit(lowGold, T, "soldier", 100).reason, "gold");
  assert.deepEqual(lowGold, beforeGoldFailure);
  const atLimit = army(MAX_SOLDIERS - 99), beforeLimitFailure = structuredClone(atLimit);
  assert.equal(recruit(atLimit, T, "soldier", 100).reason, "limit");
  assert.deepEqual(atLimit, beforeLimitFailure);
  const exactCapacity = {...army(MAX_SOLDIERS - 100),gold:MAX_GOLD};
  assert.equal(recruit(exactCapacity, T, "soldier", 100).ok, true);
  assert.equal(exactCapacity.soldiers + exactCapacity.sergeants * 10, MAX_SOLDIERS);
});

test("batch totals above the old wallet cap remain unaffordable at that saved balance", () => {
  const s = { ...army(), personalLevels:{...freshState(T).personalLevels,commandBaton:2}, soldiers: 5000, sergeants: 130000, ncoSchoolLevel: 1 }, original = structuredClone(s);
  const cost = expectedBatchCost(s.sergeants, 'sergeant'), offer = recruitOffer(s, "sergeant", 100);
  assert.ok(cost > s.gold);
  assert.ok(Number.isSafeInteger(cost));
  assert.equal(offer.cost, cost);
  assert.equal(offer.canBuy, false);
  assert.equal(recruit(s, T, "sergeant", 100).reason, "gold");
  assert.deepEqual(s, original);
});

test("bulk recruitment settles old passive income once and never awards the new army retroactively", () => {
  const s = army(), oldIncome = perSecond(s), oldTap = perTap(s);
  const cost = expectedBatchCost(s.soldiers);
  s.gold = cost;
  assert.equal(recruit(s, T + 1500, "soldier", 100).ok, true);
  assert.equal(s.gold, oldIncome * 1.5);
  assert.equal(s.lastAccrual, T + 1500);
  assert.equal(perSecond(s), oldIncome + 100);
  assert.equal(perTap(s), oldTap + 1000);
  accrue(s, T + 2000);
  assert.equal(s.gold, oldIncome * 2 + 50);
});

test("bulk recruitment crosses the colonel threshold in one transaction and returns promotion metadata", () => {
  const s = army(5020);
  s.gold = expectedBatchCost(s.soldiers);
  const result = recruit(s, T, "soldier", 100);
  assert.equal(result.ok, true);
  assert.equal(result.count, 100);
  assert.equal(result.type, "soldier");
  assert.equal(result.promoted, true);
  assert.equal(RANKS[result.rank], "대령");
  assert.equal(s.soldiers + s.sergeants * 10, 5120);
  assert.equal(s.gold, 0);
});

test("unsupported batch sizes and batch recruitment of other unit types fail before changing state", () => {
  for (const [type, quantity] of [["soldier", 0], ["soldier", 2], ["soldier", 99], ["soldier", 101],
    ["soldier", "100"], ["soldier", NaN], ["masterSergeant", 99]]) {
    const s = army(), original = structuredClone(s);
    assert.throws(() => recruitOffer(s, type, quantity), RangeError);
    assert.throws(() => recruit(s, T + 1000, type, quantity), RangeError);
    assert.deepEqual(s, original);
  }
});

test("cached batch prices do not cache changing gold or eligibility and refresh after headcount changes", () => {
  const s = army(), cost = expectedBatchCost(s.soldiers);
  assert.equal(recruitOffer(s, "soldier", 100).canBuy, true);
  s.gold = cost - 1;
  assert.equal(recruitOffer(s, "soldier", 100).reason, "gold");
  s.gold = cost;
  assert.equal(recruitOffer(s, "soldier", 100).canBuy, true);
  s.sergeants = 39;
  assert.equal(recruitOffer(s, "soldier", 100).reason, "locked");
  s.sergeants = 40;
  s.soldiers++;
  assert.equal(recruitOffer(s, "soldier", 100).cost, expectedBatchCost(s.soldiers));
  s.soldiers--;
  assert.equal(recruitOffer(s, "soldier", 100).cost, cost);
});

test("existing version seven saves restore their derived baton without a separate baton save field", async () => {
  const { commandBatonStatus } = await import("../src/personal-equipment.js");
  const original = { ...army(), version: 7, battleCleared: 2, taps: 1234, gold: 987654321 };
  const restored = parseSave(serializeSave(original), T);
  assert.deepEqual(restored, { ...original, version:19,personalLevels:{commandBaton:1,generalSword:1,divisionFlag:1,generalRevolver:1},autoTouchDurationMs:60000, ncoSchoolLevel: 2,
    earnedAchievements: ["squad", "platoon", "company", "battalion"] });
  assert.equal(restored.version, 19);
  assert.equal(commandBatonStatus(restored).owned, true);
  assert.equal(Object.hasOwn(restored, "commandBaton"), false);
  const migrated = parseSave(serializeSave({ ...original, version: 6 }), T);
  assert.equal(commandBatonStatus(migrated).level, 1);
  assert.equal(migrated.battleCleared, 0);
});
