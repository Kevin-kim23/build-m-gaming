// 무한 방어전 손가락 조작: 아래 카드 끌어다 놓기·누르기, 장비 끌어서 옮기기·자리 바꾸기, ▲ 길게 누르기.
// 화면 좌표를 전장 좌표(360×780)로 바꿔 콜백에 넘긴다. 리스너는 대화상자에 한 번만 붙인다.
import { MAP } from './defense-data.js';

export const DRAG_START_PX = 8;
export const LONG_PRESS_MS = 450;

// cb: toField(event) → {x,y}|null, padAt({x,y}) → pad index|-1, hasTower(pad),
//     ghost(view|null), dropLine(line, point), armLine(line), dropTower(from, point), tapField(point), longPress(pad), active()
export function bindDefenseInput(dialog, cb) {
  let press = null, suppressClickUntil = 0;
  const clear = () => { if (press?.timer) clearTimeout(press.timer); press = null; };

  dialog.addEventListener('pointerdown', event => {
    if (!cb.active() || event.button > 0) return;
    const card = event.target.closest('[data-tray-line]'), act = event.target.closest('[data-pad-act]');
    const onCanvas = event.target.closest('[data-defense-canvas]');
    if (card && !card.disabled) press = { kind: 'line', line: card.dataset.trayLine, x0: event.clientX, y0: event.clientY };
    else if (act && !act.disabled && act.dataset.kind === 'up') {
      const pad = Number(act.dataset.padAct);
      press = { kind: 'act', pad, timer: setTimeout(() => { suppressClickUntil = performance.now() + 600; cb.longPress(pad); press = null; }, LONG_PRESS_MS) };
      return;
    } else if (onCanvas) {
      const point = cb.toField(event), pad = point ? cb.padAt(point) : -1;
      press = { kind: pad >= 0 && cb.hasTower(pad) ? 'tower' : 'tap', pad, x0: event.clientX, y0: event.clientY, point };
    } else return;
    event.target.setPointerCapture?.(event.pointerId);
  });

  dialog.addEventListener('pointermove', event => {
    if (!press || press.kind === 'act' || press.kind === 'tap') return;
    if (!press.dragging && Math.hypot(event.clientX - press.x0, event.clientY - press.y0) < DRAG_START_PX) return;
    press.dragging = true;
    const point = cb.toField(event);
    cb.ghost(press.kind === 'line' ? { line: press.line, point } : { from: press.pad, point });
  });

  const end = event => {
    if (!press) return;
    const p = press; clear();
    if (p.kind === 'act') return;   // 짧게 누르면 click 이벤트가 +1 강화를 처리한다
    const point = cb.toField(event);
    cb.ghost(null);
    if (p.dragging) {
      suppressClickUntil = performance.now() + 300;
      if (p.kind === 'line') cb.dropLine(p.line, point); else cb.dropTower(p.pad, point);
      return;
    }
    if (p.kind === 'line') { suppressClickUntil = performance.now() + 300; cb.armLine(p.line); return; }
    if (point) cb.tapField(point);
  };
  dialog.addEventListener('pointerup', end);
  dialog.addEventListener('pointercancel', () => { clear(); cb.ghost(null); });

  // 끌기·길게 누르기 직후의 click은 그 카드·▲ 버튼에서 온 것만 무시한다(다른 버튼은 바로 눌린다).
  return { suppressClick: target => performance.now() < suppressClickUntil && !!target.closest('[data-tray-line], [data-pad-act]') };
}

// 화면 좌표 → 전장 좌표. 전장 밖이면 null.
export function fieldPoint(fieldElement, clientX, clientY) {
  const box = fieldElement.getBoundingClientRect();
  if (clientX < box.left || clientX > box.right || clientY < box.top || clientY > box.bottom) return null;
  return { x: (clientX - box.left) / box.width * MAP.width, y: (clientY - box.top) / box.height * MAP.height };
}
