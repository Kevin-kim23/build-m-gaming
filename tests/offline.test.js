import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState, accrue, parseSave } from '../src/game.js';
const T = 1800000000000, HOUR = 3600000;
test('long absence pays at most eight hours and discards excess time permanently', () => {
  let s = { ...freshState(T), soldiers: 3, incomeRemainder: 500 };
  accrue(s, T + 24 * HOUR);
  assert.equal(s.gold, 3 * 8 * 3600);
  assert.equal(s.lastAccrual, T + 24 * HOUR);
  s = parseSave(JSON.stringify(s));
  accrue(s, T + 24 * HOUR);
  assert.equal(s.gold, 86400);
  accrue(s, T + 24 * HOUR + 500);
  assert.equal(s.gold, 86402);
});
test('clock rollback and return cannot award the capped interval twice', () => {
  const s = { ...freshState(T), soldiers: 1 };
  accrue(s, T + 100 * HOUR);
  const before = { ...s };
  accrue(s, T);
  accrue(s, T + 100 * HOUR);
  assert.deepEqual(s, before);
  assert.equal(s.gold, 28800);
});
