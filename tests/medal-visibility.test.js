import test from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS } from '../src/achievements.js';
import { freshState } from '../src/game.js';
import { parseHiddenMedals, serializeHiddenMedals, shelfMedals, toggleHiddenMedal } from '../src/medal-visibility.js';
import { achievementListMarkup } from '../src/achievement-markup.js';

const ids = ACHIEVEMENTS.map((item) => item.id);

test('hiding a medal removes only that one from the shelf and keeps earn order', () => {
  const earned = ids.slice(0, 6);
  const hidden = toggleHiddenMedal(new Set(), earned[2]);
  assert.deepEqual(shelfMedals(earned, hidden), earned.filter((id) => id !== earned[2]));
  assert.deepEqual(shelfMedals(earned, toggleHiddenMedal(hidden, earned[2])), earned);
});

test('toggle never mutates the previous set and ignores unknown ids', () => {
  const before = new Set([ids[0]]);
  const after = toggleHiddenMedal(before, ids[1]);
  assert.equal(before.size, 1);
  assert.equal(after.size, 2);
  assert.equal(toggleHiddenMedal(before, 'not-a-medal').size, 1);
});

test('stored preference survives a round trip and bad data falls back to nothing hidden', () => {
  const hidden = new Set([ids[3], ids[7]]);
  assert.deepEqual([...parseHiddenMedals(serializeHiddenMedals(hidden))], [...hidden]);
  for (const raw of [null, '', 'not json', '{"a":1}', '42', '["ghost"]'])
    assert.equal(parseHiddenMedals(raw).size, 0, String(raw));
  assert.deepEqual([...parseHiddenMedals(JSON.stringify([ids[0], 'ghost']))], [ids[0]]);
});

test('earned medal cards offer a per-medal home toggle that reflects its state; locked ones do not', () => {
  const state = { ...freshState(0), earnedAchievements: [ids[0], ids[1]], soldiers: 100 };
  const html = achievementListMarkup(state, null, [ids[1]]);
  const card = (id) => html.match(new RegExp(`<article class="achievement-card[^"]*" data-achievement="${id}".*?</article>`, 's'))[0];
  assert.match(card(ids[0]), new RegExp(`data-toggle-medal="${ids[0]}"[^>]*aria-pressed="false"[^>]*>홈에서 숨기기<`));
  assert.match(card(ids[1]), new RegExp(`data-toggle-medal="${ids[1]}"[^>]*aria-pressed="true"[^>]*>홈에 다시 보이기<`));
  assert.doesNotMatch(card(ids[2]), /data-toggle-medal/);
});
