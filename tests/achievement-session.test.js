import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState, SAVE_KEY, parseSave, recruit, unitCost } from '../src/game.js';
import { createGameSession } from '../src/session.js';

const T = 1800000000000;
function memory(state) {
  const values = new Map([[SAVE_KEY, JSON.stringify(state)]]), writes = [];
  return { values, writes,
    getItem: key => values.get(key) ?? null,
    setItem(key, raw) { writes.push(key); values.set(key, raw); },
  };
}
function sessionFor(storage, locks) {
  return createGameSession({ storage, locks, now: () => T,
    setTimer: () => 1, clearTimer: () => {} });
}
function lockManager() {
  const queue = [];
  let held = false;
  function pump() {
    if (held || !queue.length) return;
    const job = queue.shift();
    if (job.signal.aborted) {
      job.reject(new DOMException('cancelled', 'AbortError')); pump(); return;
    }
    held = true;
    Promise.resolve().then(job.fn).then(job.resolve, job.reject)
      .finally(() => { held = false; pump(); });
  }
  return { request(name, { signal }, fn) {
    assert.equal(name, SAVE_KEY);
    return new Promise((resolve, reject) => { queue.push({ signal, fn, resolve, reject }); pump(); });
  } };
}
async function drain() { for (let i = 0; i < 12; i++) await Promise.resolve(); }

test('one recruit earns a medal in the same checkpoint while the previous backup remains unchanged', () => {
  const initial = { ...freshState(T), soldiers: 19, gold: unitCost(19) + unitCost(20) };
  const storage = memory(initial), session = sessionFor(storage);
  session.start();
  const previousAwards = session.state.earnedAchievements;
  const result = session.change(state => recruit(state, T));
  assert.equal(result.ok, true);
  assert.deepEqual(result.achievements, ['squad']);
  assert.deepEqual(session.state.earnedAchievements, ['squad']);
  assert.deepEqual(previousAwards, []);
  assert.deepEqual(storage.writes, [SAVE_KEY + '-backup', SAVE_KEY]);
  const saved = parseSave(storage.values.get(SAVE_KEY), T);
  const backup = parseSave(storage.values.get(SAVE_KEY + '-backup'), T);
  assert.equal(saved.version, 11);
  assert.equal(saved.soldiers, 20);
  assert.equal(saved.gold, unitCost(20));
  assert.deepEqual(saved.earnedAchievements, ['squad']);
  assert.equal(backup.soldiers, 19);
  assert.deepEqual(backup.earnedAchievements, []);
  session.pause(); session.start();
  assert.deepEqual(session.state.earnedAchievements, ['squad']);
  const next = session.change(state => recruit(state, T));
  assert.equal(next.ok, true);
  assert.deepEqual(next.achievements, []);
  assert.deepEqual(session.state.earnedAchievements, ['squad']);
  assert.equal(session.state.gold, 0);
  assert.equal(session.state.taps, 0);
  session.pause();
});

test('earned medals survive writer handoff and a second window cannot award or recruit while inactive', async () => {
  const initial = { ...freshState(T), soldiers: 79,
    gold: unitCost(79) + unitCost(80), earnedAchievements: ['squad'] };
  const storage = memory(initial), locks = lockManager();
  const a = sessionFor(storage, locks), b = sessionFor(storage, locks);
  a.start(); b.start(); await drain();
  assert.equal(a.active, true);
  assert.equal(b.active, false);
  assert.equal(b.change(state => recruit(state, T)), undefined);
  assert.equal(storage.writes.length, 0);
  const result = a.change(state => recruit(state, T));
  assert.deepEqual(result.achievements, ['platoon']);
  assert.deepEqual(a.state.earnedAchievements, ['squad', 'platoon']);
  a.pause(); await drain();
  assert.equal(b.active, true);
  assert.equal(b.state.soldiers, 80);
  assert.deepEqual(b.state.earnedAchievements, ['squad', 'platoon']);
  const next = b.change(state => recruit(state, T));
  assert.deepEqual(next.achievements, []);
  assert.deepEqual(b.state.earnedAchievements, ['squad', 'platoon']);
  b.pause(); await drain();
  const saved = parseSave(storage.values.get(SAVE_KEY), T);
  assert.equal(saved.soldiers, 81);
  assert.equal(saved.gold, 0);
  assert.deepEqual(saved.earnedAchievements, ['squad', 'platoon']);
});

test('an existing version seven army receives and persists earned medals without another purchase', () => {
  const legacy = { ...freshState(T), version: 7, soldiers: 80, gold: 12345, taps: 321 };
  delete legacy.earnedAchievements;
  const storage = memory(legacy), session = sessionFor(storage);
  session.start();
  assert.deepEqual(session.state.earnedAchievements, ['squad', 'platoon']);
  session.pause();
  assert.deepEqual(storage.writes, [SAVE_KEY]);
  const saved = JSON.parse(storage.values.get(SAVE_KEY));
  assert.equal(saved.version, 11);
  assert.equal(saved.soldiers, legacy.soldiers);
  assert.equal(saved.gold, legacy.gold);
  assert.equal(saved.taps, legacy.taps);
  assert.deepEqual(saved.earnedAchievements, ['squad', 'platoon']);
  session.start();
  assert.deepEqual(session.state.earnedAchievements, ['squad', 'platoon']);
  session.pause();
});
