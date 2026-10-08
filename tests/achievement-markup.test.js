import test from "node:test";
import assert from "node:assert/strict";
import { ACHIEVEMENTS, reconcileAchievements } from "../src/achievements.js";
import { medalSvg } from "../src/achievement-art.js";
import { medalShelfMarkup, achievementListMarkup } from "../src/achievement-markup.js";

const state = (power = 0) => ({ soldiers: power, sergeants: 0, staffSergeants: 0, earnedAchievements: [] });

test("all catalog medals are distinct, fit their shared pixel bounds and use no duplicate SVG IDs", () => {
  const svgs = ACHIEVEMENTS.map(({ id }) => medalSvg(id));
  assert.equal(svgs.length, ACHIEVEMENTS.length);
  assert.equal(new Set(svgs).size, ACHIEVEMENTS.length);
  for (const [i, svg] of svgs.entries()) {
    assert.equal(svg, medalSvg(ACHIEVEMENTS[i].id));
    assert.match(svg, /viewBox="0 0 96 112"/);
    assert.match(svg, /aria-hidden="true"/);
    assert.doesNotMatch(svg, /\sid=|<image|<script|href=/);
    for (const rectangle of svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/g)) {
      const [, x, y, w, h] = rectangle.map(Number);
      assert.ok(x + w <= 96 && y + h <= 112, "pixel must fit both shelf and dialog art");
    }
  }
  assert.throws(() => medalSvg("unknown"), RangeError);
});

test("an empty medal shelf still exposes achievements without twenty fake medal slots", () => {
  const html = medalShelfMarkup();
  assert.match(html, /id="open-achievements"/);
  assert.match(html, /id="medal-count">훈장 0 \/ 21/);
  assert.match(html, /<ol id="medal-list"[^>]*><\/ol>/);
  assert.doesNotMatch(html, /<li|achievement-medal-svg/);
});

test("achievement list shows all locked goals and progress without a reward claim action", () => {
  const html = achievementListMarkup(state(12));
  const ids = [...html.matchAll(/data-achievement="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ACHIEVEMENTS.map((item) => item.id));
  assert.equal((html.match(/achievement-card locked/g) ?? []).length, ACHIEVEMENTS.length);
  assert.equal((html.match(/획득 완료/g) ?? []).length, 0);
  assert.match(html, /12 \/ 20/);
  assert.match(html, /훈장이 자동으로 지급됩니다/);
  assert.equal((html.match(/<button/g) ?? []).length, 1, "only the close button belongs to this list");
  assert.doesNotMatch(html, /골드|보상 받기|claim|data-buy/);
  const elementIds = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(elementIds, ["achievements-title", "close-achievements"]);
});

test("earned medals remain complete, selection is unique and markup never changes the save", () => {
  const s = state(1280);
  reconcileAchievements(s);
  const snapshot = structuredClone(s), html = achievementListMarkup(s, "battalion");
  assert.equal((html.match(/achievement-card earned/g) ?? []).length, 4);
  assert.equal((html.match(/achievement-card[^\"]* selected/g) ?? []).length, 1);
  assert.match(html, /class="achievement-card earned selected" data-achievement="battalion"/);
  assert.match(html, /훈장 <strong>4<\/strong> \/ 21/);
  assert.deepEqual(s, snapshot);
  s.soldiers = 0;
  const retained = achievementListMarkup(s);
  assert.equal((retained.match(/achievement-card earned/g) ?? []).length, 4);
  assert.match(retained, /max="1280" value="1280"/);
  assert.doesNotMatch(achievementListMarkup(s, '<script>'), /<script>| selected/);
});

test('medal shelf is one row of every medal, with a hide button', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../src/achievements.css', import.meta.url), 'utf8');
  assert.ok(css.includes('grid-template-columns: repeat(var(--medal-columns), minmax(0, 1fr))'));
  assert.ok(medalShelfMarkup().includes('--medal-columns:'+ACHIEVEMENTS.length));
  assert.ok(!/grid-template-rows: repeat\(2/.test(css));
  assert.match(medalShelfMarkup(), /id="toggle-medals"[^>]*aria-expanded="true"[^>]*aria-controls="medal-list"/);
});
