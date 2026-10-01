import test from 'node:test';
import assert from 'node:assert/strict';
import { createTapTracker, MAX_SIMULTANEOUS_TAPS } from '../src/multi-tap.js';

test('up to four fingers can be down at once; the fifth is ignored until one lifts', () => {
  assert.equal(MAX_SIMULTANEOUS_TAPS, 4);
  const t = createTapTracker();
  for (const id of [1, 2, 3, 4]) assert.equal(t.down(id, 0), true, `finger ${id}`);
  assert.equal(t.down(5, 0), false);
  assert.equal(t.size, 4);
  t.up(2);
  assert.equal(t.down(5, 0), true);
  assert.equal(t.size, 4);
});

test('a rejected finger leaves no trace, so its release cannot free another finger', () => {
  const t = createTapTracker();
  for (const id of [1, 2, 3, 4]) t.down(id, 0);
  t.down(5, 0);
  t.up(5);
  assert.equal(t.size, 4);
  assert.equal(t.down(6, 0), false);
});

test('quick alternating taps with the same finger id each count', () => {
  const t = createTapTracker();
  for (let i = 0; i < 20; i++) {
    assert.equal(t.down(1, i), true);
    t.up(1);
  }
  assert.equal(t.size, 0);
});

test('a finger that never reports its release stops blocking after the timeout', () => {
  const t = createTapTracker(4, 5000);
  for (const id of [1, 2, 3, 4]) t.down(id, 0);
  assert.equal(t.down(5, 4999), false);
  assert.equal(t.down(5, 5001), true);
});

test('clear forgets every finger and repeated down for a known id does not use a second slot', () => {
  const t = createTapTracker();
  assert.equal(t.down(1, 0), true);
  assert.equal(t.down(1, 1), true);
  assert.equal(t.size, 1);
  t.down(2, 0); t.down(3, 0); t.down(4, 0);
  t.clear();
  assert.equal(t.size, 0);
  assert.equal(t.down(9, 0), true);
});

test('custom limits are respected', () => {
  const t = createTapTracker(2);
  assert.equal(t.down(1, 0), true);
  assert.equal(t.down(2, 0), true);
  assert.equal(t.down(3, 0), false);
});
