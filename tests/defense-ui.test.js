import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fieldFit, hitTest, buildMenuMarkup, towerPanelMarkup, basePanelMarkup, resultMarkup, hudValues, defenseMarkup, BAY_POS } from '../src/defense-markup.js';
import { createRun, build, upgrade, chooseTrait } from '../src/defense-run.js';
import { PADS, BASE_POS } from '../src/defense-data.js';

// 무한 방어전 2단계 화면 글자. 저장은 읽거나 쓰지 않는다.
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('the field keeps 360:780 and fits the narrower side of the phone', () => {
  assert.deepEqual(fieldFit(360, 780), { scale: 1, width: 360, height: 780 });
  assert.equal(fieldFit(320, 640).height, 640);
  assert.ok(fieldFit(320, 640).width <= 320);
  assert.equal(fieldFit(412, 915).width, 412);
});

test('taps find pads, support bays and the base', () => {
  assert.deepEqual(hitTest(...PADS[3]), { pad: 3 });
  assert.deepEqual(hitTest(...BAY_POS.recon), { bay: 'recon' });
  assert.deepEqual(hitTest(...BASE_POS), { base: true });
  assert.equal(hitTest(20, 20), null);
});

test('build menu offers the three attack lines and disables what supply cannot pay', () => {
  const run = createRun(); run.supply = 55;
  const html = buildMenuMarkup(run, 0);
  assert.equal((html.match(/data-build=/g) ?? []).length, 3);
  assert.match(html, /data-build="armor" data-cost="50">/);
  assert.match(html, /data-build="firepower" data-cost="70" disabled/);
  assert.doesNotMatch(html, /지원/);
});

test('gear panel: +1 and "to the next choice", trait buttons at Lv30, move and sell', () => {
  const run = createRun(); run.supply = 1e9;
  build(run, 1, 'firepower');
  let html = towerPanelMarkup(run, 1);
  assert.match(html, /견인포 Lv1/);
  assert.match(html, /data-upgrade="1"/);
  assert.match(html, /Lv10까지 · [\d,]+/);
  assert.match(html, /data-move>옮기기/);
  assert.match(html, /팔기 \+42/);
  upgrade(run, 1, 29);
  html = towerPanelMarkup(run, 1);
  assert.match(html, /data-trait="30:0">사거리 \+20%/);
  assert.doesNotMatch(html, /data-upgrade/);
  chooseTrait(run, 1, 30, 1); upgrade(run, 1, 10);
  assert.match(towerPanelMarkup(run, 1), /2차 진화\(갈래\) 뒤에/);
  assert.match(towerPanelMarkup(run, 1, { moving: true }), /옮길 자리를 누르세요/);
});

test('base panel: base level stats and the two support bays to build', () => {
  const run = createRun({ rank: '은하단 준장' }); run.supply = 0;
  const html = basePanelMarkup(run);
  assert.match(html, /기지 Lv10/);
  assert.match(html, /0\.86초 → 0\.81초/);
  assert.match(html, /data-base-up data-cost="1270" disabled/);
  assert.match(basePanelMarkup(run, 'recon'), /data-bay-build="recon" data-cost="100" disabled/);
});

test('HUD numbers, result and the hidden test entry', () => {
  const run = createRun();
  assert.equal(hudValues(run).timer, '다음 0:04');
  assert.equal(hudValues(run).early, '+20');
  run.phase = 'wave'; run.queue = [{}, {}];
  assert.equal(hudValues(run).timer, '남은 적 2');
  run.cleared = 12;
  assert.match(resultMarkup(run, 10), /최고 기록 경신/);
  assert.match(resultMarkup(run, 30), /최고 기록 30웨이브/);
  assert.match(defenseMarkup({ rankName: '부사령관', starSvg: '', testMode: true }), /시험 화면/);
  assert.match(read('index.html'), /<dialog id="defense-modal"/);
  assert.match(read('src/main.js'), /location\.hash === '#defense'/);
});

test('the frame loop only draws the canvas and patches changed numbers', () => {
  const ui = read('src/defense-ui.js');
  const loop = ui.slice(ui.indexOf('function render()'), ui.indexOf('function toggle'));
  assert.doesNotMatch(loop, /innerHTML|localStorage|JSON\./);
  assert.doesNotMatch(read('src/defense-art.js'), /innerHTML|localStorage/);
});
