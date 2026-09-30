import { test } from "node:test";
import assert from "node:assert/strict";
import {
  freshState,
  armyPower,
  perTap,
  perSecond,
  recruit,
  recruitOffer,
  unitCost,
  recruitCost,
  parseSave,
  accrue,
  rankFor,
  MAX_GOLD,
  MAX_SOLDIERS,
} from "../src/game.js";
const T = 1800000000000;
test("sergeant stays locked without a school even with unlimited gold", () => {
  for (const soldiers of [0, 4, 10, 15, 20, 40, 60, 80, 159, 327680]) {
    const s = { ...freshState(T), soldiers, gold: MAX_GOLD };
    const before = { ...s };
    assert.equal(recruitOffer(s, "sergeant").locked, true);
    assert.equal(recruit(s, T, "sergeant").reason, "locked");
    assert.deepEqual(s, before);
  }
});
test("at 160 strength a sergeant adds ten strength without creating ten people", () => {
  const s = { ...freshState(T), ncoSchoolLevel: 1, soldiers: 160 };
  const offer = recruitOffer(s, "sergeant");
  assert.equal(offer.locked, false);
  s.gold = offer.cost;
  assert.equal(recruit(s, T, "sergeant").ok, true);
  assert.equal(s.gold, 0);
  assert.equal(s.soldiers, 160);
  assert.equal(s.sergeants, 1);
  assert.equal(armyPower(s), 170);
  assert.equal(perTap(s), 1901);
  assert.equal(perSecond(s), 210);
  assert.equal(recruit(s, T, "sergeant").reason, "gold");
  assert.equal(s.sergeants, 1);
});
test("sergeant purchase crosses promotion thresholds by equivalent strength", () => {
  for (const [soldiers, before, after] of [
    [230, 8, 9],
    [310, 9, 10],
    [630, 10, 11],
    [1270, 11, 12],
  ]) {
    const sergeants = before >= 11 ? 40 : before >= 10 ? 39 : 0;
    const s = {
      ...freshState(T), ncoSchoolLevel: 1,
      soldiers: soldiers - sergeants * 10,
      sergeants,
      gold: MAX_GOLD,
    };
    assert.equal(rankFor(armyPower(s)), before);
    const result = recruit(s, T, "sergeant");
    assert.equal(result.rank, after);
    assert.equal(result.promoted, true);
    assert.equal(s.soldiers, soldiers - sergeants * 10);
    assert.equal(s.sergeants, sergeants + 1);
  }
});
test("each unit price is independent, even after actual purchases", () => {
  const s = { ...freshState(T), ncoSchoolLevel: 1, soldiers: 160, sergeants: 2, gold: MAX_GOLD };
  const sergeantPrice = recruitOffer(s, "sergeant").cost;
  recruit(s, T, "soldier");
  assert.equal(recruitOffer(s, "sergeant").cost, sergeantPrice);
  const soldierPrice = recruitOffer(s, "soldier").cost;
  recruit(s, T, "sergeant");
  assert.equal(recruitOffer(s, "soldier").cost, soldierPrice);
  assert.ok(recruitOffer(s, "sergeant").cost > sergeantPrice);
  assert.equal(soldierPrice, recruitCost(161));
});
test("sergeants have a steeper own-count price curve without numeric overflow", () => {
  assert.deepEqual(
    [0, 1, 2, 3].map((n) => unitCost(n, "sergeant")),
    [10000, 12200, 14800, 17800],
  );
  for (let n = 0; n < 1000; n++) {
    const cost = unitCost(n, "sergeant"),
      next = unitCost(n + 1, "sergeant");
    assert.ok(Number.isSafeInteger(cost));
    assert.equal(cost % 100, 0);
    assert.ok(next - cost > recruitCost(n + 1) - recruitCost(n));
    assert.ok(cost > recruitCost(n));
  }
});
test("new sergeants cannot earn retroactively; mixed offline income settles once", () => {
  let s = { ...freshState(T), ncoSchoolLevel: 1, soldiers: 160, gold: unitCost(0, "sergeant") };
  recruit(s, T + 500, "sergeant");
  assert.equal(s.gold, 80);
  accrue(s, T + 1000);
  assert.equal(s.gold, 185);
  s = parseSave(JSON.stringify(s));
  accrue(s, T + 3601000);
  assert.equal(s.gold, 185 + 210 * 3600);
  const settled = s.gold;
  accrue(s, T + 3601000);
  assert.equal(s.gold, settled);
});
test("v3 migration preserves the entire old progress and adds zero sergeants", () => {
  const old = {
    ...freshState(T), ncoSchoolLevel: 1,
    version: 3,
    soldiers: 173,
    gold: 98765,
    taps: 123,
    sound: true,
    revision: 9,
    incomeRemainder: 456,
  };
  delete old.sergeants;
  const migrated = parseSave(JSON.stringify(old));
  assert.deepEqual(migrated, { ...old, version: 16, sergeants: 0,
    earnedAchievements: ["squad", "platoon"] });
  const mixed = { ...migrated, sergeants: 9 };
  assert.deepEqual(parseSave(JSON.stringify(mixed)), mixed);
});
test("capacity and corrupt mixed-unit saves are rejected without losing money", () => {
  const s = { ...freshState(T), ncoSchoolLevel: 1, soldiers: MAX_SOLDIERS - 9, gold: MAX_GOLD };
  const before = { ...s };
  assert.equal(recruit(s, T, "sergeant").reason, "limit");
  assert.deepEqual(s, before);
  s.soldiers = MAX_SOLDIERS - 10;
  assert.equal(recruit(s, T, "sergeant").ok, true);
  assert.equal(armyPower(s), MAX_SOLDIERS);
  assert.equal(recruit(s, T).reason, "limit");
  for (const patch of [
    { sergeants: -1 },
    { sergeants: 1.5 },
    { sergeants: undefined },
    { soldiers: MAX_SOLDIERS - 1, sergeants: 1 },
  ]) {
    assert.equal(
      parseSave(JSON.stringify({ ...freshState(T), ncoSchoolLevel: 1, ...patch })),
      null,
    );
  }
});
