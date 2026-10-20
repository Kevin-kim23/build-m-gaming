import test from 'node:test';
import assert from 'node:assert/strict';
import { enemyArt, waveBanner, bossFor } from '../src/defense-waves.js';
import { hudValues } from '../src/defense-markup.js';
import { createRun } from '../src/defense-run.js';
import { step } from '../src/defense-combat.js';

// 무한 방어전 4단계: 구간별 적 그림, 보스 체력 줄, 웨이브 안내.
test('enemy gear art changes with the 20-wave zone; big bosses use their own art', () => {
  assert.equal(enemyArt(1, 'grunt'), 'tank');
  assert.equal(enemyArt(21, 'grunt'), 'plasmaTank');
  assert.equal(enemyArt(41, 'grunt'), 'railgunTank');
  assert.equal(enemyArt(61, 'grunt'), 'tank', '2회차는 아스테라 그림');
  assert.notEqual(enemyArt(3, 'air'), enemyArt(23, 'air'));
  assert.equal(enemyArt(40, 'boss', bossFor(40)), 'droneCarrier');
});

test('wave banners: new enemy tips, bosses and zone changes', () => {
  assert.equal(waveBanner(1), null);
  assert.match(waveBanner(3).text, /공중 적/);
  assert.match(waveBanner(8).text, /방패/);
  assert.equal(waveBanner(10).title, '중간 보스 등장');
  assert.equal(waveBanner(20).title, '보스 등장: 강철 거인');
  assert.equal(waveBanner(21).title, '에테리온 전선 진입');
  assert.match(waveBanner(21).text, /×1\.5/);
  assert.equal(waveBanner(61).title, '아스테라 전선 진입 · 2회차');
});

test('the run shows a banner for three seconds and a boss bar while a boss lives', () => {
  const run = createRun({ seed: 1 }); run.storedCards = 0;
  run.wave = 2; step(run, 4.1);
  assert.equal(run.wave, 3);
  assert.match(hudValues(run).bannertitle, /새 적/);
  assert.ok(run.banner.until - run.time <= 3);
  assert.equal(hudValues(run).bossname, '');
  run.enemies.push({ big: true, boss: true, def: { name: '강철 거인' }, hp: 25, maxHp: 100 });
  assert.deepEqual([hudValues(run).bossname, hudValues(run).bossbar], ['강철 거인', '25%']);
});
