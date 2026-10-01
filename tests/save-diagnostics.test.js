import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as saves from '../src/save.js';
import { freshState, parseSave } from '../src/game.js';
import { MAX_GOLD, serializeSave } from '../src/money.js';

const T = 1800000000000;
const inspect = (raw) => saves.inspectSave(raw, T);
test('missing saves are normal, but empty or malformed records have a safe diagnostic', () => {
  for (const raw of [null, undefined]) assert.deepEqual(inspect(raw), { state: null, issue: null });
  for (const raw of ['', '{"private-token":"secret', 'null', '[]']) {
    const result = inspect(raw);
    assert.equal(result.state, null);
    assert.ok(result.issue.code);
    assert.doesNotMatch(JSON.stringify(result.issue), /private-token|secret/);
    assert.equal(parseSave(raw, T), null);
  }
});
test('save diagnostics distinguish versions, fields, amounts and cross-field constraints', () => {
  const cases = [
    [{ version: 99 }, 'unsupported-version', 'version'],
    [{ gold: '10000000000000000001' }, 'invalid-field', 'gold'],
    [{ gold: Number.MAX_SAFE_INTEGER + 1 }, 'invalid-field', 'gold'],
    [{ taps: -1 }, 'invalid-field', 'taps'],
    [{ sound: 'yes' }, 'invalid-field', 'sound'],
    [{ officerSchoolLevel: 1, ncoSchoolLevel: 0 }, 'invalid-field', 'officerSchoolLevel'],
    [{ autoTouchTicks: 1 }, 'invalid-field', 'autoTouchTicks'],
    [{ equipment: {} }, 'invalid-field', 'equipment'],
  ];
  for (const [change, code, field] of cases) {
    const result = inspect(serializeSave({ ...freshState(T), ...change }));
    assert.equal(result.state, null);
    assert.equal(result.issue.code, code);
    assert.equal(result.issue.field, field);
  }
});
test('diagnostic parsing preserves exact large money, current state and v2 migration', () => {
  const state = { ...freshState(T), gold: MAX_GOLD - 1n };
  assert.deepEqual(inspect(serializeSave(state)), { state, issue: null });
  const old = inspect(JSON.stringify({ version: 2, gold: 123, taps: 123, rank: 0, sound: true }));
  assert.equal(old.issue, null);
  assert.equal(old.state.gold, 123);
  assert.equal(old.state.version, state.version);
});
test('game and save imports form an acyclic dependency graph', () => {
  const done = new Set(), visiting = new Set();
  function visit(url) {
    assert.ok(!visiting.has(url.href), `Circular import at ${url.pathname}`);
    if (done.has(url.href)) return;
    visiting.add(url.href);
    const source = readFileSync(url, 'utf8');
    for (const match of source.matchAll(/(?:import|export)\s[^;]*?from\s*["'](\.\.?\/[^"']+\.js)["']/g))
      visit(new URL(match[1], url));
    visiting.delete(url.href); done.add(url.href);
  }
  visit(new URL('../src/game.js', import.meta.url));
  visit(new URL('../src/save.js', import.meta.url));
});
