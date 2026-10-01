import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameSession, SAVE_DELAY } from '../src/session.js';
import { SAVE_KEY, LEGACY_KEY, freshState, parseSave, recruit } from '../src/game.js';
const T = 1800000000000;
function memory(initial = freshState(T)) {
  const values = new Map([[SAVE_KEY, JSON.stringify(initial)]]);
  return { values, reads: 0, writes: [], fail: false,
    getItem(key) { this.reads++; return values.get(key) ?? null; },
    setItem(key, value) {
      if (this.fail) throw new Error('quota');
      this.writes.push(key); values.set(key, value);
    },
  };
}
function setup(storage = memory(), locks) {
  let clock = T, id = 0;
  const timers = new Map(), errors = [], reports = [];
  const session = createGameSession({ storage, locks, now: () => clock,
    setTimer: (fn, ms) => { timers.set(++id, { fn, at: clock + ms }); return id; },
    clearTimer: (key) => timers.delete(key),
    onError: (area, error) => { errors.push(area); reports.push(error.message); },
  });
  return { session, storage, errors, reports, timers,
    advance(ms) {
      clock += ms;
      for (const [key, timer] of [...timers]) {
        if (timer.at <= clock) { timers.delete(key); timer.fn(); }
      }
    },
  };
}
const drain = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function lockManager() {
  let held = false;
  const queue = [];
  function pump() {
    if (held || !queue.length) return;
    const job = queue.shift();
    if (job.signal.aborted) { job.reject(new DOMException('aborted', 'AbortError')); pump(); return; }
    held = true;
    Promise.resolve().then(job.fn).then(job.resolve, job.reject).finally(() => { held = false; pump(); });
  }
  return { request(name, { signal }, fn) {
    assert.equal(name, SAVE_KEY);
    return new Promise((resolve, reject) => { queue.push({signal, fn, resolve, reject}); pump(); });
  } };
}
test('rapid taps perform zero storage operations and flush once at the fixed deadline', () => {
  const h = setup(); h.session.start();
  const reads = h.storage.reads;
  for (let i = 0; i < 100; i++) h.session.tap();
  assert.equal(h.session.state.gold, 100);
  assert.equal(h.storage.reads, reads);
  assert.equal(h.storage.writes.length, 0);
  h.advance(SAVE_DELAY - 1); h.session.tap();
  assert.equal(h.storage.writes.length, 0);
  h.advance(1);
  assert.deepEqual(h.storage.writes, [SAVE_KEY]);
  assert.equal(parseSave(h.storage.values.get(SAVE_KEY)).gold, 101);
  h.session.pause();
});
test('purchase uses pending tap gold and immediately saves a valid backup', () => {
  const h = setup(); h.session.start();
  for (let i = 0; i < 50; i++) h.session.tap();
  assert.equal(h.session.change((s) => recruit(s, T)).ok, true);
  const saved = parseSave(h.storage.values.get(SAVE_KEY));
  assert.equal(saved.soldiers, 1); assert.equal(saved.gold, 0);
  assert.ok(parseSave(h.storage.values.get(SAVE_KEY + '-backup')));
  assert.deepEqual(h.storage.writes, [SAVE_KEY + '-backup', SAVE_KEY]);
  h.session.pause();
});
test('hide/pagehide flush synchronously; repeated pause cannot duplicate rewards', () => {
  const h = setup(); h.session.start(); h.session.tap(); h.session.pause();
  assert.equal(parseSave(h.storage.values.get(SAVE_KEY)).gold, 1);
  const writes = h.storage.writes.length;
  h.session.pause(); h.advance(5000);
  assert.equal(h.storage.writes.length, writes);
  assert.equal(h.timers.size, 0);
  h.session.start(); assert.equal(h.session.state.gold, 1); h.session.pause();
});
test('tick only accrues in memory, keeping fractional income across checkpoint/reload', () => {
  const h = setup(memory({ ...freshState(T), soldiers: 3 })); h.session.start();
  const reads = h.storage.reads;
  h.advance(500); h.session.tick();
  assert.equal(h.storage.reads, reads); assert.equal(h.storage.writes.length, 0);
  assert.equal(h.session.state.gold, 1);
  h.session.pause(); h.advance(500); h.session.start();
  assert.equal(h.session.state.gold, 3); h.session.pause();
});
test('failed writes retain taps, report errors and can retry without losing progress', () => {
  const h = setup(); h.session.start(); h.session.tap(); h.storage.fail = true;
  h.advance(SAVE_DELAY);
  assert.equal(h.session.state.gold, 1);
  assert.ok(h.errors.includes('save.write'));
  h.session.tap(); h.storage.fail = false; h.advance(SAVE_DELAY);
  assert.equal(parseSave(h.storage.values.get(SAVE_KEY)).gold, 2);
  h.session.pause();
});
test('corrupt primary restores backup and never replaces backup with corrupt JSON', () => {
  const store = memory(); store.values.set(SAVE_KEY, '{broken');
  store.values.set(SAVE_KEY + '-backup', JSON.stringify({ ...freshState(T), gold: 123 }));
  const h = setup(store); h.session.start(); h.session.tap(); h.session.pause();
  assert.equal(parseSave(store.values.get(SAVE_KEY)).gold, 124);
  assert.equal(parseSave(store.values.get(SAVE_KEY + '-backup')).gold, 123);
});
test('unrecoverable data and failed reads never overwrite an unknown original save', () => {
  const store = memory(); store.values.set(SAVE_KEY, '{broken');
  const h = setup(store); h.session.start(); h.session.tap(); h.session.pause();
  assert.equal(store.values.get(SAVE_KEY), '{broken');
  const failed = memory(); failed.getItem = () => { throw new Error('denied'); };
  const b = setup(failed); b.session.start(); b.session.tap(); b.session.pause();
  assert.equal(failed.writes.length, 0); assert.ok(b.errors.includes('save.load'));
});
test('one writer at a time; handoff preserves pending taps and rejects double spending', async () => {
  const store = memory({ ...freshState(T), gold: 49 }), locks = lockManager();
  const a = setup(store, locks), b = setup(store, locks);
  a.session.start(); b.session.start(); await drain();
  assert.equal(a.session.active, true); assert.equal(b.session.active, false);
  assert.equal(b.session.tap(), 0); assert.equal(b.session.change(s => recruit(s,T)), undefined);
  a.session.tap(); a.session.pause(); await drain();
  assert.equal(b.session.active, true); assert.equal(b.session.state.gold, 50);
  assert.equal(b.session.change(s => recruit(s,T)).ok, true);
  b.session.pause(); a.session.start(); await drain();
  assert.equal(a.session.state.soldiers, 1); assert.equal(a.session.state.gold, 0);
  assert.equal(a.session.change(s => recruit(s,T)).ok, false);
  a.session.pause(); await drain();
});
test('cancelled waiting tab cannot acquire later, and resume acquires only once', async () => {
  const store = memory(), locks = lockManager();
  const a = setup(store, locks), b = setup(store, locks);
  a.session.start(); b.session.start(); b.session.pause(); await drain();
  a.session.pause(); await drain(); assert.equal(b.session.active, false);
  b.session.start(); b.session.start(); await drain();
  assert.equal(b.session.active, true); b.session.tap(); b.session.pause(); await drain();
  assert.equal(parseSave(store.values.get(SAVE_KEY)).gold, 1);
});
test('failed final save retains ownership until successful retry and handoff', async () => {
  const store = memory(), locks = lockManager();
  const a = setup(store, locks), b = setup(store, locks);
  a.session.start(); b.session.start(); await drain();
  a.session.tap(); store.fail = true; a.session.pause(); await drain();
  assert.equal(b.session.active, false);
  store.fail = false; a.session.start(); a.session.pause(); await drain();
  assert.equal(b.session.active, true); assert.equal(b.session.state.gold, 1);
  b.session.pause(); await drain();
});
test('storage notifications update readers but cannot replace a writers pending taps', () => {
  const h = setup(); h.session.start(); h.session.tap();
  h.session.receive(JSON.stringify({ ...freshState(T), gold: 999, revision: 99 }));
  assert.equal(h.session.state.gold, 1); h.session.pause();
  h.session.receive(JSON.stringify({ ...freshState(T), gold: 999, revision: 99 }));
  assert.equal(h.session.state.gold, 999);
});

test('corrupt records are logged once per source and archived before backup recovery writes', () => {
  const store = memory(), broken = '{"private-token":"secret';
  store.values.set(SAVE_KEY, broken);
  store.values.set(SAVE_KEY + '-backup', JSON.stringify({ ...freshState(T), gold: 123 }));
  const h = setup(store);
  assert.equal(store.writes.length, 0); // read-only construction never writes
  h.session.start();
  assert.equal(h.errors.filter(area => area === 'save.parse').length, 1);
  assert.match(h.reports[0], /invalid-json/);
  assert.doesNotMatch(h.reports.join(' '), /private-token|secret/);
  assert.equal(h.session.saveNotice.kind, 'recovered');
  h.session.tap(); h.session.pause();
  assert.equal(store.values.get(SAVE_KEY + '-recovery'), broken);
  assert.ok(store.writes.indexOf(SAVE_KEY + '-recovery') < store.writes.indexOf(SAVE_KEY));
  assert.equal(parseSave(store.values.get(SAVE_KEY)).gold, 124);
});
test('unrecoverable saves pause gameplay and can retry without resetting the original', () => {
  const store = memory(); store.values.set(SAVE_KEY, '{broken');
  const h = setup(store); h.session.start();
  assert.equal(h.session.active, false);
  assert.equal(h.session.saveNotice.kind, 'blocked');
  assert.match(h.session.saveNotice.message, /문의용 정보/);
  const before = structuredClone(h.session.state);
  assert.equal(h.session.tap(), 0);
  assert.equal(h.session.change(s => { s.gold = 999; }), undefined);
  h.advance(5000); h.session.tick();
  assert.deepEqual(h.session.state, before);
  assert.equal(store.values.get(SAVE_KEY), '{broken');
  assert.equal(store.writes.length, 0);
  store.values.set(SAVE_KEY + '-backup', JSON.stringify({ ...freshState(T), gold: 321 }));
  h.session.retryLoad();
  assert.equal(h.session.active, true);
  assert.equal(h.session.state.gold, 321);
  h.session.pause();
});
test('empty current records and corrupt legacy-only records never become a new saved game', () => {
  for (const [key, raw] of [[SAVE_KEY, ''], [LEGACY_KEY, '{broken']]) {
    const store = memory(); store.values.clear(); store.values.set(key, raw);
    const h = setup(store); h.session.start(); h.session.tap(); h.session.pause();
    assert.equal(h.session.active, false);
    assert.equal(h.session.saveNotice.kind, 'blocked');
    assert.equal(store.writes.length, 0);
    assert.equal(store.values.get(key), raw);
  }
});
test('newer save versions cannot silently roll back to an older backup', () => {
  const store = memory({ ...freshState(T), version: 99, gold: 999 });
  const original = store.values.get(SAVE_KEY);
  store.values.set(SAVE_KEY + '-backup', JSON.stringify(freshState(T)));
  const h = setup(store); h.session.start();
  assert.equal(h.session.active, false);
  assert.match(h.session.saveNotice.message, /업데이트/);
  h.session.pause(); assert.equal(store.values.get(SAVE_KEY), original);
  assert.equal(store.writes.length, 0);
});
test('first launch emits no corruption notice or error, and a missing primary can restore its backup', () => {
  const store = memory(); store.values.clear();
  const h = setup(store); h.session.start();
  assert.equal(h.session.saveNotice, null); assert.deepEqual(h.errors, []);
  h.session.pause();
  store.values.delete(SAVE_KEY);
  store.values.set(SAVE_KEY + '-backup', JSON.stringify({ ...freshState(T), gold: 123 }));
  const restored = setup(store); restored.session.start();
  assert.equal(restored.session.state.gold, 123);
  restored.session.pause();
});

test('failed damaged-original archival cannot replace the primary or recovery backup', () => {
  const store = memory(), backup = JSON.stringify({ ...freshState(T), gold: 123 });
  store.values.set(SAVE_KEY, '{broken'); store.values.set(SAVE_KEY + '-backup', backup);
  const setItem = store.setItem;
  let denied = true;
  store.setItem = function(key, value) {
    if (denied && key === SAVE_KEY + '-recovery') throw Error('quota');
    setItem.call(this, key, value);
  };
  const h = setup(store); h.session.start(); h.session.tap(); h.advance(SAVE_DELAY);
  assert.equal(store.values.get(SAVE_KEY), '{broken');
  assert.equal(store.values.get(SAVE_KEY + '-backup'), backup);
  assert.ok(h.errors.includes('save.write'));
  denied = false; h.advance(SAVE_DELAY);
  assert.equal(store.values.get(SAVE_KEY + '-recovery'), '{broken');
  assert.equal(parseSave(store.values.get(SAVE_KEY)).gold, 124);
  h.session.pause();
});
test('repairing an unreadable storage provider can retry without losing saved progress', () => {
  const store = memory({ ...freshState(T), gold: 500 });
  const read = store.getItem;
  store.getItem = () => { throw Error('denied'); };
  const h = setup(store); h.session.start();
  assert.equal(h.session.active, false); assert.equal(h.session.saveNotice.canRetry, true);
  store.getItem = read;
  assert.equal(h.session.retryLoad(), true); assert.equal(h.session.state.gold, 500);
  h.session.tap();
  assert.equal(h.session.retryLoad(), false); // never discard legitimate unsaved taps
  assert.equal(h.session.state.gold, 501);
  h.session.pause();
});
