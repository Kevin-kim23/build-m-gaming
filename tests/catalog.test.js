import { test } from "node:test";
import assert from "node:assert/strict";
import {
  freshState,
  recruit,
  recruitOffer,
  buyEquipment,
  enhanceEquipment,
  setEquipmentDeployed,
  parseSave,
  perSecond,
  perTap,
  accrue,
  armyPower,
  MAX_GOLD,
} from "../src/game.js";
import {
  rankForArmy,
  RANKS,
  catalogVisible,
  promotionProgress,
} from "../src/ranks.js";
import {
  EQUIPMENT,
  emptyEquipment,
  equipmentStats,
  equipmentPurchaseOffer,
  enhancementCost,
  visibleEquipment,
  deployedEquipment,
} from "../src/equipment.js";
import {
  equipmentPanelMarkup,
  equipmentStoreMarkup,
} from "../src/equipment-panels.js";
import { shopMarkup } from "../src/shop.js";
import { layoutFieldEquipment, layoutFieldArmy } from "../src/field-layout.js";
const T = 1800000000000;
const state = (power, sergeants = 0) => ({
  ...freshState(T),
  soldiers: power - sergeants * 10,
  sergeants,
  gold: MAX_GOLD,
});
test("major requires both 640 strength and forty actual sergeants; later ranks cannot bypass it", () => {
  for (const power of [640, 1280, 327680])
    for (const n of [0, 39]) {
      const s = state(power, n);
      assert.equal(RANKS[rankForArmy(s)], "대위");
      assert.equal(recruit(s, T, "staffSergeant").reason, "locked");
      assert.equal(buyEquipment(s, T, "tank").reason, "locked");
    }
  const s = state(640, 39),
    result = recruit(s, T, "sergeant");
  assert.equal(s.sergeants, 40);
  assert.equal(result.promoted, true);
  assert.equal(RANKS[result.rank], "소령");
  assert.equal(promotionProgress(state(1000, 39)).ratio, 39 / 40);
  assert.equal(RANKS[rankForArmy(state(639, 40))], "대위");
  assert.equal(RANKS[rankForArmy(state(640, 40))], "소령");
});
test("staff sergeants have independent prices, exact rewards and twenty strength", () => {
  const s = state(640, 40),
    soldierCost = recruitOffer(s).cost,
    sergeantCost = recruitOffer(s, "sergeant").cost;
  const before = {
    gold: s.gold,
    passive: perSecond(s),
    tap: perTap(s),
    power: armyPower(s),
  };
  assert.equal(recruitOffer(s, "staffSergeant").cost, 1_000_000);
  assert.equal(recruit(s, T, "staffSergeant").ok, true);
  assert.equal(s.gold, before.gold - 1_000_000);
  assert.equal(s.staffSergeants, 1);
  assert.equal(perSecond(s) - before.passive, 150);
  assert.equal(perTap(s) - before.tap, 1000);
  assert.equal(armyPower(s) - before.power, 20);
  assert.equal(recruitOffer(s).cost, soldierCost);
  assert.equal(recruitOffer(s, "sergeant").cost, sergeantCost);
  const cost = recruitOffer(s, "staffSergeant").cost;
  recruit(s, T);
  recruit(s, T, "sergeant");
  assert.equal(recruitOffer(s, "staffSergeant").cost, cost);
  assert.ok(cost > 1_000_000);
});
test("catalog names and images stay absent until exactly the preceding rank, then remain available", () => {
  const cases = [
    [0, 0, []],
    [60, 0, []],
    [80, 0, []],
    [160, 0, []],
    [240, 0, ["artillery"]],
    [320, 0, ["artillery", "tank"]],
    [640, 40, ["artillery", "tank", "selfPropelled"]],
  ];
  for (const [power, n, ids] of cases) {
    const s = state(power, n);
    assert.deepEqual(
      visibleEquipment(s).map((d) => d.id),
      ids,
    );
    const html =
      equipmentStoreMarkup(s) + equipmentPanelMarkup(s, ids[0] ?? null);
    for (const d of Object.values(EQUIPMENT))
      assert.equal(html.includes(d.name), ids.includes(d.id));
  }
  assert.equal(catalogVisible(state(60), "소위"), false);
  assert.equal(catalogVisible(state(80), "소위"), true);
  assert.equal(shopMarkup(state(0), "", () => "").includes("하사 모집"), false);
  assert.equal(
    shopMarkup(state(240), "", () => "").includes("중사 모집"),
    false,
  );
  assert.equal(
    shopMarkup(state(320), "", () => "").includes("중사 모집"),
    true,
  );
  assert.equal(
    equipmentPurchaseOffer(state(240), "artillery").reason,
    "locked",
  );
  assert.equal(
    equipmentPurchaseOffer(state(640, 40), "selfPropelled").reason,
    "locked",
  );
});
test("tank and SPG have independent ownership and upgrades through level ten", () => {
  const s = state(1280, 40),
    base = { passive: perSecond(s), tap: perTap(s) };
  for (const id of Object.keys(EQUIPMENT)) {
    assert.equal(buyEquipment(s, T, id).ok, true);
    assert.equal(buyEquipment(s, T, id).reason, "owned");
  }
  for (const id of ["tank", "selfPropelled"]) {
    for (let level = 0; level < 10; level++) {
      const oldGold = s.gold;
      assert.equal(enhanceEquipment(s, T, id).ok, true);
      assert.equal(s.gold, oldGold - enhancementCost(level, id));
    }
    assert.equal(enhanceEquipment(s, T, id).reason, "max");
  }
  assert.equal(s.equipment.artillery.level, 0);
  const expected = equipmentStats(0),
    tank = equipmentStats(10, "tank"),
    spg = equipmentStats(10, "selfPropelled");
  assert.equal(
    perSecond(s),
    base.passive + expected.passive + tank.passive + spg.passive,
  );
  assert.equal(perTap(s), base.tap + expected.tap + tank.tap + spg.tap);
  setEquipmentDeployed(s, false, T, "tank");
  assert.equal(perSecond(s), base.passive + expected.passive + spg.passive);
  assert.equal(s.equipment.selfPropelled.deployed, true);
  assert.deepEqual(parseSave(JSON.stringify(s)), s);
});
test("new troops and equipment do not earn income retroactively", () => {
  const s = state(640, 40);
  s.gold = 20_000_000;
  const before = perSecond(s);
  recruit(s, T + 500, "staffSergeant");
  assert.equal(s.gold, 19_000_000 + before / 2);
  buyEquipment(s, T + 1000, "tank");
  assert.equal(s.gold, 14_000_000 + before + 75);
  const balance = s.gold;
  accrue(s, T + 2000);
  assert.equal(s.gold, balance + before + 150 + 2500);
});
test("v5 saves preserve artillery, balances and armies while adding empty new slots", () => {
  const old = {
    ...state(640, 39),
    version: 5,
    equipment: { artillery: { level: 7, deployed: false } },
  };
  delete old.staffSergeants;
  assert.deepEqual(parseSave(JSON.stringify(old)), {
    ...old,
    version: 6,
    staffSergeants: 0,
    equipment: {
      artillery: old.equipment.artillery,
      tank: null,
      selfPropelled: null,
    },
  });
  for (const bad of [-1, 1.5, undefined])
    assert.equal(
      parseSave(JSON.stringify({ ...state(640, 40), staffSergeants: bad })),
      null,
    );
  assert.equal(
    parseSave(
      JSON.stringify({
        ...state(640, 40),
        equipment: { ...emptyEquipment(), tank: { level: 11, deployed: true } },
      }),
    ),
    null,
  );
});
test("three parked weapons fit left to right without entering the troop area", () => {
  const s = state(10000, 40);
  for (const id of Object.keys(EQUIPMENT)) buyEquipment(s, T, id);
  const boxes = layoutFieldEquipment(deployedEquipment(s), 160, 135),
    area = { x: 13, y: 34, width: 134, height: 33 };
  const troops = layoutFieldArmy(s, area);
  assert.ok(troops.length);
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    assert.ok(b.x >= 12 && b.x + b.width <= 148);
    assert.ok(b.y >= area.y + area.height);
    assert.ok(b.y + b.height < 125);
    if (i) assert.ok(boxes[i - 1].x + boxes[i - 1].width < b.x);
  }
});
