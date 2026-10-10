import { campaignBonusPercent, regionIncomePercent } from "./campaign-rewards.js";
import { STAGES, battleAccess, defaultLoadout, normalizeLoadout, createBattle, advanceBattle, deploy, battleSlots, BATTLE_RULES } from './battle.js';
import { recordBattleVictory } from './battle-progress.js';
import { drawLane, LANE_CENTERS, LANE_CANVAS } from './lane-art.js';
import { unitSprite } from './unit-sprites.js';
import { battlefieldMarkup, battleDetailMarkup } from './battle-markup.js';
import { openDetail } from './detail-popup.js';
import { reportError } from './diagnostics.js';
import { fmt, fmtGold } from './format.js';
import { UNITS } from './units.js';
import { EQUIPMENT } from './equipment.js';
import './battle.css';
import './campaign.css';
import { createCampaignMap } from './campaign-map.js';
import { COUNTRIES } from './campaign.js';
import { ACHIEVEMENTS } from './achievements.js';
import { createBattleAudioEvents } from './battle-audio-events.js';
import { battleNumber } from './battle-format.js';
import { headquartersDestructionTiming, headquartersDestructionFrame } from './weapon-fx.js';

// Owns one dialog and one animation loop; the economic session stays separate.
export function createBattleUI(session, audio = null) {
  const dialog = document.querySelector('#battle-modal');
  const $ = (selector) => dialog.querySelector(selector);
  // 지도 아래 출전 덱: 지역을 바꾸면 그 지역 상성에 맞춘 기본 덱을 다시 고르고, 같은 지역 안에서는 고른 덱을 유지한다.
  function deckFor(id) {
    const state = session.state;
    loadout = normalizeLoadout(state, loadout && loadoutStage === id ? loadout : defaultLoadout(state, id));
    loadoutStage = id;
    return loadout.equipment;
  }
  const campaignMap = createCampaignMap(dialog,()=>session.state,deckFor);
  let mode = 'stages', stageId = 1, loadout = null, loadoutStage = 0, battle = null;
  let raf = 0, lastFrame = 0, paused = false, finalized = false, selected = null, drag = null, suppressClick = false;
  let stagesKey = '';
  let ending = null;
  const audioEvents = createBattleAudioEvents();
  const healedAt = new Map();
  // 연출 상태(저장하지 않음): 기지 피격 번쩍임·흔들림 시각, 이전 체력, 효과음 간격
  let fx = { flash: { player: -1e9, enemy: -1e9 }, shakeAt: -1e9, prevHp: null, accum: { player: 0, enemy: 0 }, lastFloat: { player: 0, enemy: 0 }, lastSound: {} };
  const sound = (kind, gap = 120, gearId = null, side = 'player') => {
    const now = performance.now();
    const key = `${kind}:${gearId ?? ''}:${side}`;
    if (now - (fx.lastSound[key] ?? -1e9) < gap) return;
    fx.lastSound[key] = now; audio?.battle(kind, session.state.sound, gearId, side);
  };
  const haptic = (pattern) => { if (!matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.(pattern); };
  const mapKey = () => `${session.state.campaignCleared}:${armyKey()}:${battleAccess(session.state).unlocked}`;
  const armyKey = () => Object.values(UNITS).map(u => session.state[u.field]).join(':') + '|' +
    Object.keys(EQUIPMENT).map(id => session.state.equipment[id] ? `${session.state.equipment[id].level}/${session.state.equipment[id].count ?? 1}` : '-').join(':');
  const text = (selector, value) => {
    const node = $(selector), next = String(value);
    if (node && node.textContent !== next) node.textContent = next;
  };
  // 카드 그림: 전투 화면과 같은 위에서 본 장비 그림을 카드 칸에 한 번 그린다(캐시된 그림을 복사만 함).
  function paintCardArt() {
    dialog.querySelectorAll('canvas[data-card-art]').forEach(canvas => {
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(unitSprite(canvas.dataset.cardArt, 'player', Number(canvas.dataset.level) || 0), 0, 0, canvas.width, canvas.height);
    });
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; lastFrame = 0; }
  function close() {
    endDrag();
    stop(); ending = null; campaignMap.stop(); battle = null;
    audio?.stop?.();
    if (dialog.open) dialog.close();
  }
  function showStages(countryId = battle?.countryId ?? campaignMap.countryId) {
    endDrag();
    stop(); ending = null; battle = null; mode = 'stages';
    audio?.setMusicScene?.('home');
    stagesKey = mapKey();
    campaignMap.show(countryId);
    audio?.stop?.(); audio?.prepareBattle?.();
    paintCardArt();
    dialog.classList.remove('in-battle');
    dialog.scrollTop = 0;
    sync();
  }
  function quickStart(id) {
    const state = session.state;
    if (!battleAccess(state).unlocked || id > (state.campaignCleared ?? 0) + 1 || !STAGES.some(stage => stage.id === id)) return;
    stageId = id; loadoutStage = id; start();
  }
  function selection() {
    const raw = {equipment: []};
    dialog.querySelectorAll('[data-battle-gear]:checked').forEach(input => raw.equipment.push(input.dataset.battleGear));
    return normalizeLoadout(session.state, raw);
  }
  // 지도에서 시작(체크한 덱) 또는 결과 화면에서 다시/다음(주어진 덱)으로 바로 전투를 시작한다.
  function start(deck = null) {
    endDrag();
    if (!session.active || document.hidden) return;
    loadout = deck ? normalizeLoadout(session.state, { equipment: deck }) : selection();
    if (!loadout.equipment.length) {
      text('#battle-message', '출전할 장비를 하나 이상 선택해 주세요. (최대 ' + battleSlots(session.state) + '칸)'); return;
    }
    try { battle = createBattle(session.state, stageId, loadout); }
    catch (error) {
      reportError('battle.start', error);
      text('#battle-message', '출전 조건이 바뀌었어요. 작전 지도에서 다시 선택해 주세요.'); return;
    }
    audio?.setMusicScene?.('battle');
    stop(); ending = null; campaignMap.stop(); mode = 'battle'; paused = false; finalized = false; selected = null;
    audioEvents.reset(); healedAt.clear();
    audio?.stop?.(); audio?.prepareBattle?.();
    fx = { flash: { player: -1e9, enemy: -1e9 }, shakeAt: -1e9, prevHp: null, accum: { player: 0, enemy: 0 }, lastFloat: { player: 0, enemy: 0 }, lastSound: {} };
    dialog.innerHTML = battlefieldMarkup(battle);
    paintCardArt();
    dialog.classList.add('in-battle'); dialog.scrollTop = 0;
    paint(); sync(); schedule();
    sound('start',0);
  }
  function view() {
    const now = performance.now(), flash = (side) => Math.max(0, 1 - (now - fx.flash[side]) / 380);
    const age=ending?Math.max(0,now-ending.startedAt):0;
    const destruction=ending?headquartersDestructionFrame(ending,age):null;
    return { elapsed: battle.elapsedMs+age, countryId: battle.countryId, player: battle.player, enemy: battle.enemy, fx: battle.fx, destruction, flash: { player: flash('player'), enemy: flash('enemy') }, shake: ending?(destruction&&!ending.reduced?Math.max(0,5*(1-destruction.age/900)):0):Math.max(0, 3 * (1 - (now - fx.shakeAt) / 260)) };
  }
  // 값이 바뀔 때만 글자·버튼 상태를 바꾼다(매 프레임 DOM 재생성 없음).
  // 기지 위에 남은 체력을 막대와 숫자로 보여 준다(값이 바뀔 때만 DOM을 건드림). 25% 이하면 깜빡이며 경고.
  function baseHp(side) {
    const hq = battle[side].hq, frac = Math.max(0, Math.min(1, hq.hp / hq.maxHp));
    text(`#battle-${side}-hp`, battleNumber(hq.hp));
    const fill = $(`#base-hp-${side}-fill`), width = `${(frac * 100).toFixed(1)}%`;
    if (fill && fill.style.width !== width) fill.style.width = width;
    const box = $(`#base-hp-${side}`); if (box) box.classList.toggle('low', frac <= 0.25);
  }
  // 새로 일어난 일에 반응: 기지 피격(번쩍임·흔들림·숫자·진동·소리), 출격·사격·폭발 소리.
  function react() {
    const hp = { player: battle.player.hq.hp, enemy: battle.enemy.hq.hp }, now = performance.now();
    if (fx.prevHp) for (const side of ['player', 'enemy']) {
      const drop = fx.prevHp[side] - hp[side];
      if (drop > 0) {
        fx.flash[side] = now; fx.accum[side] += drop;
        if (side === 'player') { fx.shakeAt = now; sound('hit', 220); haptic(30); }
        if (now - fx.lastFloat[side] > 320) { floatNumber(side, fx.accum[side]); fx.accum[side] = 0; fx.lastFloat[side] = now; }
      }
    }
    fx.prevHp = hp;
    for (const f of audioEvents.take(battle.fx)) {
      if (f.kind === 'death') sound('boom', 160, f.id, f.side);
      else if (f.kind === 'strike') { sound('deploy',100,f.id,f.side); sound('strike',100,f.id,f.side); }
      else if (f.kind === 'shot') { sound('shot', 160, f.id, f.side); sound('impact',320,null,f.side); }
      else if (f.kind === 'spawn') sound('deploy', 100, f.id, f.side);
    }
    // Observe support pulses without changing combat rules or saves.
    const live = new Set();
    for (const unit of battle.player.units) if (unit.kind === 'heal') {
      live.add(unit.uid);
      if (unit.lastShotMs >= 0 && healedAt.get(unit.uid) !== unit.lastShotMs) sound('heal',300,unit.id);
      healedAt.set(unit.uid,unit.lastShotMs);
    }
    for (const id of healedAt.keys()) if (!live.has(id)) healedAt.delete(id);
  }
  // 기지 위로 떠오르는 피해 숫자(가끔만 만들고 애니메이션이 끝나면 지운다)
  function floatNumber(side, amount) {
    const arena = $('#battle-arena'); if (!arena || amount <= 0) return;
    const note = document.createElement('span');
    note.className = `base-float ${side}`; note.textContent = `-${battleNumber(amount)}`;
    note.addEventListener('animationend', () => note.remove(), { once: true });
    arena.append(note);
  }
  function paint() {
    if (!battle || !$('#battle-canvas')) return;
    if(ending&&!ending.impactPlayed&&performance.now()-ending.startedAt>=ending.impactDelayMs){
      ending.impactPlayed=true;sound('collapse',0);haptic(ending.reduced?[]:[60,90,120]);
    }
    drawLane($('#battle-canvas'), view());
    baseHp('player'); baseHp('enemy'); react();
    const seconds = Math.floor(battle.elapsedMs / 1000), mana = Math.floor(battle.mana);
    text('#battle-mana-text', `${mana} / ${BATTLE_RULES.manaMax}`);
    const fill = $('#battle-mana-fill'), width = `${(mana / BATTLE_RULES.manaMax * 100).toFixed(0)}%`;
    if (fill && fill.style.width !== width) fill.style.width = width;
    for (const card of battle.deck) {
      const button = $(`[data-deploy="${card.id}"]`);
      if (!button) continue;
      const wait = Math.max(0, Math.ceil((card.readyMs - battle.elapsedMs) / 1000)), afford = battle.mana >= card.cost;
      text(`[data-deploy-cost="${card.id}"]`, wait ? `${wait}초` : afford ? '출격!' : '마나 부족');
      const ready = wait === 0 && afford && battle.status === 'running' && !paused;
      if (button.disabled === ready) button.disabled = !ready;
      if (!ready && selected === card.id) selected = null;
      const pressed = String(selected === card.id);
      if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed', pressed);
    }
    const lanesOn = !!selected && battle.status === 'running' && !paused;
    dialog.querySelectorAll('[data-lane]').forEach(lane => {
      if (lane.disabled === lanesOn) lane.disabled = !lanesOn;
      lane.classList.toggle('ready', lanesOn);
    });
    text('#battle-time', `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`);
  }
  function schedule() {
    if (!raf && !paused && (battle?.status === 'running'||ending) && session.active && !document.hidden)
      raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    raf = 0;
    if(ending){
      paint();
      if(!session.active||document.hidden||now-ending.startedAt>=ending.durationMs){const done=ending.done;ending=null;done();}
      else schedule();
      return;
    }
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
  // 카드를 고른 뒤 레인을 누르면 출격한다. 카드를 다시 누르면 선택이 풀린다.
  function pickCard(id) {
    if (!session.active || document.hidden || paused || battle?.status !== 'running') return;
    selected = selected === id ? null : id; paint();
  }
  // 상세보기(ⓘ): 설명은 화면에 늘어놓지 않고 이 팝업에서 본다. 전투 중이면 먼저 일시정지한다.
  function showInfo(id = stageId) {
    const stage = STAGES.find(s => s.id === id); if (!stage) return;
    if (mode === 'battle') suspend();
    openDetail(battleDetailMarkup(session.state, stage));
  }
  function sortie(lane) {
    if (!selected || !session.active || document.hidden || paused || battle?.status !== 'running') return;
    const next = deploy(battle, selected, lane);
    if (next === battle) return;
    selected = null; battle = next; haptic(15); paint();
    if (battle.status !== 'running') finish();
  }
  function overlay(title, copy, result) {
    const box = $('#battle-overlay'); box.hidden = false; box.classList.toggle('result', result);
    text('#battle-result-tag', result ? '작전 종료' : '일시정지');
    text('#battle-result-title', title); text('#battle-result-copy', copy);
    $('#battle-resume').hidden = result;
    $('#battle-resume').disabled = !session.active;
    $('#battle-result-actions').hidden = !result;
    $('#battle-pause').disabled = result;
    dialog.querySelectorAll('[data-deploy],[data-lane]').forEach(button => { button.disabled = true; });
  }
  function suspend() {
    if(ending){const done=ending.done;ending=null;stop();done();return;}
    if (battle?.status !== 'running' || !dialog.open) return;
    paused = true; stop();
    audio?.setMusicScene?.(null);
    audio?.stop?.();
    overlay('일시정지', session.active ? '' : '현재 게임 창의 조작 권한을 기다리고 있어요.', false);
    text('#battle-result-stars', ''); text('#battle-result-loot', '');
  }
  function resume() {
    if (!session.active || document.hidden || battle?.status !== 'running') return;
    paused = false; lastFrame = 0;
    audio?.setMusicScene?.('battle');
    $('#battle-overlay').hidden = true;
    schedule();
  }
  // 결과 화면: 제목 · 별 · 전리품 · 짧은 한 줄 · 버튼(다음 지역/다시 도전/작전 지도). 자세한 설명은 길게 쓰지 않는다.
  function finish() {
    if (finalized) return;
    endDrag();
    finalized = true; stop();
    const won = battle.status === 'victory';
    let copy = won ? '' : '장비는 그대로예요. 정비하고 다시 도전하세요.', loot = '', stars = '', canNext = false;
    if (won) {
      // Mark handled first: change() notifies the home UI synchronously.
      const result = session.change(s => recordBattleVictory(s, battle));
      if (result?.ok) {
        stars = '★'.repeat(result.stars) + '☆'.repeat(3 - result.stars) + (result.newBest && !result.firstClear ? ' 신기록!' : '');
        loot = `+${fmtGold(result.gold)} G`;
        const bits = [];
        if (result.firstClear) bits.push(stageId % 80 === 0 ? '대륙 정복 완료!' : stageId % 20 === 0 ? `${COUNTRIES[Math.floor(stageId / 20)-1].name} 점령!` : '지역 점령!', `초당 수입 +${regionIncomePercent(stageId)}%`);
        if (result.achievements?.length) bits.push(`훈장 ${result.achievements.map(id => ACHIEVEMENTS.find(a => a.id === id).title).join(', ')}`);
        if (result.firstClear && stageId % 20 === 0 && stageId < STAGES.length) audio?.ui?.('unlock',session.state.sound);
        copy = bits.join(' · ');
        canNext = stageId < STAGES.length && (session.state.campaignCleared ?? 0) >= stageId;
      } else copy = '클리어 기록을 반영하지 못했어요. 작전 지도에서 확인해 주세요.';
    }
    const reveal=()=>{
    overlay(won ? '승리' : battle.status === 'defeat' ? '패배' : '무승부', copy, true);
    text('#battle-result-stars', stars); text('#battle-result-loot', loot);
    const next = $('[data-battle-next]'); if (next) next.hidden = !canNext;
    if (stars) $('#battle-result-stars').classList.add('pop');
    sound(won ? 'win' : battle.status === 'draw' ? 'draw' : 'lose', 0); haptic(won ? [30, 60, 30, 60, 90] : [120]);
    sync();
    $('#battle-result-title').setAttribute('role','status');
    };
    if(won||battle.status==='defeat'){
      const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      ending={...headquartersDestructionTiming(battle,reduced),startedAt:performance.now(),impactPlayed:false,done:reveal};
      $('#battle-pause').disabled=true;paint();schedule();
    }else reveal();
  }
  function sync() {
    if (!dialog.open) return;
    if (mode === 'stages' && stagesKey !== mapKey()) { showStages(); return; }
    text('[data-battle-session]', session.active ? '' : session.status);
    if (mode === 'stages') {
      const cleared = session.state.campaignCleared ?? 0, access = battleAccess(session.state);
      dialog.querySelectorAll('[data-stage]').forEach(button => { button.disabled = !session.active || !access.unlocked || Number(button.dataset.stage) > cleared + 1; });
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
    const target = event.target.closest('button,[data-country],[data-region],[data-continent]');
    if (suppressClick && target?.dataset?.deploy) { suppressClick = false; return; }
    if (!target || target.disabled || target.getAttribute('aria-disabled')==='true') return;
    if (mode==='stages' && campaignMap.handle(target)) { paintCardArt(); return; }
    if (target.hasAttribute('data-battle-close')) close();
    else if (target.hasAttribute('data-stage')) quickStart(Number(target.dataset.stage));
    else if (target.hasAttribute('data-battle-back')) showStages();
    else if (target.hasAttribute('data-battle-retry')) start(loadout.equipment);
    else if (target.hasAttribute('data-battle-next')) { stageId += 1; loadoutStage = stageId; start(deckFor(stageId)); }
    else if (target.hasAttribute('data-battle-info')) showInfo(Number(target.dataset.infoStage) || stageId);
    else if (target.id === 'battle-start') start();
    else if (target.dataset.deploy) pickCard(target.dataset.deploy);
    else if (target.dataset.lane !== undefined) sortie(Number(target.dataset.lane));
    else if (target.id === 'battle-pause') suspend();
    else if (target.id === 'battle-resume') resume();
  });
  // 출전 칸 수를 넘겨 체크하면 방금 체크한 장비를 되돌리고 안내한다.
  dialog.addEventListener('change', event => {
    if (mode !== 'stages' || !event.target.matches('[data-battle-gear]')) return;
    const limit = battleSlots(session.state);
    if (dialog.querySelectorAll('[data-battle-gear]:checked').length > limit) {
      event.target.checked = false;
      text('#battle-message', `출전 장비는 최대 ${limit}칸까지예요. 다른 장비를 먼저 해제하세요.`);
    } else text('#battle-message', '');
    text('#battle-slot-count', `${dialog.querySelectorAll('[data-battle-gear]:checked').length} / ${limit}`);
    const shown = Number($('[data-stage]')?.dataset.stage);
    if (shown) { loadout = selection(); loadoutStage = shown; }   // 지도에서 고른 덱을 기억(같은 지역을 다시 열어도 유지)
  });
  // 카드를 끌어 레인에 놓기(클래시 로얄 방식). 거의 안 움직이면 '카드 선택 → 레인 터치'로 동작한다.
  function laneAt(event) {
    const arena = $('#battle-arena'); if (!arena) return null;
    const box = arena.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) return null;
    const x = (event.clientX - box.left) / box.width * LANE_CANVAS.width;
    let lane = 0;
    LANE_CENTERS.forEach((center, i) => { if (Math.abs(x - center) < Math.abs(x - LANE_CENTERS[lane])) lane = i; });
    return lane;
  }
  function markLane(lane) {
    dialog.querySelectorAll('[data-lane]').forEach(button => button.classList.toggle('over', Number(button.dataset.lane) === lane));
  }
  function endDrag() {
    drag?.ghost?.remove(); markLane(null); drag = null;
  }
  dialog.addEventListener('pointerdown', event => {
    const card = event.target.closest?.('[data-deploy]');
    if (mode !== 'battle' || !card || card.disabled || event.button > 0) return;
    endDrag();
    drag = { id: card.dataset.deploy, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false, ghost: null, card };
    try { card.setPointerCapture(event.pointerId); } catch (error) { reportError('battle.dragCapture', error); }
  });
  dialog.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.moved) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 10) return;
      drag.moved = true; selected = drag.id; paint();
      const ghost = document.createElement('div'); ghost.className = 'drag-ghost';
      const art = drag.card.querySelector('canvas'), copy = document.createElement('canvas');
      copy.width = art.width; copy.height = art.height; copy.getContext('2d').drawImage(art, 0, 0);
      ghost.append(copy); dialog.append(ghost); drag.ghost = ghost;
    }
    drag.ghost.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -60%)`;
    markLane(laneAt(event));
  });
  dialog.addEventListener('pointerup', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const wasDrag = drag.moved, lane = wasDrag ? laneAt(event) : null;
    endDrag();
    if (!wasDrag) return;
    suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
    if (lane === null) { selected = null; paint(); } else sortie(lane);
  });
  dialog.addEventListener('pointercancel', event => { if (drag && event.pointerId === drag.pointerId) { endDrag(); selected = null; if (battle) paint(); } });
  dialog.addEventListener('keydown', event => {
    const target=event.target.closest('g[data-country],g[data-region]');
    if(target && ['Enter',' '].includes(event.key)){event.preventDefault();campaignMap.handle(target);}
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', () => { stop(); ending=null; campaignMap.stop(); battle = null; audio?.stop?.(); audio?.setMusicScene?.('home'); document.querySelector('#open-battle')?.focus(); });
  return {open, sync, suspend};
}
