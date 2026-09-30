import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState, SAVE_KEY, parseSave, recruit, recruitOffer } from '../src/game.js';
import { createGameSession } from '../src/session.js';

const T = 1800000000000;
const army = () => ({ ...freshState(T), soldiers: 880, sergeants: 40 });
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

test('one hundred recruits use one transaction checkpoint and preserve all recruits after reload', () => {
  const initial = army(), cost = recruitOffer(initial, 'soldier', 100).cost;
  initial.gold = cost;
  const storage = memory(initial), session = sessionFor(storage);
  session.start();
  const result = session.change(state => recruit(state, T, 'soldier', 100));
  assert.equal(result.ok, true);
  assert.equal(result.count, 100);
  assert.deepEqual(storage.writes, [SAVE_KEY + '-backup', SAVE_KEY]);
  const saved = parseSave(storage.values.get(SAVE_KEY), T);
  const backup = parseSave(storage.values.get(SAVE_KEY + '-backup'), T);
  assert.equal(saved.soldiers, 980);
  assert.equal(saved.gold, 0);
  assert.equal(backup.soldiers, 880);
  assert.equal(backup.gold, cost);
  assert.equal(saved.sergeants, backup.sergeants);
  assert.deepEqual(saved.equipment, backup.equipment);
  session.pause(); session.start();
  assert.equal(session.state.soldiers, 980);
  assert.equal(session.state.gold, 0);
  session.pause();
});

test('inactive window cannot bulk recruit and handoff rechecks the higher latest batch price', async () => {
  const initial = army(), firstCost = recruitOffer(initial, 'soldier', 100).cost;
  const nextCost = recruitOffer({ ...initial, soldiers: 980 }, 'soldier', 100).cost;
  assert.ok(nextCost > firstCost);
  initial.gold = firstCost + nextCost - 1;
  const storage = memory(initial), locks = lockManager();
  const a = sessionFor(storage, locks), b = sessionFor(storage, locks);
  a.start(); b.start(); await drain();
  assert.equal(a.active, true);
  assert.equal(b.active, false);
  assert.equal(b.change(state => recruit(state, T, 'soldier', 100)), undefined);
  assert.equal(storage.writes.length, 0);
  assert.equal(a.change(state => recruit(state, T, 'soldier', 100)).ok, true);
  a.pause(); await drain();
  assert.equal(b.active, true);
  assert.equal(b.state.soldiers, 980);
  assert.equal(b.state.gold, nextCost - 1);
  const latest = recruitOffer(b.state, 'soldier', 100);
  assert.equal(latest.cost, nextCost);
  assert.equal(latest.reason, 'gold');
  const rejected = b.change(state => recruit(state, T, 'soldier', 100));
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, 'gold');
  assert.equal(b.state.soldiers, 980);
  assert.equal(b.state.gold, nextCost - 1);
  b.pause(); await drain();
  const saved = parseSave(storage.values.get(SAVE_KEY), T);
  assert.equal(saved.soldiers, 980);
  assert.equal(saved.gold, nextCost - 1);
});
