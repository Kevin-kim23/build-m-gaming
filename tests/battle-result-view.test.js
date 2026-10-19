import test from 'node:test';
import assert from 'node:assert/strict';
import { battleLootMarkup, renderBattleLoot } from '../src/battle-result-view.js';

test('victory loot shows its icon and the exact credited item count without gold abbreviation', () => {
  const html = battleLootMarkup(105);
  assert.match(html, /105개 획득!/);
  assert.match(html, /class="battle-loot-label">전리품/);
  assert.match(html, /data-result-loot-art aria-hidden="true">/);
  assert.match(html, /<svg/);
  assert.match(html, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.doesNotMatch(html, /전리품 \+| is-empty| hidden/);
  assert.match(battleLootMarkup(1_000_000_000), /1,000,000,000개 획득!/);
});

test('zero credited loot is neutral and does not claim a reward was received', () => {
  const html = battleLootMarkup(0);
  assert.match(html, /is-empty/);
  assert.match(html, /data-result-loot-art aria-hidden="true" hidden/);
  assert.match(html, /보상 없음/);
  assert.doesNotMatch(html, /개 획득!/);
  assert.doesNotMatch(html, /aria-atomic="true" hidden/);
});

test('pause, defeat and missing credits hide the previously displayed reward and clear the amount', () => {
  const art = { hidden: true }, amount = { textContent: '' }, classes = new Set();
  const box = { hidden: true, classList: { toggle(name, on) { if (on) classes.add(name); else classes.delete(name); } },
    querySelector(selector) { return selector === '[data-result-loot-art]' ? art : amount; } };
  for (const hiddenAmount of [null, undefined, -1, NaN, '105']) {
    renderBattleLoot(box, 105);
    assert.equal(box.hidden, false); assert.equal(art.hidden, false); assert.equal(amount.textContent, '105개 획득!');
    renderBattleLoot(box, hiddenAmount);
    assert.equal(box.hidden, true); assert.equal(art.hidden, true); assert.equal(amount.textContent, '');
  }
  renderBattleLoot(box, 0);
  assert.equal(box.hidden, false); assert.equal(art.hidden, true); assert.equal(amount.textContent, '보상 없음');
  assert.equal(classes.has('is-empty'), true);
  assert.doesNotThrow(() => renderBattleLoot(null));
});
