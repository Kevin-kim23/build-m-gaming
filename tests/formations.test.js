import { test } from "node:test";
import assert from "node:assert/strict";
import {
  groupSoldiers,
  groupArmy,
  describeFormation,
} from "../src/formations.js";
const compact = (n) => groupSoldiers(n).map(({ id, count }) => [id, count]);
test("formations consolidate at 20, 80, 320, and 1280 without a commander", () => {
  assert.deepEqual(compact(0), []);
  assert.deepEqual(compact(19), [["soldier", 19]]);
  assert.deepEqual(compact(20), [["squad", 1]]);
  assert.deepEqual(compact(80), [["platoon", 1]]);
  assert.deepEqual(compact(320), [["company", 1]]);
  assert.deepEqual(compact(1280), [["battalion", 1]]);
});
test("remainders stay visible instead of disappearing during consolidation", () => {
  assert.deepEqual(compact(79), [
    ["squad", 3],
    ["soldier", 19],
  ]);
  assert.deepEqual(compact(1279), [
    ["company", 3],
    ["platoon", 3],
    ["squad", 3],
    ["soldier", 19],
  ]);
  assert.deepEqual(compact(1301), [
    ["battalion", 1],
    ["squad", 1],
    ["soldier", 1],
  ]);
  assert.equal(describeFormation(104), "소대 1개 · 분대 1개 · 일반병 4명");
});
test("mixed formations preserve strength and never invent leftover unit types", () => {
  for (let soldiers = 0; soldiers <= 200; soldiers++)
    for (let sergeants = 0; sergeants <= 50; sergeants++) {
      const groups = groupArmy({ soldiers, sergeants });
      assert.equal(
        groups.reduce((sum, g) => sum + g.size * g.count, 0),
        soldiers + sergeants * 10,
      );
      assert.ok(
        (groups.find((g) => g.id === "soldier")?.count ?? 0) <= soldiers,
      );
      assert.ok(
        (groups.find((g) => g.id === "sergeant")?.count ?? 0) <= sergeants,
      );
    }
  assert.equal(
    describeFormation({ soldiers: 163, sergeants: 1 }),
    "소대 2개 · 하사 1명 · 일반병 3명",
  );
  assert.equal(
    describeFormation({ soldiers: 160, sergeants: 2 }),
    "소대 2개 · 분대 1개",
  );
});
test("every supported count preserves all soldiers and keeps the scene small", () => {
  let maxIcons = 0;
  for (let total = 0; total <= 10000; total++) {
    const groups = groupSoldiers(total);
    assert.equal(
      groups.reduce((sum, g) => sum + g.size * g.count, 0),
      total,
    );
    assert.ok(
      groups.every(
        (g) => g.id === "fieldArmy" || g.count < (g.id === "soldier" ? 20 : 4),
      ),
    );
    maxIcons = Math.max(
      maxIcons,
      groups.reduce((sum, g) => sum + g.count, 0),
    );
  }
  assert.ok(maxIcons <= 35);
});
test("invalid troop counts fail explicitly", () => {
  for (const n of [-1, 1.5, NaN, Infinity])
    assert.throws(() => groupSoldiers(n), RangeError);
  assert.throws(() => groupArmy({ soldiers: -1, sergeants: 10 }), RangeError);
  assert.throws(() => groupArmy({ soldiers: 100, sergeants: -1 }), RangeError);
});
