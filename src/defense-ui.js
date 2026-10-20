// 무한 방어전 화면 조종: 대화상자 하나와 애니메이션 루프 하나. 규칙 계산은 defense-run/combat에 맡긴다.
// 매 프레임에는 캔버스와 바뀐 숫자만 고치고, HTML 교체는 패널을 열거나 누를 때만 한다. 저장은 하지 않는다(2단계).
import { createRun, build, upgrade, chooseTrait, sell, move, upgradeBase, buildBay, upgradeBay, callEarly } from './defense-run.js';
import { step } from './defense-combat.js';
import { zoneFor } from './defense-waves.js';
import { MAP, UNLOCK_RANK } from './defense-data.js';
import { startBaseLevel } from './defense-economy.js';
import { defenseMarkup, buildMenuMarkup, towerPanelMarkup, basePanelMarkup, resultMarkup, hudValues, hitTest, fieldFit } from './defense-markup.js';
import { drawDefense } from './defense-art.js';
import { RANKS, RANK_DEFINITIONS, rankForArmy } from './ranks.js';
import { supremeRankBadge } from './rank-emblem.js';
import { insignia } from './home-view.js';
import { teamSprite } from './lane-art.js';
import { reportError } from './diagnostics.js';
import './defense.css';

// 계급 별: 부사령관부터는 원수 계열 별(테두리 없이), 그 아래는 홈 계급장 그대로.
function rankStar(index) {
  const marks = RANK_DEFINITIONS[index]?.marks;
  try { return marks >= 5 ? supremeRankBadge(marks) : insignia(index); }
  catch (error) { reportError('defense.rankStar', error); return insignia(index); }
}

export function createDefenseUI(session, { notify = () => {} } = {}) {
  const dialog = document.querySelector('#defense-modal');
  let run = null, raf = 0, last = 0, speed = 1, selected = null, moveFrom = null, best = 0, canvas = null, field = null;
  const hudCache = {}, lvCache = {};

  function rankName() {
    const name = RANKS[rankForArmy(session.state)];
    return startBaseLevel(name) === null ? { name: UNLOCK_RANK, test: true } : { name, test: false };
  }
  function start() {
    const rank = rankName();
    run = createRun({ rank: rank.name, seed: Date.now() & 0x7fffffff });
    run.storedCards = 0;   // 카드 고르기는 3단계에서 연결
    selected = null; moveFrom = null;
    Object.keys(hudCache).forEach(k => delete hudCache[k]); Object.keys(lvCache).forEach(k => delete lvCache[k]);
    dialog.innerHTML = defenseMarkup({ rankName: rank.name, starSvg: rankStar(RANKS.indexOf(rank.name)), testMode: true });
    canvas = dialog.querySelector('[data-defense-canvas]'); field = dialog.querySelector('[data-defense-field]');
    resize();
  }
  function resize() {
    if (!field) return;
    const box = dialog.getBoundingClientRect(), fit = fieldFit(box.width, box.height);
    field.style.width = `${fit.width}px`; field.style.height = `${fit.height}px`;
    const dpr = Math.min(3, globalThis.devicePixelRatio || 1);
    canvas.width = Math.round(MAP.width * fit.scale * dpr); canvas.height = Math.round(MAP.height * fit.scale * dpr);
    canvas.style.width = `${fit.width}px`; canvas.style.height = `${fit.height}px`;
    render();
  }

  function open() {
    if (!dialog.open) dialog.showModal();
    start();
    loop();
  }
  function close() {
    cancelAnimationFrame(raf); raf = 0; run = null;
    if (dialog.open) dialog.close();
  }
  function suspend() { cancelAnimationFrame(raf); raf = 0; last = 0; }
  function loop() {
    cancelAnimationFrame(raf); last = 0;
    const frame = now => {
      if (!run || !dialog.open) { raf = 0; return; }
      const dt = last ? Math.min(0.25, (now - last) / 1000) : 0; last = now;
      try {
        step(run, dt * speed);
        render();
        if (run.phase === 'over') { finish(); return; }
      } catch (error) { reportError('defense.frame', error); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }

  function render() {
    if (!run || !canvas) return;
    drawDefense(canvas, run, zoneFor(Math.max(1, run.wave)).theme, { selected, moveFrom });
    const values = hudValues(run);
    for (const [k, v] of Object.entries(values)) if (hudCache[k] !== v) {
      hudCache[k] = v;
      const node = dialog.querySelector(`[data-d="${k}"]`);
      if (!node) continue;
      if (k === 'supplybar') node.style.width = v; else node.textContent = v;
    }
    const early = dialog.querySelector('[data-defense-early]');
    if (early && early.hidden !== (run.phase !== 'gap')) early.hidden = run.phase !== 'gap';
    run.pads.forEach((t, i) => setLv(`pad${i}`, `[data-pad-lv="${i}"]`, t ? `Lv${t.level}` : ''));
    for (const id of Object.keys(run.bays)) setLv(id, `[data-bay-lv="${id}"]`, run.bays[id] ? `Lv${run.bays[id].level}` : '');
    dialog.querySelectorAll('[data-defense-panel] [data-cost]').forEach(b => { const off = run.supply < Number(b.dataset.cost); if (b.disabled !== off) b.disabled = off; });
  }
  function setLv(key, selector, text) {
    if (lvCache[key] === text) return;
    lvCache[key] = text;
    const node = dialog.querySelector(selector);
    if (node) { node.textContent = text; node.hidden = !text; }
  }

  function showPanel(markup) {
    const panel = dialog.querySelector('[data-defense-panel]');
    panel.innerHTML = markup; panel.hidden = false;
    panel.querySelectorAll('canvas[data-gear-sprite]').forEach(c => {
      const s = teamSprite(c.dataset.gearSprite, 'player', 12).canvas;
      c.width = s.width; c.height = s.height; c.getContext('2d').drawImage(s, 0, 0);
    });
  }
  function hidePanel() { const panel = dialog.querySelector('[data-defense-panel]'); if (panel) panel.hidden = true; selected = null; moveFrom = null; }
  function refreshPanel() {
    if (!selected) return hidePanel();
    if (selected.pad !== undefined) showPanel(run.pads[selected.pad] ? towerPanelMarkup(run, selected.pad, { moving: moveFrom !== null }) : buildMenuMarkup(run, selected.pad));
    else showPanel(basePanelMarkup(run, selected.tab ?? 'base'));
  }
  const act = fn => { try { fn(); } catch (error) { if (error instanceof RangeError) notify('보급이 부족하거나 지금은 할 수 없어요'); else reportError('defense.action', error); } refreshPanel(); render(); };

  function tapField(event) {
    const box = field.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width * MAP.width, y = (event.clientY - box.top) / box.height * MAP.height;
    const hit = hitTest(x, y);
    if (moveFrom !== null) {
      if (hit?.pad !== undefined && hit.pad !== moveFrom) { const to = hit.pad; act(() => { move(run, moveFrom, to); moveFrom = null; selected = { pad: to }; }); }
      else { moveFrom = null; refreshPanel(); }
      return;
    }
    if (!hit) return hidePanel();
    selected = hit.pad !== undefined ? { pad: hit.pad } : { tab: hit.bay ?? 'base' };
    refreshPanel(); render();
  }

  function finish() {
    cancelAnimationFrame(raf); raf = 0;
    const box = dialog.querySelector('[data-defense-result]');
    box.innerHTML = resultMarkup(run, best); box.hidden = false;
    best = Math.max(best, run.cleared);
  }

  dialog.addEventListener('click', event => {
    const b = event.target.closest('button');
    if (!b) { if (event.target.closest('[data-defense-canvas]')) tapField(event); return; }
    if (b.matches('[data-defense-close]')) return close();
    if (!run) return;
    const d = b.dataset;
    if (b.matches('[data-defense-retry]')) { start(); loop(); return; }
    if (b.matches('[data-panel-close]')) return hidePanel();
    if (b.matches('[data-defense-speed]')) { speed = speed === 1 ? 2 : 1; b.textContent = `x${speed}`; return; }
    if (b.matches('[data-defense-early]')) return act(() => callEarly(run));
    if (d.build) return act(() => build(run, selected.pad, d.build));
    if (d.upgrade) return act(() => upgrade(run, selected.pad, Number(d.upgrade)));
    if (d.trait) { const [level, index] = d.trait.split(':').map(Number); return act(() => chooseTrait(run, selected.pad, level, index)); }
    if (b.matches('[data-sell]')) { act(() => sell(run, selected.pad)); return; }
    if (b.matches('[data-move]')) { moveFrom = moveFrom === null ? selected.pad : null; refreshPanel(); return; }
    if (d.baseTab) { selected = { tab: d.baseTab }; refreshPanel(); return; }
    if (b.matches('[data-base-up]')) return act(() => upgradeBase(run));
    if (d.bayBuild) return act(() => buildBay(run, d.bayBuild));
    if (d.bayUp) return act(() => upgradeBay(run, d.bayUp));
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  addEventListener('resize', () => { if (dialog.open) resize(); });
  // 앱이 내려가면 lifecycle이 suspend()로 멈추고, 다시 보이면 이어서 진행한다.
  const resume = () => { if (dialog.open && run && run.phase !== 'over' && !raf) loop(); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) resume(); });

  return { open, close, suspend, resume, get run() { return run; } };
}
