import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, SAVE_VERSION } from '../src/state.js';
import { parseSave, inspectSave } from '../src/save.js';
import { serializeSave } from '../src/money.js';
import { emptyDefense, recordDefenseRun, rewardsLeft, awaken, awakenBonus, defenseUnlocked, DAILY_REWARDS } from '../src/defense-progress.js';
import { rewardDay } from '../src/campaign-rewards.js';
import { lobbyMarkup } from '../src/defense-lobby.js';
import { homeMarkup } from '../src/home-view.js';
import { createRun } from '../src/defense-run.js';

// 무한 방어전 5단계: 저장 버전 44, 기록·보상·각성. 시험용 가짜 기록만 쓰고 실제 저장은 건드리지 않는다.
const T = Date.UTC(2026, 9, 20, 3), DAY = 86_400_000;
const fresh = () => freshState(T);

test('save version 44 adds the defense record; a version 43 save loads with an empty one', () => {
  assert.equal(SAVE_VERSION, 44);
  const old = { ...fresh(), version: 43 }; delete old.defense;
  const loaded = parseSave(serializeSave(old), T);
  assert.equal(loaded.version, 44);
  assert.deepEqual(loaded.defense, emptyDefense());
  const s = fresh(); recordDefenseRun(s, 17, T);
  assert.deepEqual(parseSave(serializeSave(s), T).defense, s.defense);
});

test('a broken defense record is rejected instead of silently fixed', () => {
  const bad = { ...fresh(), defense: { ...emptyDefense(), rewardCount: 9 } };
  assert.ok(inspectSave(serializeSave(bad), T).issue);
  const future = { ...fresh(), defense: { ...emptyDefense(), best: 5, bestAt: T + DAY } };
  assert.ok(inspectSave(serializeSave(future), T).issue);
});

test('rewards: loot 8 per wave and one medal per wave, three runs a day, the best record always counts', () => {
  const s = fresh();
  assert.equal(rewardsLeft(s, T), DAILY_REWARDS);
  const first = recordDefenseRun(s, 12, T);
  assert.deepEqual([first.newBest, first.rewarded, first.loot, first.medals, first.left], [true, true, 96, 12, 2]);
  recordDefenseRun(s, 3, T); recordDefenseRun(s, 4, T);
  const fourth = recordDefenseRun(s, 30, T);
  assert.deepEqual([fourth.newBest, fourth.rewarded, fourth.loot], [true, false, 0]);
  assert.equal(s.defense.best, 30);
  assert.equal(s.defense.medals, 19);
  assert.equal(s.loot.balance, 152);
  assert.equal(rewardsLeft(s, T + DAY), 3, 'next day resets');
  assert.equal(s.defense.rewardDay, rewardDay(T));
  assert.equal(recordDefenseRun(s, 0, T + DAY).rewarded, false, 'zero waves pay nothing');
});

test('awakening spends medals for ★1-★5 and becomes a line attack bonus at run start', () => {
  const s = fresh(); s.defense.medals = 70;
  assert.deepEqual(awaken(s, 'armor'), { ok: true, level: 1 });
  assert.deepEqual(awaken(s, 'armor'), { ok: true, level: 2 });
  assert.deepEqual(awaken(s, 'armor'), { ok: false, reason: 'medals' });
  assert.equal(s.defense.medals, 10);
  assert.deepEqual(awakenBonus(s), { armor: 0.2, firepower: 0, air: 0 });
  assert.equal(createRun({ awaken: awakenBonus(s) }).mods.line.armor, 0.2);
  s.defense.awaken.air = 5;
  assert.deepEqual(awaken(s, 'air'), { ok: false, reason: 'max' });
});

test('unlock at 부사령관; the lobby shows record, start base level, rewards and awakening', () => {
  assert.equal(defenseUnlocked(fresh()), false);
  const s = fresh(); s.defense.best = 34; s.defense.bestAt = T; s.defense.medals = 25;
  const html = lobbyMarkup(s, '은하단 준장', T);
  assert.match(html, /최고 기록 34웨이브/);
  assert.match(html, /시작 기지 Lv10/);
  assert.match(html, /다음 계급 은하단 소장<\/span><b>Lv12부터/);
  assert.match(html, /3 \/ 3판 남음/);
  assert.match(html, /data-awaken="armor">각성 · 훈장 20/);
  assert.match(html, /data-awaken="firepower">/);
  assert.match(html, /data-defense-start/);
});

test('home shows the defense button between the loot shop and battle', () => {
  const html = homeMarkup({});
  assert.match(html, /id="open-loot"[\s\S]*id="open-defense"[\s\S]*id="open-battle"/);
  assert.match(html, /무한 방어전<small id="defense-home-label">/);
});
