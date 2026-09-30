import { STAGES, battleAccess, defaultLoadout, normalizeLoadout, createBattle, advanceBattle, fireVolley } from './battle.js';
import { recordBattleVictory } from './battle-progress.js';
import { drawBattle } from './battle-art.js';
import { stagesMarkup, preparationMarkup, battlefieldMarkup } from './battle-markup.js';
import { reportError } from './diagnostics.js';
import { fmt } from './format.js';
import { UNITS } from './units.js';
import { EQUIPMENT } from './equipment.js';
import './battle.css';

// Owns one dialog and one animation loop; the economic session stays separate.
export function createBattleUI(session) {
  const dialog = document.querySelector('#battle-modal');
  const $ = (selector) => dialog.querySelector(selector);
  let mode = 'stages', stageId = 1, loadout = null, battle = null;
  let raf = 0, lastFrame = 0, paused = false, finalized = false;
  let stagesKey = '', preparationKey = '';
  const mapKey = () => `${session.state.battleCleared}:${battleAccess(session.state).unlocked}`;
  const armyKey = () => Object.values(UNITS).map(u => session.state[u.field]).join(':') + '|' +
    Object.keys(EQUIPMENT).map(id => session.state.equipment[id] ? `${session.state.equipment[id].level}/${session.state.equipment[id].count ?? 1}` : '-').join(':');
  const text = (selector, value) => {
    const node = $(selector), next = String(value);
    if (node && node.textContent !== next) node.textContent = next;
  };
  function stop() { cancelAnimationFrame(raf); raf = 0; lastFrame = 0; }
  function close() {
    stop(); battle = null;
    if (dialog.open) dialog.close();
  }
  function showStages() {
    stop(); battle = null; mode = 'stages';
    stagesKey = mapKey();
    dialog.innerHTML = stagesMarkup(session.state);
    dialog.classList.remove('in-battle');
    dialog.scrollTop = 0;
    sync();
  }
  function prepare(id = stageId) {
    const state = session.state;
    if (!battleAccess(state).unlocked || id > (state.battleCleared ?? 0) + 1) return;
    const stage = STAGES.find(s => s.id === id);
    if (!stage) return;
    stop(); battle = null; stageId = id; mode = 'prepare';
    preparationKey = armyKey();
    loadout = normalizeLoadout(state, loadout ?? defaultLoadout(state));
    dialog.innerHTML = preparationMarkup(state, stage, loadout);
    dialog.classList.remove('in-battle');
    dialog.scrollTop = 0;
    sync();
  }
  function selection() {
    const raw = {units: {}, equipment: []};
    dialog.querySelectorAll('[data-battle-unit]').forEach(input => {
      raw.units[input.dataset.battleUnit] = Number(input.value);
    });
    dialog.querySelectorAll('[data-battle-gear]:checked').forEach(input => raw.equipment.push(input.dataset.battleGear));
    return normalizeLoadout(session.state, raw);
  }
  function start() {
    if (!session.active || document.hidden) return;
    loadout = selection();
    if (!Object.values(loadout.units).some(n => n > 0) && !loadout.equipment.length) {
      text('#battle-message', '병력이나 장비를 하나 이상 선택해 주세요.'); return;
    }
    try { battle = createBattle(session.state, stageId, loadout); }
    catch (error) {
      reportError('battle.start', error);
      text('#battle-message', '출전 조건이 바뀌었어요. 작전 지도로 돌아가 다시 준비해 주세요.'); return;
    }
    stop(); mode = 'battle'; paused = false; finalized = false;
    dialog.innerHTML = battlefieldMarkup(battle);
    dialog.classList.add('in-battle'); dialog.scrollTop = 0;
    paint(); sync(); schedule();
    $('#battle-field').focus({preventScroll:true});
  }
  function view() {
    const effects = [], sides = {};
    for (const side of ['player', 'enemy']) {
      const army = battle[side];
      sides[side] = { hq: army.hq, troops: Object.fromEntries(army.units.map(u => [u.id,u.count])), equipment: army.equipment };
      for (const gun of [...army.units, ...army.equipment])
        if (gun.lastShotMs >= 0) effects.push({at:gun.lastShotMs, side, kind:gun.id});
    }
    return {elapsed:battle.elapsedMs, sides, effects};
  }
  function paint() {
    if (!battle || !$('#battle-canvas')) return;
    drawBattle($('#battle-canvas'), view());
    text('#battle-player-hp', `${fmt(Math.ceil(battle.player.hq.hp))} / ${fmt(battle.player.hq.maxHp)}`);
    text('#battle-enemy-hp', `${fmt(Math.ceil(battle.enemy.hq.hp))} / ${fmt(battle.enemy.hq.maxHp)}`);
    const seconds = Math.floor(battle.elapsedMs / 1000);
    text('#battle-time', `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`);
  }
  function schedule() {
    if (!raf && !paused && battle?.status === 'running' && session.active && !document.hidden)
      raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    raf = 0;
    if (!session.active || document.hidden) { suspend(); return; }
    if (paused || battle?.status !== 'running') return;
    if (!lastFrame) lastFrame = now;
    if (now-lastFrame >= 1000/30) {
      battle = advanceBattle(battle, now-lastFrame); lastFrame = now;
      paint();
      if (battle.status !== 'running') { finish(); return; }
    }
    schedule();
  }
  function shoot() {
    if (!session.active || document.hidden || paused || battle?.status !== 'running') return;
    battle = fireVolley(battle);
    paint();
    if (battle.status !== 'running') finish();
  }
  function overlay(title, copy, result) {
    $('#battle-overlay').hidden = false;
    text('#battle-result-tag', result ? '작전 종료' : '작전 대기');
    text('#battle-result-title', title); text('#battle-result-copy', copy);
    $('#battle-resume').hidden = result;
    $('#battle-resume').disabled = !session.active;
    $('#battle-result-actions').hidden = !result;
    $('#battle-pause').disabled = result;
    $('#battle-field').disabled = true;
  }
  function suspend() {
    if (battle?.status !== 'running' || !dialog.open) return;
    paused = true; stop();
    overlay('일시정지', session.active ? '준비되면 전투를 계속하세요.' : '현재 게임 창의 조작 권한을 기다리고 있어요.', false);
  }
  function resume() {
    if (!session.active || document.hidden || battle?.status !== 'running') return;
    paused = false; lastFrame = 0;
    $('#battle-overlay').hidden = true;
    $('#battle-field').disabled = false;
    schedule();
  }
  function finish() {
    if (finalized) return;
    finalized = true; stop();
    let copy = '병력과 장비는 그대로 유지됩니다. 보상은 아직 없습니다.';
    if (battle.status === 'victory') {
      // Mark handled first: change() notifies the home UI synchronously.
      const result = session.change(s => recordBattleVictory(s, battle));
      copy = result?.ok ? (stageId === STAGES.length ? '모든 작전을 클리어했어요! 보상은 아직 없습니다.' : '다음 작전이 열렸어요. 보상은 아직 없습니다.') : '클리어 기록을 반영하지 못했어요. 작전 지도에서 확인해 주세요.';
    }
    overlay(battle.status === 'victory' ? '승리' : battle.status === 'defeat' ? '패배' : '무승부', copy, true);
    sync();
    $('#battle-result-title').setAttribute('role','status');
  }
  function sync() {
    if (!dialog.open) return;
    if (mode === 'stages' && stagesKey !== mapKey()) { showStages(); return; }
    if (mode === 'prepare' && preparationKey !== armyKey()) {
      loadout = selection(); prepare(); return;
    }
    text('[data-battle-session]', session.status);
    if (mode === 'prepare' && $('#battle-start')) $('#battle-start').disabled = !session.active;
    if (mode === 'stages') {
      const cleared = session.state.battleCleared ?? 0, access = battleAccess(session.state);
      dialog.querySelectorAll('[data-stage]').forEach(button => { button.disabled = !access.unlocked || Number(button.dataset.stage) > cleared + 1; });
    }
    if (mode === 'battle') {
      if (!session.active) suspend();
      if ($('#battle-resume')) $('#battle-resume').disabled = !session.active;
    }
  }
  function open() {
    if (!battleAccess(session.state).visible) return;
    showStages(); dialog.showModal(); sync();
  }
  dialog.addEventListener('click', event => {
    const target = event.target.closest('button');
    if (!target || target.disabled) return;
    if (target.hasAttribute('data-battle-close')) close();
    else if (target.hasAttribute('data-stage')) prepare(Number(target.dataset.stage));
    else if (target.hasAttribute('data-battle-back')) showStages();
    else if (target.hasAttribute('data-battle-retry')) prepare();
    else if (target.id === 'battle-start') start();
    else if (target.id === 'battle-field') shoot();
    else if (target.id === 'battle-pause') suspend();
    else if (target.id === 'battle-resume') resume();
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', () => { stop(); battle = null; document.querySelector('#open-battle')?.focus(); });
  return {open, sync, suspend};
}
