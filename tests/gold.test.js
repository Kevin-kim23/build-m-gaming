import test from 'node:test';
import assert from 'node:assert/strict';
import { fmt, fmtGold } from '../src/format.js';
import { freshState, MAX_GOLD, MAX_OFFLINE_MS, parseSave, tapGold, accrue, perSecond, perTap, recruit, recruitCost, SAVE_KEY, activateAutoTouch, activateSword } from '../src/game.js';
import { createGameSession } from '../src/session.js';

const T = 1_800_000_000_000;

test('gold labels switch at 1000 eok and truncate only the displayed remainder', () => {
  for (const [value, label] of [
    [0, '0'], [123456789, '123,456,789'], [99_999_999_999, '99,999,999,999'],
    [100_000_000_000, '1,000억'], [100_099_999_999, '1,000억'],
    [999_999_999_999, '9,999억'], [1_000_000_000_000, '1조'],
    [1_234_567_890_123, '1조 2,345억'], [99_999_999_999_999, '99조 9,999억'],
    [100_000_000_000_000, '100조'], [100_000_100_000_000, '100조 1억'],
  ]) assert.equal(fmtGold(value), label);
  assert.equal(fmt(100_000_000_000), '100,000,000,000');
});

test('cached gold labels never mix ordinary integers and compact buckets', () => {
  for (let round = 0; round < 2; round++) {
    for (let i = 1000; i < 1400; i++) {
      assert.equal(fmtGold(i), fmt(i));
      assert.equal(fmtGold(i * 100_000_000 + 99_999_999), `${fmt(i)}억`);
    }
    assert.equal(fmtGold(1_234_567_890_123), '1조 2,345억');
    assert.equal(fmtGold(1_234_599_999_999), '1조 2,345억');
  }
});

test('100 trillion saves and the old one trillion balance retain every gold', () => {
  assert.equal(MAX_GOLD, 100_000_000_000_000);
  assert.ok(Number.isSafeInteger(MAX_GOLD));
  for (const gold of [1_000_000_000_000, 1_234_567_890_123, MAX_GOLD - 1, MAX_GOLD]) {
    const s = { ...freshState(T), gold };
    assert.deepEqual(parseSave(JSON.stringify(s), T), s);
  }
  for (const gold of [MAX_GOLD + 1, MAX_GOLD + .5, -1, '100000000000000'])
    assert.equal(parseSave(JSON.stringify({ ...freshState(T), gold }), T), null);
});

test('touch gains cross one trillion, preserve one-gold precision and stop at the new cap', () => {
  const s = { ...freshState(T), gold: 1_000_000_000_000 };
  assert.equal(tapGold(s, T), 1);
  assert.equal(s.gold, 1_000_000_000_001);
  s.gold = MAX_GOLD - 1;
  assert.equal(tapGold(s, T), 1);
  const taps = s.taps;
  assert.equal(tapGold(s, T), 0);
  assert.equal(s.taps, taps);
  assert.equal(s.gold, MAX_GOLD);
});

test('compact display does not round a purchase or forgive a one-gold deficit', () => {
  const s = { ...freshState(T), soldiers: 1_310_000, gold: MAX_GOLD };
  const price = recruitCost(s.soldiers);
  assert.equal(fmtGold(s.gold), '100조');
  assert.equal(recruit(s, T).cost, price);
  assert.equal(s.gold, MAX_GOLD - price);
  s.gold = recruitCost(s.soldiers) - 1;
  const before = structuredClone(s);
  assert.equal(recruit(s, T).reason, 'gold');
  assert.deepEqual(s, before);
  s.gold++;
  assert.equal(recruit(s, T).ok, true);
  assert.equal(s.gold, 0);
});

test('highest supported income uses exact fractional arithmetic and caps long offline earnings', () => {
  const original = { ...freshState(T), soldiers: 1_300_000, sergeants: 300, campaignCleared: 80, gold: 1_234_567_890_123, incomeRemainder: 987 };
  for (const id of ['helicopter', 'rocketLauncher', 'transport', 'fighter'])
    original.equipment[id] = { level: 20, count: 100_000, deployed: true };
  assert.ok(parseSave(JSON.stringify(original), T));
  for (const elapsed of [1, 999, 1000, 1234, 30_123, MAX_OFFLINE_MS, MAX_OFFLINE_MS * 2]) {
    const s = structuredClone(original);
    const scaled = BigInt(perSecond(s)) * BigInt(Math.min(elapsed, MAX_OFFLINE_MS)) + 987n;
    const exact = BigInt(s.gold) + scaled / 1000n;
    const expected = exact >= BigInt(MAX_GOLD) ? MAX_GOLD : Number(exact);
    accrue(s, T + elapsed);
    assert.equal(s.gold, expected);
    assert.equal(s.incomeRemainder, expected === MAX_GOLD ? 0 : Number(scaled % 1000n));
    assert.ok(parseSave(JSON.stringify(s), T + elapsed));
  }
  const combined = structuredClone(original), split = structuredClone(original);
  accrue(combined, T + 1234);
  for (let ms = 1; ms <= 1234; ms++) accrue(split, T + ms);
  assert.deepEqual(split, combined);
});

test('large boosted automatic earnings never overflow or repay spent pulses', () => {
  const s = { ...freshState(T), soldiers: 324680, sergeants: 300, gold: MAX_GOLD - 1 };
  for (const id of ['helicopter', 'rocketLauncher', 'transport', 'fighter'])
    s.equipment[id] = { level: 20, count: 100_000, deployed: true };
  assert.equal(activateSword(s, T).ok, true);
  assert.equal(activateAutoTouch(s, T).ok, true);
  assert.ok(Number.isSafeInteger(perTap(s, T) * 200));
  accrue(s, T + 60_000);
  assert.equal(s.gold, MAX_GOLD);
  assert.equal(s.autoTouchTicks, 200);
  s.gold -= 123;
  accrue(s, T + 60_000);
  assert.equal(s.gold, MAX_GOLD - 123);
});

test('batched saving and reload preserve large gold without clipping at the old cap', () => {
  const saved = { ...freshState(T), gold: MAX_GOLD - 2 };
  const values = new Map([[SAVE_KEY, JSON.stringify(saved)]]);
  const session = createGameSession({
    storage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
    now: () => T, setTimer: () => 1, clearTimer: () => {},
  });
  session.start();
  assert.equal(session.tap(), 1);
  session.pause();
  assert.equal(parseSave(values.get(SAVE_KEY), T).gold, MAX_GOLD - 1);
  session.start();
  assert.equal(session.state.gold, MAX_GOLD - 1);
  assert.equal(session.tap(), 1);
  session.pause();
  assert.equal(parseSave(values.get(SAVE_KEY), T).gold, MAX_GOLD);
});
