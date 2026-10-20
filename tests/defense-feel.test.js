import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ALIEN_SHAPES, ALIEN_PALETTES, ALIEN_KINDS } from '../src/alien-art.js';
import { ENEMIES, BOSSES, TOWERS } from '../src/defense-data.js';
import { short, createDefenseFeedback } from '../src/defense-feedback.js';
import { createRun, build, startRun } from '../src/defense-run.js';
import { step } from '../src/defense-combat.js';
import { COACH_STEPS } from '../src/defense-coach.js';

// 0.82 무한 방어전 개편: 공허 군단 그림, 시작 버튼, 포신·적 방향, 사건·피해 숫자·효과음, 첫 판 안내.
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Void Legion shapes are symmetric pixel maps of 16 or 24 cells using only the palette letters', () => {
  for (const kind of ALIEN_KINDS) {
    const rows = ALIEN_SHAPES[kind], width = rows[0].length;
    assert.ok([8, 12].includes(width), kind);
    assert.equal(rows.length, width * 2, `${kind} is square`);
    for (const row of rows) { assert.equal(row.length, width, kind); assert.match(row, /^[.dblhpgce]+$/, kind); }
  }
  for (const e of [...Object.values(ENEMIES), ...BOSSES]) assert.ok(ALIEN_KINDS.includes(e.art), e.name);
  for (const palette of Object.values(ALIEN_PALETTES)) assert.deepEqual(Object.keys(palette).sort(), ['b', 'c', 'd', 'e', 'g', 'h', 'l', 'p']);
  for (const e of [...Object.values(ENEMIES), ...BOSSES]) assert.ok(!Object.values(TOWERS).some(t => t.art === e.art), `${e.name} must not reuse our gear art`);
});

test('a manual run waits on 시작: time and supply stay still until the start button', () => {
  const run = createRun({ manualStart: true });
  step(run, 10);
  assert.deepEqual([run.phase, run.time, run.wave, run.supply], ['ready', 0, 0, 150]);
  startRun(run);
  step(run, 0.1);
  assert.equal(run.wave, 1);
  assert.throws(() => startRun(run), /Already started/);
});

test('gear remembers where it aims, enemies their heading, and the screen gets kill / leak / wave events', () => {
  const run = createRun({ seed: 3 }); run.supply = 1e9;
  build(run, 0, 'armor'); build(run, 1, 'firepower');
  step(run, 12);
  assert.ok(run.events.some(e => e.type === 'wave'));
  assert.ok(run.pads.some(t => Number.isFinite(t.aim)), 'a gear turned toward a target');
  assert.ok(run.enemies.every(e => Number.isFinite(e.angle)));
  assert.ok(run.fx.every(f => f.amount > 0 && typeof f.art === 'string'));
  step(run, 30);
  assert.ok(run.stats.kills > 0);
});

test('feedback turns shots and events into floating numbers and throttled sounds, then clears the events', () => {
  const played = [], audio = { battle: (kind, on, gear) => played.push([kind, gear]) };
  const fb = createDefenseFeedback(() => true, audio);
  const run = createRun();
  run.fx.push({ at: 1, x1: 50, y1: 50, amount: 12345, art: 'tank', line: 'armor' });
  run.events.push({ type: 'kill', x: 40, y: 40, supply: 3 }, { type: 'wave', wave: 2 });
  fb.drain(run, 0);
  assert.deepEqual(fb.floats.map(f => f.text), ['-12.3K', '+3 💰']);
  assert.equal(run.events.length, 0);
  assert.deepEqual(played.map(p => p[0]), ['shot', 'hit', 'start']);
  fb.drain(run, 10);
  assert.equal(played.length, 3, 'old shots are not replayed');
  assert.deepEqual([short(9), short(12345), short(2.5e6)], ['9', '12.3K', '2.5M']);
});

test('first-run coach has three steps and is remembered outside the save record', () => {
  assert.equal(COACH_STEPS.length, 3);
  assert.match(COACH_STEPS[0], /끌어다 놓으세요/);
  const ui = read('src/defense-ui.js');
  assert.match(ui, /localStorage\.getItem\(COACH_KEY\)/);
  assert.doesNotMatch(ui.slice(ui.indexOf('function render()'), ui.indexOf('function paintNext')), /localStorage/);
});
