// 무한 방어전 화면 조종: 대화상자 하나와 애니메이션 루프 하나. 규칙 계산은 defense-run/combat에 맡긴다.
// 매 프레임에는 캔버스와 바뀐 숫자·버튼 상태만 고치고, HTML 교체는 열거나 누를 때·웨이브가 바뀔 때만 한다.
import { createRun, build, upgrade, chooseTrait, sell, move, upgradeBase, buildBay, upgradeBay, callEarly, openCards, pickCard, reroll, evolve, startRun } from './defense-run.js';
import { step, useIcbm } from './defense-combat.js';
import { zoneFor } from './defense-waves.js';
import { MAP, LINES } from './defense-data.js';
import { upgradeCostTo, nextChoiceLevel } from './defense-economy.js';
import { defenseMarkup, towerBubbleMarkup, bubblePlace, basePanelMarkup, cardsMarkup, hudValues, hitTest, fieldFit, padAction, nextWave, TRAY_HEIGHT } from './defense-markup.js';
import { lobbyMarkup, resultMarkup } from './defense-lobby.js';
import { recordDefenseRun, awaken, awakenBonus, defenseUnlocked, defenseOf } from './defense-progress.js';
import { drawDefense, paintGearIcon, paintEnemyIcon } from './defense-art.js';
import { bindDefenseInput, fieldPoint } from './defense-input.js';
import { createDefenseFeedback } from './defense-feedback.js';
import { COACH_KEY, COACH_STEPS } from './defense-coach.js';
import { RANKS, RANK_DEFINITIONS, rankForArmy } from './ranks.js';
import { supremeRankBadge } from './rank-emblem.js';
import { insignia } from './home-view.js';
import { reportError } from './diagnostics.js';
import './defense.css';


// 계급 별: 부사령관부터는 원수 계열 별(테두리 없이), 그 아래는 홈 계급장 그대로.
function rankStar(index) {
  const marks = RANK_DEFINITIONS[index]?.marks;
  try { return marks >= 5 ? supremeRankBadge(marks) : insignia(index); }
  catch (error) { reportError('defense.rankStar', error); return insignia(index); }
}
function coachDone() { try { return localStorage.getItem(COACH_KEY) === '1'; } catch (error) { reportError('defense.coachRead', error); return false; } }
function setCoachDone() { try { localStorage.setItem(COACH_KEY, '1'); } catch (error) { reportError('defense.coachSave', error); } }

export function createDefenseUI(session, { notify = () => {}, audio = null } = {}) {
  const dialog = document.querySelector('#defense-modal');
  let run = null, raf = 0, last = 0, speed = 1, selected = null, canvas = null, field = null;
  let mode = null, armed = null, ghost = null, endArmedUntil = 0, coach = -1, nextKey = '';
  const cache = {}, feedback = createDefenseFeedback(() => session.state.sound, audio);

  const rankName = () => RANKS[rankForArmy(session.state)];
  const $ = selector => dialog.querySelector(selector);
  function showLobby() {
    cancelAnimationFrame(raf); raf = 0; run = null; canvas = null; field = null;
    dialog.innerHTML = `<div class="defense-frame lobby">${lobbyMarkup(session.state, rankName())}</div>`;
  }
  function start() {
    const name = rankName();
    run = createRun({ rank: name, seed: Date.now() & 0x7fffffff, awaken: awakenBonus(session.state), manualStart: true });
    selected = null; mode = null; armed = null; ghost = null; endArmedUntil = 0; nextKey = '';
    Object.keys(cache).forEach(k => delete cache[k]); feedback.reset();
    coach = coachDone() ? -1 : 0;
    dialog.innerHTML = defenseMarkup({ rankName: name, starSvg: rankStar(RANKS.indexOf(name)) });
    canvas = $('[data-defense-canvas]'); field = $('[data-defense-field]');
    dialog.querySelectorAll('canvas[data-gear-sprite]').forEach(c => paintGearIcon(c, c.dataset.gearSprite));
    resize(); syncCoach();
  }
  function resize() {
    if (!field) return;
    const box = dialog.getBoundingClientRect(), fit = fieldFit(box.width, box.height - TRAY_HEIGHT);
    field.style.width = `${fit.width}px`; field.style.height = `${fit.height}px`;
    const dpr = Math.min(3, globalThis.devicePixelRatio || 1);
    canvas.width = Math.round(MAP.width * fit.scale * dpr); canvas.height = Math.round(MAP.height * fit.scale * dpr);
    canvas.style.width = `${fit.width}px`; canvas.style.height = `${fit.height}px`;
    render();
  }

  function open() {
    if (!defenseUnlocked(session.state)) { notify('무한 방어전은 부사령관부터 열려요'); return; }
    if (!dialog.open) dialog.showModal();
    showLobby();
  }
  function close() { cancelAnimationFrame(raf); raf = 0; run = null; if (dialog.open) dialog.close(); }
  function suspend() { cancelAnimationFrame(raf); raf = 0; last = 0; }
  function loop() {
    cancelAnimationFrame(raf); last = 0;
    const frame = now => {
      if (!run || !dialog.open) { raf = 0; return; }
      const dt = last ? Math.min(0.25, (now - last) / 1000) : 0; last = now;
      try {
        step(run, dt * speed);
        feedback.drain(run, now);
        render();
        if (run.phase === 'over') { feedback.sound('lose'); finish(); return; }
      } catch (error) { reportError('defense.frame', error); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }

  function setText(key, value, apply) {
    if (cache[key] === value) return;
    cache[key] = value; apply(value);
  }
  function render() {
    if (!run || !canvas) return;
    drawDefense(canvas, run, zoneFor(Math.max(1, run.wave)).theme, { selected, armed, ghost, aim: mode === 'aim', floats: feedback.floats, now: performance.now() });
    for (const [k, v] of Object.entries(hudValues(run))) setText(`d:${k}`, v, value => {
      const node = $(`[data-d="${k}"]`);
      if (!node) return;
      if (k === 'supplybar' || k === 'bossbar') node.style.width = value; else node.textContent = value;
    });
    setText('early', run.phase !== 'gap', hidden => { $('[data-defense-early]').hidden = hidden; });
    setText('go', run.phase !== 'ready', hidden => { $('[data-defense-go]').hidden = hidden; });
    setText('cards', run.storedCards < 1 || run.phase === 'ready', off => { $('[data-defense-cards]').disabled = off; });
    setText('evo', run.evoTickets < 1, hidden => { $('[data-defense-evo]').hidden = hidden; });
    setText('icbm', !run.skills.icbm, hidden => { $('[data-defense-icbm]').hidden = hidden; });
    setText('boss', !cache['d:bossname'], hidden => { $('[data-defense-boss]').hidden = hidden; });
    setText('banner', !run.banner || run.time > run.banner.until, hidden => { $('[data-defense-banner]').hidden = hidden; });
    setText('end', performance.now() < endArmedUntil, on => { const b = $('[data-defense-close]'); b.textContent = on ? '한 번 더 → 끝내기' : '✕'; b.classList.toggle('armed', on); });
    run.pads.forEach((t, i) => {
      setText(`lv${i}`, t ? `Lv${t.level}` : '', text => { const node = $(`[data-pad-lv="${i}"]`); node.textContent = text; node.hidden = !text; });
      const a = padAction(run, i);
      setText(`act${i}`, a ? `${a.kind}|${a.label}|${a.disabled ? 1 : 0}` : '', () => {
        const b = $(`[data-pad-act="${i}"]`);
        b.hidden = !a; if (!a) return;
        b.textContent = a.label; b.dataset.kind = a.kind; b.disabled = !!a.disabled; b.className = `defense-pad-act ${a.kind}`;
      });
    });
    for (const id of Object.keys(run.bays)) setText(`bay${id}`, run.bays[id] ? `Lv${run.bays[id].level}` : '', text => { const node = $(`[data-bay-lv="${id}"]`); node.textContent = text; node.hidden = !text; });
    dialog.querySelectorAll('[data-tray-line]').forEach(b => setText(`tray${b.dataset.trayLine}`, `${run.supply < Number(b.dataset.cost)}|${armed === b.dataset.trayLine}`, () => {
      b.classList.toggle('poor', run.supply < Number(b.dataset.cost)); b.classList.toggle('armed', armed === b.dataset.trayLine);
    }));
    dialog.querySelectorAll('[data-defense-bubble] [data-cost], [data-defense-panel] [data-cost]').forEach(b => { const off = run.supply < Number(b.dataset.cost); if (b.disabled !== off) b.disabled = off; });
    const key = `${run.wave}:${run.phase === 'wave'}`;
    if (key !== nextKey) { nextKey = key; paintNext(); }
  }
  // 다음 웨이브 미리보기 아이콘(웨이브가 바뀔 때만).
  function paintNext() {
    const box = $('[data-next-icons]');
    box.innerHTML = run.phase === 'wave' ? '' : nextWave(run).map(e => `<span title="${e.name}"><canvas data-enemy="${e.type}"></canvas>${e.count}</span>`).join('');
    box.querySelectorAll('canvas[data-enemy]').forEach(c => paintEnemyIcon(c, run.wave + 1, c.dataset.enemy));
  }

  function syncCoach() {
    const node = $('[data-defense-coach]');
    if (!node) return;
    node.hidden = coach < 0; node.textContent = coach >= 0 ? COACH_STEPS[coach] : '';
    node.dataset.step = coach;
  }
  function advanceCoach(stepDone) {
    if (coach !== stepDone) return;
    coach += 1;
    if (coach >= COACH_STEPS.length) { coach = -1; setCoachDone(); }
    syncCoach();
  }
  function hint(text) { const node = $('[data-defense-hint]'); node.textContent = text ?? ''; node.hidden = !text; }
  function showHand() {
    const box = $('[data-defense-hand]');
    if (!run.hand) { box.hidden = true; return; }
    box.innerHTML = cardsMarkup(run); box.hidden = false;
  }
  function closePopups() {
    $('[data-defense-bubble]').hidden = true; $('[data-defense-panel]').hidden = true; selected = null;
  }
  function showBubble(pad) {
    const box = $('[data-defense-bubble]'), place = bubblePlace(pad);
    $('[data-defense-panel]').hidden = true;
    selected = { pad }; box.innerHTML = towerBubbleMarkup(run, pad);
    box.style.left = place.left; box.style.top = place.top; box.classList.toggle('below', place.below); box.hidden = false;
    box.querySelectorAll('canvas[data-gear-sprite]').forEach(c => paintGearIcon(c, c.dataset.gearSprite));
  }
  function showBase(tab = 'base') {
    $('[data-defense-bubble]').hidden = true;
    selected = { tab }; const panel = $('[data-defense-panel]'); panel.innerHTML = basePanelMarkup(run, tab); panel.hidden = false;
  }
  function refresh() {
    if (selected?.pad !== undefined) { if (run.pads[selected.pad]) showBubble(selected.pad); else closePopups(); }
    else if (selected?.tab) showBase(selected.tab);
  }
  const act = (fn, sound = 'deploy') => {
    try { fn(); feedback.sound(sound); return true; }
    catch (error) { if (error instanceof RangeError) notify('보급이 부족하거나 지금은 할 수 없어요'); else reportError('defense.action', error); return false; }
    finally { refresh(); render(); }
  };

  // 손가락 조작(끌어다 놓기·누르기·길게 누르기).
  const padAt = point => hitTest(point.x, point.y)?.pad ?? -1;
  const input = bindDefenseInput(dialog, {
    active: () => !!run && run.phase !== 'over' && !run.hand,
    toField: event => field && fieldPoint(field, event.clientX, event.clientY),
    padAt, hasTower: pad => !!run.pads[pad],
    ghost: view => { ghost = view; if (view) closePopups(); render(); },
    dropLine: (line, point) => {
      const pad = point ? padAt(point) : -1;
      armed = null;
      if (pad < 0 || run.pads[pad]) return;
      if (act(() => build(run, pad, line))) advanceCoach(0);
    },
    armLine: line => { armed = armed === line ? null : line; closePopups(); hint(armed ? `${LINES[line].name}: 지을 빈자리를 누르세요` : null); render(); },
    dropTower: (from, point) => {
      const to = point ? padAt(point) : -1;
      if (to >= 0 && to !== from) act(() => move(run, from, to), 'deploy');
    },
    tapField: point => tapField(point),
    longPress: pad => {
      const t = run.pads[pad], to = Math.min(nextChoiceLevel(t.level) ?? 50, 50);
      const affordable = (() => { let n = 0; for (let l = t.level + 1; l <= to; l++) if (upgradeCostTo(LINES[t.line].buildCost, t.level, l) <= run.supply) n = l - t.level; return n; })();
      if (affordable > 0 && act(() => upgrade(run, pad, affordable))) advanceCoach(1);
    },
  });

  function tapField(point) {
    if (mode === 'aim') { act(() => { useIcbm(run, point.x, point.y); feedback.blast(point.x, point.y); }, 'boom'); mode = null; hint(null); return; }
    const hit = hitTest(point.x, point.y);
    if (armed && hit?.pad !== undefined && !run.pads[hit.pad]) {
      const line = armed; armed = null; hint(null);
      if (act(() => build(run, hit.pad, line))) advanceCoach(0);
      return;
    }
    armed = null; hint(null);
    if (!hit) return closePopups();
    if (hit.pad !== undefined) return run.pads[hit.pad] ? showBubble(hit.pad) : closePopups();
    showBase(hit.bay ?? 'base');
  }

  // 판 끝(기지 파괴 또는 끝내기): 기록·보상을 저장하고 결과를 보여 준다.
  function finish() {
    cancelAnimationFrame(raf); raf = 0;
    run.phase = 'over';
    const reward = session.change(s => recordDefenseRun(s, run.cleared)) ?? null;
    const box = $('[data-defense-result]');
    box.innerHTML = resultMarkup(run, defenseOf(session.state).best, reward); box.hidden = false;
    closePopups(); $('[data-defense-hand]').hidden = true; $('[data-defense-coach]').hidden = true;
  }

  dialog.addEventListener('click', event => {
    const b = event.target.closest('button');
    if (!b || input.suppressClick(b)) return;
    if (b.matches('[data-defense-close]')) {
      if (!run) return close();
      if (run.phase === 'over') return showLobby();
      if (performance.now() < endArmedUntil) return finish();
      endArmedUntil = performance.now() + 2500; render(); return;   // 실수로 끝내지 않게 한 번 더 눌러야 끝
    }
    if (b.matches('[data-awaken]')) { session.change(s => awaken(s, b.dataset.awaken)); showLobby(); return; }
    if (b.matches('[data-defense-start], [data-defense-retry]')) { start(); loop(); return; }
    if (b.matches('[data-defense-lobby]')) return showLobby();
    if (!run) return;
    const d = b.dataset;
    if (b.matches('[data-defense-go]')) { act(() => startRun(run), 'start'); advanceCoach(2); return; }
    if (b.matches('[data-panel-close]')) return closePopups();
    if (b.matches('[data-defense-speed]')) { speed = speed === 1 ? 2 : 1; b.textContent = `x${speed}`; return; }
    if (b.matches('[data-defense-early]')) return act(() => callEarly(run), 'start');
    if (b.matches('[data-defense-cards]')) { act(() => openCards(run), 'deploy'); showHand(); return; }
    if (b.matches('[data-defense-base]')) return selected?.tab ? closePopups() : showBase();
    if (d.pick) { act(() => pickCard(run, Number(d.pick))); showHand(); return; }
    if (b.matches('[data-reroll]')) { act(() => reroll(run)); showHand(); return; }
    if (b.matches('[data-defense-icbm]')) {
      if (run.skills.icbm.ready > 0) { notify('ICBM 준비 중이에요'); return; }
      closePopups(); mode = mode === 'aim' ? null : 'aim'; hint(mode ? 'ICBM이 떨어질 곳을 누르세요' : null); return;
    }
    if (d.padAct !== undefined) {
      const pad = Number(d.padAct), kind = d.kind;
      if (kind === 'up') { if (act(() => upgrade(run, pad, 1))) advanceCoach(1); return; }
      return showBubble(pad);   // 특성·진화는 말풍선에서 고른다
    }
    if (d.evolve) return act(() => evolve(run, { pad: selected.pad }, Number(d.evolve)), 'win');
    if (d.bayEvolve) return act(() => evolve(run, { bay: selected.tab }, Number(d.bayEvolve)), 'win');
    if (d.upgrade) return act(() => upgrade(run, selected.pad, Number(d.upgrade)));
    if (d.trait) { const [level, index] = d.trait.split(':').map(Number); return act(() => chooseTrait(run, selected.pad, level, index)); }
    if (b.matches('[data-sell]')) { const pad = selected.pad; act(() => sell(run, pad)); closePopups(); return; }
    if (d.baseTab) return showBase(d.baseTab);
    if (b.matches('[data-base-up]')) return act(() => upgradeBase(run));
    if (d.bayBuild) return act(() => buildBay(run, d.bayBuild));
    if (d.bayUp) return act(() => upgradeBay(run, d.bayUp));
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); $('[data-defense-close]')?.click(); });
  addEventListener('resize', () => { if (dialog.open && run) resize(); });
  // 앱이 내려가면 lifecycle이 suspend()로 멈추고, 다시 보이면 이어서 진행한다.
  const resume = () => { if (dialog.open && run && run.phase !== 'over' && !raf) loop(); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) resume(); });

  return { open, close, suspend, resume, get run() { return run; } };
}
