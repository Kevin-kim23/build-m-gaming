import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState, parseSave, SAVE_KEY } from '../src/game.js';
import { FIELD_ARMY_SIZE } from '../src/formations.js';
import { createBattle, useSpecial, advanceBattle } from '../src/battle.js';
import { recordBattleVictory } from '../src/battle-progress.js';
import { createGameSession } from '../src/session.js';
import { reconcileAchievements } from '../src/achievements.js';

const T = 1800000000000;
const army = () => {
  const state = { ...freshState(T), soldiers: FIELD_ARMY_SIZE - 600,
    sergeants: 40, staffSergeants: 10, gold: 1234567, taps: 123 };
  for (const id of ['artillery', 'tank', 'selfPropelled']) state.equipment[id] = { level: 3, count: 1, deployed: true };
  reconcileAchievements(state); return state;
};
function win(state, stage = 1) {
  let battle = createBattle(state, stage);
  while(battle.status==='running'){for(const g of battle.player.equipment)battle=useSpecial(battle,g.id);battle=advanceBattle(battle,150);}
  assert.equal(battle.status, 'victory');
  return battle;
}

test('a real victory records progress, its medal and the loot gold without changing troops', () => {
  const state = army(), before = structuredClone(state), battle = win(state);
  const result = recordBattleVictory(state, battle);
  assert.deepEqual({ ...result, gold: undefined, stars: undefined }, { ok: true, firstClear: true, gold: undefined, stars: undefined, achievements: ['firstVictory'] });
  assert.ok(result.stars >= 1 && result.stars <= 3);
  assert.equal(state.gold, before.gold + result.gold);
  assert.deepEqual({ ...state, gold: 0 }, { ...before, gold: 0, campaignCleared: 1, earnedAchievements: [...before.earnedAchievements, 'firstVictory'] });
  assert.equal(battle.enemy.hq.hp, 0);
  assert.ok(battle.player.hq.hp > 0);
});

test('unfinished, defeated and simultaneous-destruction results never advance progression', () => {
  const state = army(), running = createBattle(state, 1), victory = win(state);
  const rejected = [running,
    { ...victory, status: 'defeat' },
    { ...victory, status: 'draw', player: { ...victory.player, hq: { ...victory.player.hq, hp: 0 } } },
    { ...victory, enemy: { ...victory.enemy, hq: { ...victory.enemy.hq, hp: 1 } } },
    { ...victory, player: { ...victory.player, hq: { ...victory.player.hq, hp: 0 } } },
    null,
  ];
  for (const result of rejected) {
    assert.equal(recordBattleVictory(state, result).ok, false);
    assert.equal(state.campaignCleared, 0);
  }
});

test('replayed victories are idempotent and stage progress cannot skip ahead or move backwards', () => {
  const state = army(), first = win(state);
  assert.equal(recordBattleVictory(state, { ...first, stageId: 3 }).reason, 'sequence');
  assert.equal(state.campaignCleared, 0);
  recordBattleVictory(state, first);
  assert.deepEqual({ ...recordBattleVictory(state, first), gold: 0, stars: 0 }, { ok: true, firstClear: false, gold: 0, stars: 0, achievements: [] });
  recordBattleVictory(state, win(state, 2));
  assert.equal(state.campaignCleared, 2);
  assert.deepEqual({ ...recordBattleVictory(state, first), gold: 0, stars: 0 }, { ok: true, firstClear: false, gold: 0, stars: 0, achievements: [] });
  assert.equal(state.campaignCleared, 2);
});

test('recording a victory rechecks the actual rank gate and known stage identity', () => {
  const state = army(), victory = win(state);
  state.sergeants = 39;
  assert.equal(recordBattleVictory(state, victory).ok, false);
  assert.equal(state.campaignCleared, 0);
  state.sergeants = 40;
  for (const stageId of [0, 81, 1.5, '1', undefined]) {
    assert.equal(recordBattleVictory(state, { ...victory, stageId }).ok, false);
    assert.equal(state.campaignCleared, 0);
  }
});

function savedSession() {
  const values = new Map([[SAVE_KEY, JSON.stringify(army())]]), writes = [], errors = [];
  const storage = {
    fail: false,
    getItem: (key) => values.get(key) ?? null,
    setItem(key, value) {
      if (this.fail) throw new Error('storage quota');
      writes.push(key); values.set(key, value);
    },
  };
  const session = createGameSession({ storage, now: () => T,
    setTimer: () => 1, clearTimer: () => {}, onError: (area) => errors.push(area) });
  session.start();
  return { session, storage, values, writes, errors };
}

test('victory transaction immediately saves progress with a valid prior backup and survives reload', () => {
  const h = savedSession(), victory = win(h.session.state);
  const result = h.session.change((state) => recordBattleVictory(state, victory));
  assert.equal(result.firstClear, true);
  assert.deepEqual(h.writes, [SAVE_KEY + '-backup', SAVE_KEY]);
  const saved = parseSave(h.values.get(SAVE_KEY), T);
  const backup = parseSave(h.values.get(SAVE_KEY + '-backup'), T);
  assert.equal(saved.campaignCleared, 1);
  assert.ok(saved.earnedAchievements.includes('firstVictory'));
  assert.ok(!backup.earnedAchievements.includes('firstVictory'));
  assert.equal(backup.campaignCleared, 0);
  assert.equal(saved.gold, backup.gold + result.gold); // 전리품 골드가 저장에 반영됨
  h.session.pause(); h.session.start();
  assert.equal(h.session.state.campaignCleared, 1);
  h.session.pause();
});

test('failed victory save preserves pending progress and retries without duplicate rewards', () => {
  const h = savedSession(), victory = win(h.session.state);
  h.storage.fail = true;
  h.session.change((state) => recordBattleVictory(state, victory));
  assert.equal(h.session.state.campaignCleared, 1);
  assert.equal(parseSave(h.values.get(SAVE_KEY), T).campaignCleared, 0);
  assert.ok(h.errors.includes('save.write'));
  h.storage.fail = false;
  assert.equal(h.session.flush(), true);
  assert.equal(parseSave(h.values.get(SAVE_KEY), T).campaignCleared, 1);
  const gold = h.session.state.gold;
  const replay = h.session.change((state) => recordBattleVictory(state, victory));
  assert.equal(replay.firstClear, false);
  assert.equal(h.session.state.gold, gold + replay.gold);
  h.session.pause();
});

test('battle loot is income x 30 min on first clear, x 2 min on replay, and respects the gold cap', async () => {
  const { battleGoldReward } = await import('../src/campaign-rewards.js');
  const { MAX_GOLD } = await import('../src/money.js');
  assert.equal(battleGoldReward(10, true), 18000);
  assert.equal(battleGoldReward(10, false), 1200);
  assert.equal(battleGoldReward(10, true, MAX_GOLD - 5n), 5);
  assert.equal(battleGoldReward(Number.MAX_SAFE_INTEGER, true) > BigInt(Number.MAX_SAFE_INTEGER), true);
  const state = army(), first = win(state, 1);
  const r1 = recordBattleVictory(state, first), g1 = state.gold;
  const r2 = recordBattleVictory(state, win(state, 1));
  assert.equal(r2.firstClear, false);
  assert.ok(r1.gold > r2.gold && r2.gold > 0 && state.gold === g1 + r2.gold);
});

test('stars: 1 for any win, 2 for fast OR healthy HQ, 3 for both; they scale only the loot', async () => {
  const { battleStars, battleGoldReward } = await import('../src/campaign-rewards.js');
  const b = (elapsedMs, hp, status = 'victory') => ({ status, elapsedMs, player: { hq: { hp, maxHp: 100 } } });
  assert.equal(battleStars(b(120000, 49)), 1);
  assert.equal(battleStars(b(90000, 49)), 2);
  assert.equal(battleStars(b(120000, 50)), 2);
  assert.equal(battleStars(b(90000, 50)), 3);
  assert.equal(battleStars(b(10000, 100, 'defeat')), 0);
  assert.equal(battleGoldReward(10, true, 0, 1), 18000);
  assert.equal(battleGoldReward(10, true, 0, 2), 22500);
  assert.equal(battleGoldReward(10, true, 0, 3), 27000);
  assert.equal(battleGoldReward(10, false, 0, 3), 1800);
});
