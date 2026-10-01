import { RANKS, LAST_RANK, RANK_DEFINITIONS } from "./ranks.js";
import { generalPromotionMarkup } from './general-promotion.js';
export function promotionProfile(rank) {
  const level = Number.isInteger(rank) ? Math.max(1, Math.min(LAST_RANK, rank)) : 1;
  const generalTier = RANK_DEFINITIONS[level].kind === 'general' ? RANK_DEFINITIONS[level].marks : 0;
  return {
    duration: generalTier ? 5000 + generalTier * 300 + Math.max(0,generalTier-4)*500 : 3000,
    generalTier,
    salvos: generalTier ? generalTier + 2 : 0,
    salvoInterval: 600,
    saluteDelay: 850,
    width: Math.min(360, 220 + level * 8),
    medal: 66 + level * 3,
    volume:
      Math.min(0.149, 0.05 + Math.min(12, level) * 0.006 + Math.max(0, level - 12) * 0.004),
    notes: Math.min(8, 3 + Math.floor(level / 3)),
    sparks: 6 + level,
  };
}
// Original angular wing geometry, reused and mirrored. No external assets.
const wing = `<svg viewBox="0 0 120 100" aria-hidden="true"><path d="M119 69 100 44 69 33 12 8 24 32 66 57 6 32 22 58 75 76 19 64 37 84 87 91 118 84Z" fill="#d5bb76" stroke="#f6e4aa" stroke-width="2"/><path d="m24 25 72 32 34 20M23 48l55 25 29 7M37 76l44 11" fill="none" stroke="#9d7b40" stroke-width="3"/></svg>`;
let layer, timer;
export function hidePromotion() {
  clearTimeout(timer);
  timer = undefined;
  if (layer?.open) layer.close();
}
export function showPromotion(rank, insignia) {
  if (!layer) {
    layer = document.createElement("dialog");
    layer.className = "promotion-layer";
    layer.setAttribute("aria-label", "진급 축하");
    layer.addEventListener("close", () => {
      if (!layer.open) {
        clearTimeout(timer);
        timer = undefined;
      }
    });
    layer.addEventListener('click', event => {
      if (event.target.closest('[data-dismiss-promotion]')) hidePromotion();
    });
    document.body.appendChild(layer);
  }
  clearTimeout(timer);
  const p = promotionProfile(rank);
  layer.classList.toggle('is-general', p.generalTier > 0);
  layer.setAttribute('aria-label', `${RANKS[rank]} ${p.generalTier ? '장성 진급식' : '진급 축하'}`);
  layer.style.setProperty("--promotion-width", p.width + "px");
  layer.style.setProperty("--medal-size", p.medal + "px");
  layer.style.setProperty("--promotion-duration", p.duration + "ms");
  layer.innerHTML = p.generalTier ? generalPromotionMarkup(rank, p) : `<div class="promotion-stage" data-rank="${rank}">
  <div class="promotion-halo" aria-hidden="true"></div>
  <div class="promotion-wing left">${wing}</div><div class="promotion-wing right">${wing}</div>
  <div class="promotion-sparks" aria-hidden="true">${Array.from({ length: p.sparks }, (_, i) => `<i style="--angle:${(i / p.sparks) * 360}deg;--distance:${72 + (i % 3) * 15}px;--delay:${(i % 4) * 0.08}s"></i>`).join("")}</div>
  <p class="promotion-eyebrow">PROMOTION</p>
  <div class="promotion-medal" aria-hidden="true">${insignia(rank)}</div>
  <p class="promotion-announcement">${RANKS[rank]} 진급!</p><p class="promotion-caption">더 큰 부대를 향하여</p>
 </div>`;
  if (!layer.open) layer.showModal();
  timer = setTimeout(hidePromotion, p.duration);
}
