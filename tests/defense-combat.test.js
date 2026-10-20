import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, build, upgrade, buildBay, openCards } from '../src/defense-run.js';
import { step, useIcbm } from '../src/defense-combat.js';
import { autoplay } from '../src/defense-bot.js';
import { PADS } from '../src/defense-data.js';
import { waveSpec } from '../src/defense-waves.js';

// 무한 방어전 1단계 전투 계산. 정해진 씨앗으로만 진행하고 저장은 건드리지 않는다.
const rich = () => { const run = createRun({ seed: 2 }); run.supply = 1e9; run.storedCards = 0; return run; };
const enemy = (run, patch) => {
  const e = { id: run.nextId++, type: 'grunt', boss: false, big: false, def: { supply: 3 }, hp: 50, maxHp: 50, speed: 0, dist: 0, air: false, from: null,
    shield: 0, stealth: false, burnDps: 0, burnUntil: 0, slowUntil: 0, summoned: 0, clock: 0, x: 0, y: 0, ...patch };
  run.enemies.push(e); return e;
};
const holdWave = run => { run.phase = 'wave'; run.wave = 1; run.queue = []; };

test('the first wave starts after the 4 second gap and grunts walk the road', () => {
  const run = rich();
  step(run, 3.9);
  assert.equal(run.wave, 0);
  step(run, 0.2);
  assert.equal(run.wave, 1);
  assert.equal(run.enemies.length, 1);
  step(run, 1);
  assert.ok(run.enemies[0].dist > 30);
});

test('ground-only gear ignores air; air units fly straight to the base and cost a heart', () => {
  const run = rich(); holdWave(run);
  build(run, 5, 'armor'); upgrade(run, 5, 20);
  enemy(run, { air: true, from: [180, 640], speed: 40, hp: 1e6 });
  step(run, 2);
  assert.equal(run.hearts, 19);
  assert.equal(run.stats.kills, 0);
});

test('stealth enemies are only shot inside the recon radar', () => {
  const run = rich(); holdWave(run);
  build(run, 3, 'firepower'); upgrade(run, 3, 10);
  const ghost = enemy(run, { stealth: true, dist: 820, hp: 1e6 });
  step(run, 1);
  assert.equal(ghost.hp, 1e6);
  buildBay(run, 'recon'); run.bays.recon.level = 20;
  step(run, 2);
  assert.ok(ghost.hp < 1e6);
});

test('a shield blocks three hits; the railgun ignores shields', () => {
  const run = rich(); holdWave(run);
  build(run, 1, 'firepower');
  const shielded = enemy(run, { shield: 3, dist: 245, hp: 1e6 });
  step(run, 1.6 * 2 + 0.1);   // shots at 0, 1.6, 3.2 s
  assert.equal(shielded.shield, 0);
  assert.equal(shielded.hp, 1e6);
  run.pads[1] = { line: 'armor', stage: 2, branch: 0, level: 20, spent: 0, traits: {}, cooldown: 0, stunnedUntil: 0 };
  const other = enemy(run, { shield: 3, dist: 245, hp: 1e6 });
  step(run, 0.1);
  assert.equal(other.shield, 3);
  assert.ok(other.hp < 1e6);
});

test('a big boss leak costs 5 hearts and ends the run at zero', () => {
  const run = rich(); holdWave(run); run.hearts = 5;
  enemy(run, { boss: true, big: true, dist: 1133, speed: 10, def: { supply: 0 } });
  step(run, 0.5);
  assert.equal(run.hearts, 0);
  assert.equal(run.phase, 'over');
});

test('clearing a wave stores a card; the clock stops while the cards are open', () => {
  const run = rich(); holdWave(run);
  step(run, 0.1);
  assert.equal(run.cleared, 1);
  assert.equal(run.storedCards, 1);
  openCards(run);
  const t = run.time;
  step(run, 5);
  assert.equal(run.time, t);
});

test('the stun boss warns, then freezes the strongest gear; the summon boss calls grunts', () => {
  const run = rich(); holdWave(run);
  build(run, 1, 'armor'); upgrade(run, 1, 5); build(run, 4, 'armor');
  enemy(run, { boss: true, big: true, def: { stun: true, supply: 0 }, hp: 1e9, maxHp: 1e9, dist: 10 });
  step(run, 5.1);
  assert.equal(run.warning?.at, 1);
  step(run, 3);
  assert.ok(run.pads[1].stunnedUntil > run.time);
  assert.equal(run.pads[4].stunnedUntil, 0, 'far gear keeps firing');
  const summon = rich(); holdWave(summon);
  enemy(summon, { type: 'boss', boss: true, big: true, def: { summon: true, supply: 0 }, hp: 30, maxHp: 100, dist: 300 });
  step(summon, 0.05);
  assert.equal(summon.enemies.filter(e => e.type === 'grunt').length, 12);
});

test('ICBM hits everything in range including air, then cools down', () => {
  const run = rich(); holdWave(run); run.skills.icbm = { cooldown: 40, ready: 0 };
  const [x, y] = PADS[1];
  const a = enemy(run, { x, y, hp: 1e6 }), b = enemy(run, { x: x + 20, y, air: true, from: [x, 40], hp: 1e6 });
  useIcbm(run, x, y);
  const dmg = 8 * waveSpec(1).hp;
  assert.equal(a.hp, 1e6 - dmg);
  assert.equal(b.hp, 1e6 - dmg);
  assert.throws(() => useIcbm(run, x, y), /cooling/);
});

test('autoplay balance: no gear falls in 2-3 waves, a plain bot goes far, a higher rank goes farther', () => {
  const idle = createRun({ seed: 3 });
  while (idle.phase !== 'over') step(idle, 1);
  assert.ok(idle.cleared <= 3, `idle ${idle.cleared}`);
  const low = autoplay(createRun({ rank: '부사령관', seed: 7 }));
  const high = autoplay(createRun({ rank: '은하단 준장', seed: 7 }));
  assert.ok(low >= 25 && low <= 60, `부사령관 bot ${low}`);
  assert.ok(high > low, `은하단 준장 ${high} > ${low}`);
});
