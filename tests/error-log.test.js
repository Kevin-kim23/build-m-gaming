import test from 'node:test';
import assert from 'node:assert/strict';
import { createErrorLog, formatReport, formatTime, ERROR_LOG_KEY } from '../src/error-log.js';

const fakeStorage = (initial = {}) => {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem(k, v) { data[k] = String(v); }, removeItem(k) { delete data[k]; } };
};
const quiet = (fn) => { const warn = console.warn; console.warn = () => {}; try { return fn(); } finally { console.warn = warn; } };

test('errors are stored newest last and survive a reload of the log', () => {
  const storage = fakeStorage();
  let t = 1000;
  const log = createErrorLog({ storage, now: () => (t += 10_000) });
  log.add({ area: 'save.write', message: 'quota', stack: 'Error: quota\n at a' });
  log.add({ area: 'audio.play', message: 'blocked' });
  const again = createErrorLog({ storage });
  assert.deepEqual(again.list().map((e) => e.area), ['save.write', 'audio.play']);
  assert.equal(again.list()[0].stack, 'Error: quota\n at a');
});

test('the same error repeated within a few seconds is counted, not stored again', () => {
  let t = 0;
  const log = createErrorLog({ storage: fakeStorage(), now: () => t });
  for (let i = 0; i < 5; i++) { t += 500; log.add({ area: 'x', message: 'same' }); }
  assert.equal(log.list().length, 1);
  assert.equal(log.list()[0].count, 5);
  t += 60_000;
  log.add({ area: 'x', message: 'same' });
  assert.equal(log.list().length, 2);
});

test('only the newest entries are kept and the stored text stays small', () => {
  let t = 0;
  const storage = fakeStorage();
  const log = createErrorLog({ storage, now: () => (t += 10_000), max: 5, maxChars: 1500 });
  for (let i = 0; i < 40; i++) log.add({ area: 'a' + i, message: 'm'.repeat(250), stack: 's'.repeat(900) });
  assert.ok(log.list().length <= 5);
  assert.ok(storage.data[ERROR_LOG_KEY].length <= 1500 || log.list().length === 1);
  assert.equal(log.list().at(-1).area, 'a39');
});

test('very long messages and stacks are cut', () => {
  const log = createErrorLog({ storage: fakeStorage() });
  log.add({ area: 'x'.repeat(200), message: 'y'.repeat(2000), stack: 'z'.repeat(5000) });
  const [e] = log.list();
  assert.equal(e.area.length, 60);
  assert.equal(e.message.length, 300);
  assert.equal(e.stack.length, 800);
});

test('a damaged stored log is ignored instead of throwing, and the next error starts a fresh one', () => {
  for (const raw of ['not json', '{"a":1}', '42', '[1,"x",null]']) {
    const storage = fakeStorage({ [ERROR_LOG_KEY]: raw });
    const log = createErrorLog({ storage });
    assert.deepEqual(quiet(() => log.list()), [], raw);
    quiet(() => log.add({ area: 'x', message: 'fresh' }));
    assert.equal(log.list().length, 1, raw);
  }
});

test('a storage that refuses writes never makes the logger throw', () => {
  const storage = { getItem: () => null, setItem() { throw new Error('quota'); } };
  const log = createErrorLog({ storage });
  assert.doesNotThrow(() => quiet(() => log.add({ area: 'x', message: 'y' })));
});

test('without any storage the log still works in memory', () => {
  const log = createErrorLog({ storage: null });
  log.add({ area: 'x', message: 'y' });
  assert.equal(log.list().length, 1);
  log.clear();
  assert.equal(log.list().length, 0);
});

test('clear empties the stored log', () => {
  const storage = fakeStorage();
  const log = createErrorLog({ storage });
  log.add({ area: 'x', message: 'y' });
  log.clear();
  assert.deepEqual(createErrorLog({ storage }).list(), []);
});

test('the report names version, device and every error, and never contains save data', () => {
  const entries = [{ at: Date.UTC(2026, 9, 1, 3, 4, 5), area: 'save.write', message: 'quota', stack: 'Error: quota\n at write (a.js:1)', count: 3 }];
  const text = formatReport({ version: '0.28.0', platform: 'android', status: '자동 저장 · 2초 간격', saveVersion: 16, viewport: '390x844 @3', userAgent: 'TestAgent/1.0', entries });
  assert.match(text, /^부대 키우기 v0\.28\.0 \(android\)/);
  assert.match(text, /저장 형식: 16/);
  assert.match(text, /기기: TestAgent\/1\.0/);
  assert.match(text, /\[1\] \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} save\.write ×3: quota/);
  assert.match(text, /at write \(a\.js:1\)/);
  assert.doesNotMatch(text, /gold|soldiers|budae-kiugi-recruits/);
  assert.match(formatTime(0), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
});
