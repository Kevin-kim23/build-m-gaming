import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState, parseSave, SAVE_KEY } from '../src/game.js';
import { FIELD_ARMY_SIZE } from '../src/formations.js';
import { createBattle, fireVolley } from '../src/battle.js';
import { recordBattleVictory } from '../src/battle-progress.js';
import { createGameSession } from '../src/session.js';

const T = 1800000000000;
const army = () => ({ ...freshState(T), soldiers: FIELD_ARMY_SIZE - 600,
  sergeants: 40, staffSergeants: 10, gold: 1234567, taps: 123 });
function win(state, stage = 1) {
  const battle = fireVolley(createBattle(state, stage));
  assert.equal(battle.status, 'victory');
  return battle;
}

test('a real victory records only stage progress without granting rewards or consuming troops', () => {
  const state = army(), before = structuredClone(state), battle = win(state);
  assert.deepEqual(recordBattleVictory(state, battle), { ok: true, firstClear: true });
  assert.deepEqual(state, { ...before, battleCleared: 1 });
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
    assert.equal(state.battleCleared, 0);
  }
});

test('replayed victories are idempotent and stage progress cannot skip ahead or move backwards', () => {
  const state = army(), first = win(state);
  assert.equal(recordBattleVictory(state, { ...first, stageId: 3 }).reason, 'sequence');
  assert.equal(state.battleCleared, 0);
  recordBattleVictory(state, first);
  assert.deepEqual(recordBattleVictory(state, first), { ok: true, firstClear: false });
  recordBattleVictory(state, win(state, 2));
  assert.equal(state.battleCleared, 2);
  assert.deepEqual(recordBattleVictory(state, first), { ok: true, firstClear: false });
  assert.equal(state.battleCleared, 2);
});

test('recording a victory rechecks the actual rank gate and known stage identity', () => {
  const state = army(), victory = win(state);
  state.sergeants = 39;
  assert.equal(recordBattleVictory(state, victory).ok, false);
  assert.equal(state.battleCleared, 0);
  state.sergeants = 40;
  for (const stageId of [0, 11, 1.5, '1', undefined]) {
    assert.equal(recordBattleVictory(state, { ...victory, stageId }).ok, false);
    assert.equal(state.battleCleared, 0);
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
  assert.equal(saved.battleCleared, 1);
  assert.equal(backup.battleCleared, 0);
  assert.equal(saved.gold, backup.gold);
  h.session.pause(); h.session.start();
  assert.equal(h.session.state.battleCleared, 1);
  h.session.pause();
});

test('failed victory save preserves pending progress and retries without duplicate rewards', () => {
  const h = savedSession(), victory = win(h.session.state);
  h.storage.fail = true;
  h.session.change((state) => recordBattleVictory(state, victory));
  assert.equal(h.session.state.battleCleared, 1);
  assert.equal(parseSave(h.values.get(SAVE_KEY), T).battleCleared, 0);
  assert.ok(h.errors.includes('save.write'));
  h.storage.fail = false;
  assert.equal(h.session.flush(), true);
  assert.equal(parseSave(h.values.get(SAVE_KEY), T).battleCleared, 1);
  const gold = h.session.state.gold;
  assert.equal(h.session.change((state) => recordBattleVictory(state, victory)).firstClear, false);
  assert.equal(h.session.state.gold, gold);
  h.session.pause();
});
