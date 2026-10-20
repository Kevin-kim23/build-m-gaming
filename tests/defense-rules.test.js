import test from 'node:test';
import assert from 'node:assert/strict';
import { baseStats, baseUpgradeCost, startBaseLevel, upgradeCost, upgradeCostTo, nextChoiceLevel, sellRefund, callEarlyBonus } from '../src/defense-economy.js';
import { PATH_LENGTH, pointAt, pathStretchesInRange } from '../src/defense-path.js';
import { zoneFor, waveSpec, bossFor, newEnemyTypes } from '../src/defense-waves.js';
import { PADS, PATH } from '../src/defense-data.js';
import { createRun, build, upgrade, chooseTrait, sell, move, evolve, buildBay, upgradeBay, callEarly, openCards, pickCard, reroll, towerId, towerStats } from '../src/defense-run.js';
import { drawCards, applyCard, evolvable, EVO_PITY_WAVES } from '../src/defense-cards.js';

// 무한 방어전 1단계: 화면 없는 규칙 계산. 저장 기록은 읽거나 쓰지 않는다.
const rich = (opts) => { const run = createRun(opts); run.supply = 1e9; return run; };

test('base level table: supply every interval, cap and upgrade cost grow to Lv30', () => {
  assert.deepEqual(Object.values(baseStats(1)).map(v => +v.toFixed(1)), [1.5, 10, 200, 6.7]);
  assert.equal(+baseStats(10).perSecond.toFixed(1), 32.6);
  assert.equal(baseStats(30).interval, 0.4);
  assert.equal(baseStats(30).cap, 1650);
  assert.equal(baseUpgradeCost(1), 0);
  assert.equal(baseUpgradeCost(2), 120);
  assert.equal(baseUpgradeCost(10), 980);
  assert.throws(() => baseStats(31), RangeError);
});

test('rank decides the starting base level; below 부사령관 the mode is locked', () => {
  assert.equal(startBaseLevel('부사령관'), 1);
  assert.equal(startBaseLevel('은하 원수'), 6);
  assert.equal(startBaseLevel('은하단 준장'), 10);
  assert.equal(startBaseLevel('은하단 원수'), 18);
  assert.equal(startBaseLevel('대장'), null);
  assert.equal(createRun({ rank: '은하단 준장' }).baseLevel, 10);
  assert.throws(() => createRun({ rank: '대장' }), /locked/);
});

test('upgrade cost follows build cost × (0.4 + Lv × 0.05), tripled into Lv30, 40 and 50', () => {
  assert.equal(upgradeCost(70, 1), 32);
  assert.equal(upgradeCost(70, 28), 126);
  assert.equal(upgradeCost(70, 29), 389);
  assert.equal(upgradeCost(70, 49), 599);
  assert.equal(upgradeCostTo(70, 1, 3), upgradeCost(70, 1) + upgradeCost(70, 2));
  assert.deepEqual([1, 10, 25, 45, 50].map(nextChoiceLevel), [10, 20, 30, 50, null]);
  assert.equal(sellRefund(101), 60);
  assert.equal(callEarlyBonus(3.9), 19);
});

test('the winding road: fixed length, ends at the base, and a centre pad covers two stretches', () => {
  assert.equal(Math.round(PATH_LENGTH), 1134);
  assert.deepEqual(pointAt(0), PATH[0]);
  assert.deepEqual(pointAt(1e6), PATH.at(-1));
  assert.ok(pathStretchesInRange(...PADS[1], 112) >= 2, '명당');
  assert.equal(pathStretchesInRange(...PADS[0], 60), 0);
});

test('waves: 20-wave zones loop with double HP, enemy types open on schedule, bosses every 10', () => {
  assert.deepEqual([1, 21, 41, 61].map(w => zoneFor(w).id), ['asteria', 'aetherion', 'erebus', 'asteria']);
  assert.equal(zoneFor(61).hp, 2);
  assert.equal(zoneFor(61).loop, 2);
  assert.equal(waveSpec(5).enemies.length, 11);
  assert.equal(waveSpec(10).enemies.length, 17);
  const types = w => new Set(waveSpec(w).enemies.map(e => e.type));
  assert.ok(!types(2).has('air') && types(3).has('air'));
  assert.ok(!types(7).has('shield') && types(8).has('shield'));
  assert.ok(types(14).has('fast') && types(25).has('stealth'));
  assert.deepEqual(newEnemyTypes(3), ['air']);
  assert.equal(bossFor(10).name, '거대 갑각병');
  assert.deepEqual([20, 40, 60, 80].map(w => bossFor(w).name), ['모체', '포자 모선', '심연 거신', '모체']);
  assert.equal(bossFor(11), null);
  assert.ok(waveSpec(21).hp > waveSpec(20).hp * 1.5, 'zone change makes enemies tougher');
});

test('build spends supply, move is free and swaps when the target pad is taken, sell refunds 60%', () => {
  const run = createRun(); run.supply = 100;
  build(run, 1, 'armor');
  assert.equal(run.supply, 50);
  assert.throws(() => build(run, 2, 'firepower'), /Not enough supply/);
  assert.throws(() => build(run, 1, 'armor'), /taken/);
  run.supply = 100; build(run, 2, 'firepower');
  move(run, 1, 2);
  assert.deepEqual(run.pads.slice(1, 3).map(t => t.line), ['firepower', 'armor']);
  move(run, 2, 5);
  assert.equal(run.pads[2], null);
  assert.equal(run.pads[5].line, 'armor');
  assert.equal(run.supply, 30);
  sell(run, 5);
  assert.equal(run.supply, 60);
});

test('upgrades stop at Lv30 and Lv40 until a trait is chosen; Lv40 traits need the branch', () => {
  const run = rich();
  build(run, 0, 'firepower');
  upgrade(run, 0, 29);
  assert.equal(run.pads[0].level, 30);
  assert.throws(() => upgrade(run, 0), /trait/);
  chooseTrait(run, 0, 30, 0);
  assert.equal(towerStats(run, run.pads[0]).range, 140 * 1.2);
  upgrade(run, 0, 10);
  assert.throws(() => chooseTrait(run, 0, 40, 0), /second evolution/);
});

test('evolution uses a ticket, needs Lv10 / Lv20, keeps the level and picks a branch', () => {
  const run = rich();
  build(run, 0, 'firepower');
  upgrade(run, 0, 8);
  run.evoTickets = 2;
  assert.throws(() => evolve(run, { pad: 0 }), /cannot evolve/);
  upgrade(run, 0);
  evolve(run, { pad: 0 });
  assert.equal(towerId(run.pads[0]), 'selfPropelled');
  assert.equal(run.pads[0].level, 10);
  upgrade(run, 0, 10);
  evolve(run, { pad: 0 }, 1);
  assert.equal(towerId(run.pads[0]), 'siegeMech');
  assert.equal(run.pads[0].level, 20);
  assert.throws(() => evolve(run, { pad: 0 }), /ticket/);
  buildBay(run, 'recon'); upgradeBay(run, 'recon', 19); run.evoTickets = 1;
  evolve(run, { bay: 'recon' }, 0);
  assert.equal(run.bays.recon.branch, 'globalRadar');
});

test('cards: three different cards, the same seed draws the same hand, evolution only when usable', () => {
  const a = rich({ seed: 5 }), b = rich({ seed: 5 });
  const hand = drawCards(a);
  assert.equal(new Set(hand.map(c => c.id)).size, 3);
  assert.deepEqual(hand, drawCards(b));
  for (let i = 0; i < 30; i++) assert.ok(!drawCards(a).some(c => c.id === 'evolve'), 'no Lv10 gear yet');
  build(a, 0, 'armor'); upgrade(a, 0, 9);
  assert.deepEqual(evolvable(a), [{ pad: 0 }]);
  a.wavesWithoutEvo = EVO_PITY_WAVES;
  assert.ok(drawCards(a).some(c => c.id === 'evolve'), 'pity guarantees the ticket');
  assert.equal(a.wavesWithoutEvo, 0);
});

test('card effects stack up to their caps', () => {
  const run = createRun();
  for (let i = 0; i < 10; i++) applyCard(run, { id: 'allAttack' });
  assert.equal(run.mods.allAttack, 0.6);
  for (let i = 0; i < 10; i++) applyCard(run, { id: 'supplySpeed' });
  assert.equal(run.mods.supplyInterval, 0.5);
  for (let i = 0; i < 10; i++) applyCard(run, { id: 'lifeExtend' });
  assert.deepEqual([run.hearts, run.maxHearts], [40, 40]);
  applyCard(run, { id: 'lineFocus', line: 'air' });
  assert.equal(run.mods.line.air, 0.2);
  applyCard(run, { id: 'icbm' }); applyCard(run, { id: 'icbm' });
  assert.equal(run.skills.icbm.cooldown, 32);
  applyCard(run, { id: 'mines' });
  assert.equal(run.mines.length, 3);
});

test('stored cards: open draws a hand, one reroll per run, picking applies and consumes', () => {
  const run = createRun({ seed: 9 });
  assert.equal(run.storedCards, 1);
  openCards(run);
  assert.equal(run.hand.length, 3);
  reroll(run);
  assert.throws(() => reroll(run), /reroll/);
  pickCard(run, 0);
  assert.equal(run.hand, null);
  assert.equal(run.storedCards, 0);
  assert.throws(() => openCards(run), /No stored card/);
});

test('call early only between waves and pays the remaining seconds × 5', () => {
  const run = createRun(); run.supply = 100;
  run.gapLeft = 3;
  callEarly(run);
  assert.equal(run.supply, 115);
  assert.equal(run.gapLeft, 0);
  run.phase = 'wave';
  assert.throws(() => callEarly(run), /Not between waves/);
});
