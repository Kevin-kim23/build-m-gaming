import { serializeSave } from '../src/money.js';
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  freshState,
  tapGold,
  parseSave,
  accrue,
  recruit,
  recruitCost,
  rankFor,
  perTap,
  perSecond,
  MAX_GOLD,
  MAX_SOLDIERS,
} from "../src/game.js";
import { RANK_DEFINITIONS, LAST_RANK } from "../src/ranks.js";
import { FORMATION_ACHIEVEMENTS as ACHIEVEMENTS } from "../src/achievements.js";
const T = 1800000000000;
test("starts with empty ground, then 50 taps can pay for the first soldier", () => {
  const s = freshState(T);
  assert.equal(s.soldiers, 0);
  assert.equal(perSecond(s), 0);
  assert.equal(perTap(s), 1);
  for (let i = 0; i < 50; i++) tapGold(s, T);
  assert.equal(s.gold, 50);
  assert.equal(recruit(s, T).ok, true);
  assert.equal(s.gold, 0);
  assert.equal(s.soldiers, 1);
  assert.equal(perTap(s), 11);
  assert.equal(perSecond(s), 1);
});
test("each purchased soldier adds exactly 10 per tap and 1 per second", () => {
  for (const n of [1, 4, 20, 40, 80, 320, 1280]) {
    const s = { ...freshState(T), soldiers: n };
    assert.equal(tapGold(s, T), 1 + n * 10);
    s.gold = 0;
    accrue(s, T + 10000);
    assert.equal(s.gold, n * 10);
  }
});
test("buying a soldier cannot apply its passive income retroactively", () => {
  const s = { ...freshState(T), soldiers: 1, gold: 60 };
  assert.equal(recruit(s, T + 500).ok, true);
  assert.equal(s.gold, 0);
  assert.equal(s.incomeRemainder, 500);
  accrue(s, T + 1000);
  assert.equal(s.gold, 1);
  assert.equal(s.incomeRemainder, 500);
});
test("fractional seconds survive repeated saves and refreshes", () => {
  let s = { ...freshState(T), soldiers: 3 };
  for (let i = 1; i <= 20; i++) {
    accrue(s, T + i * 100);
    s = parseSave(serializeSave(s));
  }
  assert.equal(s.gold, 6);
  assert.equal(s.incomeRemainder, 0);
  accrue(s, T + 2000);
  assert.equal(s.gold, 6);
});
test("offline income is settled once and backward clocks never grant duplicate income", () => {
  let s = { ...freshState(T), soldiers: 4 };
  accrue(s, T + 3600000);
  assert.equal(s.gold, 14400);
  s = parseSave(serializeSave(s));
  accrue(s, T + 3600000);
  assert.equal(s.gold, 14400);
  accrue(s, T);
  accrue(s, T + 3600000);
  assert.equal(s.gold, 14400);
});
test("cannot buy without money or double spend one purchase price", () => {
  const s = freshState(T);
  assert.equal(recruit(s, T).ok, false);
  s.gold = 50;
  assert.equal(recruit(s, T).ok, true);
  assert.equal(recruit(s, T).ok, false);
  assert.equal(s.soldiers, 1);
  assert.equal(s.gold, 0);
});
test("every approved promotion happens at its exact threshold without consuming soldiers", () => {
  assert.deepEqual(
    RANK_DEFINITIONS.map((r) => r.required),
    [
      0, 4, 10, 15, 20, 40, 60, 80, 120, 160, 240, 320, 640, 1280, 5120, 10240,
      20480, 81920, 327680, 1310720, 5242880, 20971520, 83886080,
    ],
  );
  for (let i = 1; i < RANK_DEFINITIONS.length; i++) {
    const n = RANK_DEFINITIONS[i].required - 1;
    const sergeants = i >= RANK_DEFINITIONS.findIndex(r=>r.name==='준장') ? 300 : i >= RANK_DEFINITIONS.findIndex(r=>r.name==='소령') ? 40 : 0,
      soldiers = n - sergeants * 10;
    const s = {
      ...freshState(T),
      soldiers,
      sergeants,
      gold: recruitCost(soldiers),
    };
    assert.equal(rankFor(n), i - 1);
    const result = recruit(s, T);
    assert.equal(result.promoted, true);
    assert.equal(result.rank, i);
    assert.equal(s.soldiers, soldiers + 1);
    assert.equal(s.gold, 0);
    assert.equal(rankFor(n + 2), i);
  }
  assert.equal(rankFor(0), 0);
  assert.equal(rankFor(MAX_SOLDIERS), LAST_RANK);
});
test("recruitment prices rise with collection size", () => {
  assert.deepEqual([0, 1, 2, 3].map(recruitCost), [50, 60, 80, 90]);
  for (let i = 1; i <= 10000; i++) {
    assert.ok(Number.isSafeInteger(recruitCost(i)));
    assert.ok(recruitCost(i) > recruitCost(i - 1));
    assert.equal(recruitCost(i) % 10, 0);
  }
  // Early ranks now favor saving for school unlocks over endless ordinary recruitment.
  assert.ok(recruitCost(1279) / perTap({ soldiers: 1279 }) > 12);
});
test("existing v3 soldiers and income survive the new formation and rank rules", () => {
  for (const n of [8, 20, 40, 80, 320, 1280]) {
    const original = {
      ...freshState(T),
      soldiers: n,
      gold: 1234,
      taps: 123,
      sound: true,
    };
    const restored = parseSave(serializeSave(original));
    assert.deepEqual(restored, { ...original,
      earnedAchievements: ACHIEVEMENTS.filter(a => a.required <= n).map(a => a.id) });
    assert.equal(perSecond(restored), n);
    assert.equal(perTap(restored), n * 10 + 1);
  }
});
test("v2 migration preserves gold, sound, and touch count", () => {
  const migrated = parseSave(
    serializeSave({ version: 2, gold: 44, taps: 44, rank: 0, sound: true }),
    T,
  );
  assert.equal(migrated.gold, 44);
  assert.equal(migrated.soldiers, 0);
  assert.equal(migrated.sound, true);
  assert.equal(migrated.lastAccrual, T);
  accrue(migrated, T + 100000);
  assert.equal(migrated.gold, 44);
  assert.deepEqual(parseSave(serializeSave(migrated)), migrated);
});
test("malformed saves are rejected and maximum gold stays finite", () => {
  for (const raw of [
    "null",
    "{broken",
    serializeSave({ ...freshState(T), gold: -1 }),
    serializeSave({ ...freshState(T), soldiers: 1.5 }),
    serializeSave({ ...freshState(T), incomeRemainder: 1000 }),
  ])
    assert.equal(parseSave(raw), null);
  const s = { ...freshState(T), gold: MAX_GOLD - 1n, soldiers: 40 };
  assert.equal(tapGold(s, T), 1);
  accrue(s, T + 3600000);
  assert.equal(s.gold, MAX_GOLD);
  assert.equal(tapGold(s, T), 0);
});
