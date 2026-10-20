import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fieldFit, hitTest, towerBubbleMarkup, bubblePlace, padAction, nextWave, basePanelMarkup, hudValues, defenseMarkup, BAY_POS } from '../src/defense-markup.js';
import { resultMarkup } from '../src/defense-lobby.js';
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

test('bottom tray: the three attack lines with cost; card and base buttons; evolution badge', () => {
  const html = defenseMarkup({ rankName: '부사령관', starSvg: '' });
  assert.equal((html.match(/data-tray-line=/g) ?? []).length, 3);
  assert.match(html, /data-tray-line="firepower" data-cost="70"/);
  assert.match(html, /data-defense-cards disabled>카드/);
  assert.match(html, /data-defense-base>기지/);
  assert.equal((html.match(/data-pad-act=/g) ?? []).length, 6);
  assert.match(html, /data-defense-go hidden>▶ 시작/);
});

test('the button under each gear: upgrade with cost, trait, evolve, locked and max', () => {
  const run = createRun(); run.supply = 1e9;
  assert.equal(padAction(run, 1), null);
  build(run, 1, 'firepower');
  assert.deepEqual(padAction(run, 1), { kind: 'up', label: '▲ 32', cost: 32, disabled: false });
  run.supply = 10;
  assert.equal(padAction(run, 1).disabled, true);
  run.supply = 1e9; upgrade(run, 1, 9); run.evoTickets = 1;
  assert.equal(padAction(run, 1).kind, 'evolve');
  run.evoTickets = 0; upgrade(run, 1, 20);
  assert.equal(padAction(run, 1).kind, 'trait');
  chooseTrait(run, 1, 30, 0); upgrade(run, 1, 10);
  assert.deepEqual(padAction(run, 1), { kind: 'lock', label: '진화 필요', disabled: true });
});

test('gear bubble: stats, jump to next choice, sell, drag tip; placed away from the edge', () => {
  const run = createRun(); run.supply = 1e9;
  build(run, 1, 'firepower');
  const html = towerBubbleMarkup(run, 1);
  assert.match(html, /견인포 <span>Lv1/);
  assert.match(html, /Lv10까지 · [\d,]+/);
  assert.match(html, /팔기 \+42/);
  assert.match(html, /장비를 끌면 옮기기/);
  upgrade(run, 1, 29);
  assert.match(towerBubbleMarkup(run, 1), /data-trait="30:0">사거리 \+20%/);
  assert.equal(bubblePlace(0).below, true);
  assert.equal(bubblePlace(5).below, false);
});

test('next wave preview counts each enemy type, boss included', () => {
  const run = createRun(); run.wave = 19;
  const next = nextWave(run);
  assert.equal(next.reduce((s, e) => s + e.count, 0), 27);
  assert.deepEqual(next.at(-1), { type: 'boss', count: 1, name: '모체' });
});

test('base panel: base level stats and the two support bays to build', () => {
  const run = createRun({ rank: '은하단 준장' }); run.supply = 0;
  const html = basePanelMarkup(run);
  assert.match(html, /기지 Lv10/);
  assert.match(html, /0\.86초 → 0\.81초/);
  assert.match(html, /data-base-up data-cost="1270" disabled/);
  assert.match(basePanelMarkup(run, 'recon'), /data-bay-build="recon" data-cost="100" disabled/);
});

test('HUD numbers, result and the home entry', () => {
  const run = createRun();
  assert.equal(hudValues(run).timer, '다음 4초');
  assert.equal(hudValues(createRun({ manualStart: true })).timer, '다음');
  assert.equal(hudValues(run).early, '+20');
  run.phase = 'wave'; run.queue = [{}, {}];
  assert.equal(hudValues(run).timer, '남은 적 2');
  run.cleared = 12;
  assert.match(resultMarkup(run, 12, { newBest: true, rewarded: true, loot: 96, medals: 12, left: 2 }), /최고 기록 경신[\s\S]*\+96[\s\S]*\+12[\s\S]*2판/);
  assert.match(resultMarkup(run, 30, { newBest: false, rewarded: false }), /최고 기록 30웨이브[\s\S]*기록만 저장/);
  assert.match(resultMarkup(run, 30, null), /저장하지 못했어요/);
  assert.match(defenseMarkup({ rankName: '부사령관', starSvg: '' }), /data-defense-close data-back-first/);
  assert.match(read('index.html'), /<dialog id="defense-modal"/);
  assert.doesNotMatch(read('src/main.js'), /#defense'/);
  assert.match(read('src/main.js'), /#open-defense"\)\.onclick = \(\) => defenseUI\.open\(\)/);
});

test('the frame loop only draws the canvas and patches changed numbers', () => {
  const ui = read('src/defense-ui.js');
  const loop = ui.slice(ui.indexOf('function render()'), ui.indexOf('function paintNext'));
  assert.doesNotMatch(loop, /innerHTML|localStorage|JSON\./);
  assert.doesNotMatch(read('src/defense-art.js'), /innerHTML|localStorage/);
});
