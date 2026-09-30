import { test } from "node:test";
import assert from "node:assert/strict";
import {
  freshState,
  buyEquipment,
  enhanceEquipment,
  setEquipmentDeployed,
  perSecond,
  perTap,
  tapGold,
  accrue,
  parseSave,
  recruitOffer,
  armyPower,
} from "../src/game.js";
import {
  equipmentPurchaseOffer,
  enhancementOffer,
  enhancementCost,
  equipmentStats,
} from "../src/equipment.js";
const T = 1800000000000;
const captain = (gold = 100_000_000) => ({
  ...freshState(T),
  soldiers: 320,
  gold,
});
test("artillery unlocks at captain, costs exactly one million, and cannot be duplicated", () => {
  const s = captain(1_000_000);
  s.soldiers = 319;
  assert.equal(equipmentPurchaseOffer(s).locked, true);
  assert.equal(buyEquipment(s, T).reason, "locked");
  assert.equal(s.gold, 1_000_000);
  s.soldiers = 320;
  s.gold--;
  assert.equal(buyEquipment(s, T).reason, "gold");
  s.gold++;
  assert.equal(buyEquipment(s, T).ok, true);
  assert.equal(s.gold, 0);
  assert.deepEqual(s.equipment.artillery, { level: 0, deployed: true });
  s.gold = 1_000_000;
  assert.equal(buyEquipment(s, T).reason, "owned");
  assert.equal(s.gold, 1_000_000);
  assert.equal(perSecond(s), 820);
  assert.equal(perTap(s), 6201);
});
test("every enhancement charges once, raises both rewards and stops at ten", () => {
  const s = captain();
  buyEquipment(s, T);
  let lastCost = 0;
  const troopPrices = [recruitOffer(s).cost, recruitOffer(s, "sergeant").cost];
  for (let level = 0; level < 10; level++) {
    const before = s.gold,
      cost = enhancementCost(level),
      old = equipmentStats(level);
    assert.ok(cost > lastCost);
    assert.equal(enhanceEquipment(s, T).ok, true);
    assert.equal(s.gold, before - cost);
    assert.equal(s.equipment.artillery.level, level + 1);
    assert.equal(perSecond(s), 320 + old.passive + 100);
    assert.equal(perTap(s), 3201 + old.tap + 600);
    lastCost = cost;
  }
  assert.equal(perSecond(s), 1820);
  assert.equal(perTap(s), 12201);
  const before = structuredClone(s);
  assert.equal(enhanceEquipment(s, T).reason, "max");
  assert.deepEqual(s, before);
  assert.equal(enhancementOffer(s).canUpgrade, false);
  assert.equal(armyPower(s), 320);
  assert.deepEqual(
    [recruitOffer(s).cost, recruitOffer(s, "sergeant").cost],
    troopPrices,
  );
});
test("unowned and insufficient-gold upgrades preserve progress", () => {
  const s = captain(1_000_000);
  assert.equal(enhanceEquipment(s, T).reason, "unowned");
  assert.equal(setEquipmentDeployed(s, true, T).reason, "unowned");
  buyEquipment(s, T);
  s.gold = enhancementCost(0) - 1;
  const before = structuredClone(s);
  assert.equal(enhanceEquipment(s, T).reason, "gold");
  assert.deepEqual(s, before);
  s.gold++;
  assert.equal(enhanceEquipment(s, T).ok, true);
  assert.equal(s.gold, 0);
});
test("purchase, enhancement and storage settle elapsed time at the old rate", () => {
  const s = captain();
  buyEquipment(s, T + 500);
  assert.equal(s.gold, 99_000_160);
  const before = s.gold;
  enhanceEquipment(s, T + 1000);
  assert.equal(s.gold, before + 410 - 250_000);
  const upgraded = s.gold;
  setEquipmentDeployed(s, false, T + 1500);
  assert.equal(s.gold, upgraded + 460);
  accrue(s, T + 2000);
  assert.equal(s.gold, upgraded + 460 + 160);
  assert.equal(perSecond(s), 320);
  assert.equal(perTap(s), 3201);
  assert.equal(s.equipment.artillery.level, 1);
  assert.equal(tapGold(s, T + 2000), 3201);
  setEquipmentDeployed(s, true, T + 2500);
  assert.equal(perSecond(s), 920);
  assert.equal(tapGold(s, T + 2500), 6801);
});
test("saved equipment survives reload; offline income only settles once", () => {
  let s = captain();
  buyEquipment(s, T);
  enhanceEquipment(s, T);
  setEquipmentDeployed(s, false, T);
  s = parseSave(JSON.stringify(s));
  assert.deepEqual(s.equipment.artillery, { level: 1, deployed: false });
  setEquipmentDeployed(s, true, T);
  const before = s.gold;
  accrue(s, T + 3600000);
  assert.equal(s.gold, before + 920 * 3600);
  const settled = s.gold;
  s = parseSave(JSON.stringify(s));
  accrue(s, T + 3600000);
  assert.equal(s.gold, settled);
});
test("v4 migration preserves troop balances and adds empty equipment", () => {
  const old = {
    ...captain(8765432),
    version: 4,
    sergeants: 7,
    taps: 234,
    incomeRemainder: 789,
    revision: 91,
    sound: true,
  };
  delete old.equipment;
  assert.deepEqual(parseSave(JSON.stringify(old)), {
    ...old,
    version: 11, ncoSchoolLevel: 1,
    earnedAchievements: ["squad", "platoon", "company"],
    equipment: { artillery: null, tank: null, selfPropelled: null, helicopter: null },
  });
});
test("invalid equipment saves are rejected instead of loading impossible bonuses", () => {
  for (const equipment of [
    undefined,
    null,
    [],
    {},
    { artillery: [] },
    { artillery: { level: -1, deployed: true } },
    { artillery: { level: 11, deployed: true } },
    { artillery: { level: 1.5, deployed: true } },
    { artillery: { level: 2, deployed: 1 } },
    { artillery: { deployed: true } },
  ])
    assert.equal(parseSave(JSON.stringify({ ...captain(), equipment })), null);
});
