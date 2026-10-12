import { test } from "node:test";
import assert from "node:assert/strict";
import { fieldArmy, layoutFieldArmy } from "../src/field-layout.js";
import { groupArmy, FORMATIONS } from "../src/formations.js";
import {
  freshState,
  parseSave,
  MAX_SOLDIERS,
  perSecond,
  perTap,
} from "../src/game.js";
const army = (soldiers) => ({ ...freshState(1800000000000), soldiers });
test("every four formations consolidate up to field army", () => {
  for (const [size, id] of [
    [5120, "regiment"],
    [20480, "division"],
    [81920, "corps"],
    [327680, "fieldArmy"],
  ]) {
    assert.equal(groupArmy(army(size))[0].id, id);
    assert.equal(groupArmy(army(size))[0].count, 1);
    assert.equal(
      groupArmy(army(size - 1)).some((g) => g.id === id),
      false,
    );
  }
  assert.deepEqual(
    groupArmy(army(10240)).map((g) => [g.id, g.count]),
    [["regiment", 2]],
  );
});
test("display cutoffs hide only the small icons, never troop counts or rewards", () => {
  for (const [power, minimum] of [
    [319, "soldier"],
    [339, "squad"],
    [1319, "platoon"],
    [5219, "company"],
    [20819, "battalion"],
    [83219, "regiment"],
    [332819, "division"],
  ]) {
    const s = army(power),
      before = structuredClone(s),
      v = fieldArmy(s);
    assert.equal(v.minimum.id, minimum);
    assert.equal(
      v.groups.reduce((sum, g) => sum + g.size * g.count, 0) + v.hiddenPower,
      power,
    );
    assert.deepEqual(s, before);
    assert.equal(perSecond(s), power);
    assert.equal(perTap(s), power * 10 + 1);
  }
  assert.equal(
    fieldArmy({ ...army(320), sergeants: 1 }).groups.some(
      (g) => g.id === "sergeant",
    ),
    false,
  );
});
test("higher headquarters make earlier buildings proportionally smaller", () => {
  const area = { x: 13, y: 34, width: 210, height: 260 };
  const old = layoutFieldArmy(army(100), area).find((i) => i.id === "squad");
  const next = layoutFieldArmy(army(420), area),
    small = next.find((i) => i.id === "squad");
  assert.ok(small.width < old.width);
  assert.ok(next[0].width > next[1].width && next[1].width > next[2].width);
});
test("small-screen layouts stay inside the troop area, sorted and non-overlapping", () => {
  const totals = new Set([0, 1, 19, 79, 319, 1279, MAX_SOLDIERS]);
  for (const f of FORMATIONS.filter(f=>typeof f.size === "number"))
    for (const delta of [-1, 0, 1, 19])
      if (f.size + delta >= 0) totals.add(f.size + delta);
  for (let i = 0; i <= 2048; i++) totals.add(Math.floor(MAX_SOLDIERS*i/2048));
  const area = { x: 13, y: 34, width: 134, height: 60 };
  for (const n of totals) {
    const s = army(n),
      items = layoutFieldArmy(s, area),
      view = fieldArmy(s);
    if (view.groups.length) assert.ok(items.length > 0, "empty layout at " + n);
    if (items.length) {
      assert.equal(items[0].x, area.x);
      assert.equal(items[0].y, area.y);
    }
    assert.equal(
      items.reduce((sum, i) => sum + i.size * i.count, 0),
      view.groups.reduce((sum, g) => sum + g.size * g.count, 0),
    );
    for (let k = 0; k < items.length; k++) {
      const a = items[k];
      assert.ok(
        a.x >= area.x &&
          a.y >= area.y &&
          a.x + a.boxWidth <= area.x + area.width &&
          a.y + a.boxHeight <= area.y + area.height,
        "overflow at " + n,
      );
      if (k) assert.ok(items[k - 1].size >= a.size);
      for (const b of items.slice(k + 1))
        assert.ok(
          a.x + a.boxWidth <= b.x ||
            b.x + b.boxWidth <= a.x ||
            a.y + a.boxHeight <= b.y ||
            b.y + b.boxHeight <= a.y,
        );
    }
  }
});
test("large saved armies load without discarding progress and remain finite", () => {
  const s = { ...army(MAX_SOLDIERS - 10), sergeants: 1, gold: 99999999 };
  assert.deepEqual(parseSave(JSON.stringify(s)), { ...s,
    earnedAchievements: FORMATIONS.filter(f=>f.id!=='soldier' && f.size<=MAX_SOLDIERS).slice().reverse().map(f=>f.id) });
  assert.equal(parseSave(JSON.stringify({ ...s, sergeants: 2 })), null);
  assert.ok(Number.isSafeInteger(perTap(s)));
  assert.ok(Number.isSafeInteger(perSecond(s)));
});
