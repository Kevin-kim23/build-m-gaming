import { campaignBonusPercent, REGION_INCOME_PERCENT } from "./campaign-rewards.js";
import { STAGES, battleAccess, defaultLoadout, normalizeLoadout, createBattle, advanceBattle, useSpecial, battleSlots } from './battle.js';
import { recordBattleVictory } from './battle-progress.js';
import { drawBattle } from './battle-art.js';
import { preparationMarkup, battlefieldMarkup } from './battle-markup.js';
import { reportError } from './diagnostics.js';
import { fmt, fmtGold } from './format.js';
import { UNITS } from './units.js';
import { EQUIPMENT } from './equipment.js';
import './battle.css';
import './campaign.css';
import { createCampaignMap } from './campaign-map.js';
import { COUNTRIES } from './campaign.js';
import { ACHIEVEMENTS } from './achievements.js';

// Owns one dialog and one animation loop; the economic session stays separate.
export function createBattleUI(session) {
  const dialog = document.querySelector('#battle-modal');
  const $ = (selector) => dialog.querySelector(selector);
  const campaignMap = createCampaignMap(dialog,()=>session.state);
  let mode = 'stages', stageId = 1, loadout = null, battle = null;
  let raf = 0, lastFrame = 0, paused = false, finalized = false;
  let stagesKey = '', preparationKey = '';
  const mapKey = () => `${session.state.campaignCleared}:${armyKey()}:${battleAccess(session.state).unlocked}`;
  const armyKey = () => Object.values(UNITS).map(u => session.state[u.field]).join(':') + '|' +
    Object.keys(EQUIPMENT).map(id => session.state.equipment[id] ? `${session.state.equipment[id].level}/${session.state.equipment[id].count ?? 1}` : '-').join(':');
  const text = (selector, value) => {
    const node = $(selector), next = String(value);
    if (node && node.textContent !== next) node.textContent = next;
  };
  function stop() { cancelAnimationFrame(raf); raf = 0; lastFrame = 0; }
  function close() {
    stop(); campaignMap.stop(); battle = null;
    if (dialog.open) dialog.close();
  }
  function showStages(countryId = campaignMap.countryId) {
    stop(); battle = null; mode = 'stages';
    stagesKey = mapKey();
    campaignMap.show(countryId);
    dialog.classList.remove('in-battle');
    dialog.scrollTop = 0;
    sync();
  }
  function prepare(id = stageId) {
    const state = session.state;
    if (!battleAccess(state).unlocked || id > (state.campaignCleared ?? 0) + 1) return;
    const stage = STAGES.find(s => s.id === id);
    if (!stage) return;
    stop(); campaignMap.stop(); battle = null; stageId = id; mode = 'prepare';
    dialog.classList.remove('in-campaign');
    preparationKey = armyKey();
    loadout = normalizeLoadout(state, loadout ?? defaultLoadout(state));
    dialog.innerHTML = preparationMarkup(state, stage, loadout);
    dialog.classList.remove('in-battle');
    dialog.scrollTop = 0;
    sync();
  }
  function selection() {
    const raw = {equipment: []};
    dialog.querySelectorAll('[data-battle-gear]:checked').forEach(input => raw.equipment.push(input.dataset.battleGear));
    return normalizeLoadout(session.state, raw);
  }
  function start() {
    if (!session.active || document.hidden) return;
    loadout = selection();
    if (!loadout.equipment.length) {
      text('#battle-message', '출전할 장비를 하나 이상 선택해 주세요. (최대 ' + battleSlots(session.state) + '칸)'); return;
    }
    try { battle = createBattle(session.state, stageId, loadout); }
    catch (error) {
      reportError('battle.start', error);
      text('#battle-message', '출전 조건이 바뀌었어요. 작전 지도로 돌아가 다시 준비해 주세요.'); return;
    }
    stop(); campaignMap.stop(); mode = 'battle'; paused = false; finalized = false;
    dialog.innerHTML = battlefieldMarkup(battle);
    dialog.classList.add('in-battle'); dialog.scrollTop = 0;
    paint(); sync(); schedule();
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
    for (const gun of battle.player.equipment) {
      const wait = Math.max(0, Math.ceil((gun.specialReadyMs - battle.elapsedMs) / 1000)), button = $(`[data-special="${gun.id}"]`);
      if (!button) continue;
      text(`[data-special-state="${gun.id}"]`, wait ? `${wait}초` : '발사!');
      const ready = wait === 0 && battle.status === 'running' && !paused;
      if (button.disabled === ready) button.disabled = !ready;
    }
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
  // 필살기 연출: 적 본부 위 피해 숫자(또는 회복 숫자)와 화면 흔들림. 클릭 때만 만들고 애니메이션이 끝나면 지운다.
  function specialEffect(gun, damage, healed) {
    const arena = $('#battle-arena'); if (!arena) return;
    const note = document.createElement('span');
    note.className = 'battle-float' + (damage > 0 ? '' : ' heal');
    note.textContent = damage > 0 ? `-${fmt(Math.round(damage))}` : `+${fmt(Math.round(healed))}`;
    note.style.left = `${35 + Math.random() * 30}%`;
    note.addEventListener('animationend', () => note.remove(), { once: true });
    arena.append(note);
    if (damage > 0) { arena.classList.remove('shake'); void arena.offsetWidth; arena.classList.add('shake'); }
  }
  function special(id) {
    if (!session.active || document.hidden || paused || battle?.status !== 'running') return;
    const before = battle, gun = before.player.equipment.find(g => g.id === id);
    battle = useSpecial(battle, id);
    if (battle !== before) specialEffect(gun, before.enemy.hq.hp - battle.enemy.hq.hp, battle.player.hq.hp - before.player.hq.hp);
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
    dialog.querySelectorAll('[data-special]').forEach(button => { button.disabled = true; });
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
    schedule();
  }
  function finish() {
    if (finalized) return;
    finalized = true; stop();
    let copy = '병력과 장비는 그대로 유지됩니다. 부대를 정비하고 다시 도전하세요.';
    if (battle.status === 'victory') {
      // Mark handled first: change() notifies the home UI synchronously.
      const result = session.change(s => recordBattleVictory(s, battle));
      copy = result?.ok ? (stageId === STAGES.length ? '아스테라 대륙의 모든 국가를 점령했어요!' : stageId % 20 === 0 ? `${COUNTRIES[Math.floor(stageId / 20)-1].name} 점령 완료! 다음 국가가 열렸어요.` : '지역 점령 완료! 다음 지역으로 진격할 수 있어요.') : '클리어 기록을 반영하지 못했어요. 작전 지도에서 확인해 주세요.';
      if (result?.ok) copy += result.firstClear ? ` 초당 수입 +${REGION_INCOME_PERCENT}% 획득! 누적 점령 보너스 +${campaignBonusPercent(session.state)}%.` : ` 재도전 보너스는 없으며 초당 수입 +${campaignBonusPercent(session.state)}%를 유지합니다.`;
      if (result?.ok) text('#battle-result-stars', '★'.repeat(result.stars) + '☆'.repeat(3 - result.stars) + (result.stars === 3 ? ' 완벽한 승리' : result.stars === 2 ? ' 훌륭한 승리' : ' 승리'));
      if (result?.ok) copy += ` 전리품 ${fmtGold(result.gold)} 골드를 받았어요!${result.stars < 3 ? ' (별 3개: 90초 안에, 본부 체력 50% 이상으로 승리하면 전리품 +50%)' : ''}`;
      if (result?.achievements?.length) copy += ` 훈장 획득: ${result.achievements.map(id => ACHIEVEMENTS.find(a => a.id === id).title).join(', ')}. 홈 도전과제에서 확인하세요.`;
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
      const cleared = session.state.campaignCleared ?? 0, access = battleAccess(session.state);
      dialog.querySelectorAll('[data-stage]').forEach(button => { button.disabled = !access.unlocked || Number(button.dataset.stage) > cleared + 1; });
    }
    if (mode === 'battle') {
      if (!session.active) suspend();
      if ($('#battle-resume')) $('#battle-resume').disabled = !session.active;
    }
  }
  function open() {
    if (!battleAccess(session.state).visible) return;
    dialog.classList.add('in-campaign'); dialog.showModal(); showStages(null); sync();
  }
  dialog.addEventListener('click', event => {
    const target = event.target.closest('button,[data-country],[data-region]');
    if (!target || target.disabled || target.getAttribute('aria-disabled')==='true') return;
    if (mode==='stages' && campaignMap.handle(target)) return;
    if (target.hasAttribute('data-battle-close')) close();
    else if (target.hasAttribute('data-stage')) prepare(Number(target.dataset.stage));
    else if (target.hasAttribute('data-battle-back')) showStages();
    else if (target.hasAttribute('data-battle-retry')) prepare();
    else if (target.id === 'battle-start') start();
    else if (target.dataset.special) special(target.dataset.special);
    else if (target.id === 'battle-pause') suspend();
    else if (target.id === 'battle-resume') resume();
  });
  // 출전 칸 수를 넘겨 체크하면 방금 체크한 장비를 되돌리고 안내한다.
  dialog.addEventListener('change', event => {
    if (mode !== 'prepare' || !event.target.matches('[data-battle-gear]')) return;
    const limit = battleSlots(session.state);
    if (dialog.querySelectorAll('[data-battle-gear]:checked').length > limit) {
      event.target.checked = false;
      text('#battle-message', `출전 장비는 최대 ${limit}칸까지예요. 다른 장비를 먼저 해제하세요.`);
    } else text('#battle-message', '');
  });
  dialog.addEventListener('keydown', event => {
    const target=event.target.closest('g[data-country],g[data-region]');
    if(target && ['Enter',' '].includes(event.key)){event.preventDefault();campaignMap.handle(target);}
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', () => { stop(); campaignMap.stop(); battle = null; document.querySelector('#open-battle')?.focus(); });
  return {open, sync, suspend};
}
