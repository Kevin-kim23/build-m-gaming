import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { partitionTests, SLOW_TEST_FILES } from '../tools/test-groups.mjs';

test('fast and slow groups cover every test file exactly once', () => {
  const all = readdirSync(new URL('.', import.meta.url), { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.test.js'))
    .map(entry => entry.name);
  const { fast, slow } = partitionTests(all);
  assert.deepEqual([...fast, ...slow].sort(), [...all].sort());
  assert.equal(new Set([...fast, ...slow]).size, all.length);
  assert.deepEqual(slow, [...SLOW_TEST_FILES].sort());
  for (const name of ['exact-money.test.js', 'save-diagnostics.test.js', 'late-content-save.test.js']) {
    assert.ok(fast.includes(name), `${name} must remain in the fast checks`);
  }
});

test('new tests automatically join fast checks and stale slow entries fail loudly', () => {
  const { fast } = partitionTests([...SLOW_TEST_FILES, 'future-regression.test.js']);
  assert.deepEqual(fast, ['future-regression.test.js']);
  assert.throws(() => partitionTests(SLOW_TEST_FILES.slice(1)), /Update the slow test list/);
  assert.throws(() => partitionTests([...SLOW_TEST_FILES, SLOW_TEST_FILES[0]]), /Duplicate/);
  assert.throws(() => partitionTests([...SLOW_TEST_FILES, '../unrelated.test.js']), /top-level/);
});
