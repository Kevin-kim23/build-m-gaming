import { fmtGold } from "./format.js";
const flashes = new WeakMap();
const motionQueries = new WeakMap();
function prefersStillFeedback(zone) {
  const view = zone.ownerDocument?.defaultView ?? globalThis;
  if (!motionQueries.has(view) && view.matchMedia)
    motionQueries.set(view, view.matchMedia('(prefers-reduced-motion: reduce)'));
  return motionQueries.get(view)?.matches === true;
}

function transient(zone, node, selector, limit, duration) {
  const existing = zone.querySelectorAll(selector);
  for (let i=0; i<=existing.length-limit; i++) existing[i].remove();
  zone.appendChild(node);
  setTimeout(() => node.remove(), duration);
}

export function tapFeedback(zone, gold, event, amount) {
  const reduced = prefersStillFeedback(zone);
  const bounds = zone.getBoundingClientRect(),
    label = document.createElement("span");
  label.className = "gold-float";
  label.setAttribute?.('aria-hidden','true');
  if (reduced) label.className += ' gold-float-still';
  label.textContent = `+${fmtGold(amount)} G`;
  const x = event.detail === 0 ? bounds.width / 2 : event.clientX - bounds.left,
    y = event.detail === 0 ? bounds.height * 0.49 : event.clientY - bounds.top;
  label.style.left = `${Math.max(40, Math.min(bounds.width - 46, x))}px`;
  label.style.top = `${Math.max(48, Math.min(bounds.height - 25, y))}px`;
  transient(zone, label, '.gold-float', reduced ? 1 : 15, reduced ? 220 : 700);
  if (!reduced) {
    const impact = document.createElement('span');
    impact.className = 'tap-impact';
    impact.setAttribute?.('aria-hidden','true');
    impact.style.left = label.style.left;
    impact.style.top = label.style.top;
    transient(zone, impact, '.tap-impact', 6, 280);
  }
  // A new manual tap replaces the old punch. Transforms leave HUD layout fixed;
  // automatic income never calls this function. Motion reduction uses a still tint.
  flashes.get(gold)?.cancel();
  if (gold.animate) {
    const frames = reduced ? [{color:'#fff0bd'},{color:'#fff0bd'}] : [
      {transform:'scale(1.12)',color:'#fff0bd',textShadow:'0 0 10px #ebc66980'},
      {transform:'scale(1.04)',color:'#f4d995',textShadow:'0 0 5px #ebc66940',offset:.45},
      {transform:'scale(1)',color:'var(--ui-accent, #d8b66f)',textShadow:'0 0 0 transparent'},
    ];
    flashes.set(gold, gold.animate(frames, {duration:reduced ? 120 : 260,easing:'cubic-bezier(.16,.7,.3,1)'}));
  }
}
