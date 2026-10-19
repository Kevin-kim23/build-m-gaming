import test from 'node:test';
import assert from 'node:assert/strict';
import {freshDeckState, handleDeck, dropOnSlot} from '../tools/ux-candidates/deck-candidates.js';
import {SAMPLE} from '../tools/ux-candidates/data.js';

// The preview gallery must follow the real deck rules: never more cards than the rank's slots.
const press = (s, dataset, inside = null) => handleDeck(s, {dataset, closest: sel => (inside && sel === inside ? {} : null)});

test('a full deck asks which card to swap instead of growing past the slot limit', () => {
  const s = freshDeckState();
  assert.equal(s.deck.length, SAMPLE.slots);
  press(s, {collect: 'fighter'});
  press(s, {act: 'use'});
  assert.equal(s.deck.length, SAMPLE.slots);
  assert.equal(s.swap, true);
  press(s, {deck: 'tank'});
  assert.ok(s.deck.includes('fighter'));
  assert.ok(!s.deck.includes('tank'));
  assert.equal(s.deck.length, SAMPLE.slots);
});

test('removing and quick-adding never exceed the limit and dropping replaces a filled slot', () => {
  const s = freshDeckState();
  press(s, {collectQuick: 'fighter'});
  assert.equal(s.deck.length, SAMPLE.slots);
  assert.match(s.message, /최대/);
  s.picked = s.deck[0];
  press(s, {act: 'remove'});
  assert.equal(s.deck.length, SAMPLE.slots - 1);
  assert.equal(dropOnSlot(s, 'carrier', 0), true);
  assert.equal(s.deck[0], 'carrier');
  assert.equal(dropOnSlot(s, 'carrier', 1), false);
});
