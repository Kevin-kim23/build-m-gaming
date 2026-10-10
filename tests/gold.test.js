import { compactMoney, subtractMoney, serializeSave } from '../src/money.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fmt, fmtGold, fmtGoldCost } from '../src/format.js';
import { freshState, MAX_GOLD, MAX_OFFLINE_MS, parseSave, tapGold, accrue, perSecond, perTap, recruit, recruitCost, SAVE_KEY, activateAutoTouch, activateSword } from '../src/game.js';
import { createGameSession } from '../src/session.js';

const T = 1_800_000_000_000;

test('gold labels switch at 1000 eok and truncate only the displayed remainder (wallet rounds down)', () => {
  for (const [value, label] of [
    [0, '0'], [123456789, '123,456,789'], [99_999_999_999, '999억 9,999만'],
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

test('1000해 saves and old balances retain every gold', () => {
  assert.equal(MAX_GOLD, 100_000_000_000_000_000_000_000n);
  assert.equal(typeof MAX_GOLD,'bigint');
  for (const gold of [1_000_000_000_000, 1_234_567_890_123, MAX_GOLD - 1n, MAX_GOLD]) {
    const s = { ...freshState(T), gold };
    assert.deepEqual(parseSave(serializeSave(s), T), s);
  }
  for (const gold of [MAX_GOLD + 1n, 1.5, -1, '1e19', '0001', Number.MAX_SAFE_INTEGER+1])
    assert.equal(parseSave(serializeSave({ ...freshState(T), gold }), T), null);
});

test('touch gains cross one trillion, preserve one-gold precision and stop at the new cap', () => {
  const s = { ...freshState(T), gold: 1_000_000_000_000 };
  assert.equal(tapGold(s, T), 1);
  assert.equal(s.gold, 1_000_000_000_001);
  s.gold = MAX_GOLD - 1n;
  assert.equal(tapGold(s, T), 1);
  const taps = s.taps;
  assert.equal(tapGold(s, T), 0);
  assert.equal(s.taps, taps);
  assert.equal(s.gold, MAX_GOLD);
});

test('compact display does not round a purchase or forgive a one-gold deficit', () => {
  const s = { ...freshState(T), soldiers: 1_310_000, gold: MAX_GOLD };
  const price = recruitCost(s.soldiers);
  assert.equal(fmtGold(s.gold), '1,000해');
  assert.equal(recruit(s, T).cost, price);
  assert.equal(s.gold, MAX_GOLD - BigInt(price));
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
  assert.ok(parseSave(serializeSave(original), T));
  for (const elapsed of [1, 999, 1000, 1234, 30_123, MAX_OFFLINE_MS, MAX_OFFLINE_MS * 2]) {
    const s = structuredClone(original);
    const scaled = BigInt(perSecond(s)) * BigInt(Math.min(elapsed, MAX_OFFLINE_MS)) + 987n;
    const exact = BigInt(s.gold) + scaled / 1000n;
    const expected = exact >= BigInt(MAX_GOLD) ? MAX_GOLD : compactMoney(exact);
    accrue(s, T + elapsed);
    assert.equal(s.gold, expected);
    assert.equal(s.incomeRemainder, expected === MAX_GOLD ? 0 : Number(scaled % 1000n));
    assert.ok(parseSave(serializeSave(s), T + elapsed));
  }
  const combined = structuredClone(original), split = structuredClone(original);
  accrue(combined, T + 1234);
  for (let ms = 1; ms <= 1234; ms++) accrue(split, T + ms);
  assert.deepEqual(split, combined);
});

test('large boosted automatic earnings never overflow or repay spent pulses', () => {
  const s = { ...freshState(T), soldiers: 324680, sergeants: 300, gold: MAX_GOLD - 1n };
  for (const id of ['helicopter', 'rocketLauncher', 'transport', 'fighter'])
    s.equipment[id] = { level: 20, count: 100_000, deployed: true };
  assert.equal(activateSword(s, T).ok, true);
  assert.equal(activateAutoTouch(s, T).ok, true);
  assert.ok(Number.isSafeInteger(perTap(s, T) * 200));
  accrue(s, T + 60_000);
  assert.equal(s.gold, MAX_GOLD);
  assert.equal(s.autoTouchTicks, 200);
  s.gold = subtractMoney(s.gold,123);
  accrue(s, T + 60_000);
  assert.equal(s.gold, MAX_GOLD - 123n);
});

test('batched saving and reload preserve large gold without clipping at the old cap', () => {
  const saved = { ...freshState(T), gold: MAX_GOLD - 2n };
  const values = new Map([[SAVE_KEY, serializeSave(saved)]]);
  const session = createGameSession({
    storage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
    now: () => T, setTimer: () => 1, clearTimer: () => {},
  });
  session.start();
  assert.equal(session.tap(), 1);
  session.pause();
  assert.equal(parseSave(values.get(SAVE_KEY), T).gold, MAX_GOLD - 1n);
  session.start();
  assert.equal(session.state.gold, MAX_GOLD - 1n);
  assert.equal(session.tap(), 1);
  session.pause();
  assert.equal(parseSave(values.get(SAVE_KEY), T).gold, MAX_GOLD);
});

// Shop labels: below 10억 exact, 10억~1,000억 in 만, above in 억.
test('mid-size gold labels drop digits below 10,000 (만) from 10억', () => {
  for (const [value, floorLabel, costLabel] of [
    [999_999_999, '999,999,999', '999,999,999'],
    [1_000_000_000, '10억', '10억'],
    [1_234_567_890, '12억 3,456만', '12억 3,457만'],
    [1_234_560_000, '12억 3,456만', '12억 3,456만'],
    [1_200_000_001, '12억', '12억 1만'],
    [99_999_999_999, '999억 9,999만', '1,000억'],
    [100_000_000_000, '1,000억', '1,000억'],
    [100_000_000_001, '1,000억', '1,001억'],
    [1_234_567_890_123, '1조 2,345억', '1조 2,346억'],
    [100_000_000_000_000, '100조', '100조'],
  ]) {
    assert.equal(fmtGold(value), floorLabel, `wallet ${value}`);
    assert.equal(fmtGoldCost(value), costLabel, `cost ${value}`);
  }
});

const parseLabel = (label) => {
  const unit = { 조: 1e12, 억: 1e8, 만: 1e4 };
  if (/^[\d,]+$/.test(label)) return Number(label.replace(/,/g, ''));
  let total = 0;
  for (const [, amount, mark] of label.matchAll(/([\d,]+)(조|억|만)/g)) total += Number(amount.replace(/,/g, '')) * unit[mark];
  return total;
};

test('a shown price is never lower than the real price and a shown wallet never higher', () => {
  let seed = 12345;
  const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648);
  for (let i = 0; i < 4000; i++) {
    const value = (next() * 46_656 + next()) % 100_000_000_000_001;
    assert.ok(parseLabel(fmtGoldCost(value)) >= value, `cost label ${fmtGoldCost(value)} < ${value}`);
    assert.ok(parseLabel(fmtGold(value)) <= value, `wallet label ${fmtGold(value)} > ${value}`);
    // Whoever holds the amount shown on a price label can always afford it.
    assert.ok(parseLabel(fmtGoldCost(value)) - value < (value >= 100_000_000_000 ? 100_000_000 : 10_000) || value < 1_000_000_000);
  }
});

test('cost and wallet labels keep separate caches', () => {
  for (let round = 0; round < 2; round++) {
    assert.equal(fmtGold(1_234_567_890), '12억 3,456만');
    assert.equal(fmtGoldCost(1_234_567_890), '12억 3,457만');
  }
});
