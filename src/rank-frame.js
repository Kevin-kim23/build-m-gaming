import { supremeRankSymbol } from './rank-emblem.js';

// Original beveled enamel artwork; the reference supplies a material direction only.
const cache = new Map();
const star = (x, y, radius, gold) => {
  const points = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? radius * .44 : radius;
    return `${(x + Math.cos(a) * r).toFixed(2)},${(y + Math.sin(a) * r).toFixed(2)}`;
  }).join(' ');
  return `<polygon data-rank-star data-metal="gold" points="${points}" fill="${gold}" stroke="#fff3bc" stroke-width=".65"/>`;
};

export function generalRankBadge(tier) {
  if (!Number.isInteger(tier) || tier < 1 || tier > 5) throw new RangeError('Unknown framed general rank');
  if (cache.has(tier)) return cache.get(tier);
  const id = `rank-frame-${tier}`, gold = `url(#${id}-gold)`;
  const symbols = tier === 5
    ? `<g transform="translate(16 16)">${supremeRankSymbol(tier)}</g>`
    : Array.from({ length: tier }, (_, i) => star(48 + (i - (tier - 1) / 2) * (tier === 2 ? 32 : tier === 3 ? 23 : 18), 49, tier === 1 ? 19 : tier === 2 ? 15 : tier === 4 ? 10 : 11, gold)).join('');
  const svg = `<svg class="framed-rank-badge" data-general-frame="${tier}" viewBox="0 0 96 96" aria-hidden="true" focusable="false">
    <defs><linearGradient id="${id}-gold" x2=".35" y2="1"><stop stop-color="#fff5b8"/><stop offset=".22" stop-color="#e9c769"/><stop offset=".48" stop-color="#9e5e15"/><stop offset=".7" stop-color="#f9dd82"/><stop offset="1" stop-color="#754212"/></linearGradient>
    <linearGradient id="${id}-red" x2=".6" y2="1"><stop stop-color="#cc313a"/><stop offset=".36" stop-color="#81141e"/><stop offset="1" stop-color="#27090e"/></linearGradient></defs>
    <rect x="2" y="4" width="92" height="91" rx="12" fill="#160c07"/>
    <rect x="2" y="1" width="91" height="91" rx="12" fill="${gold}" stroke="#573211" stroke-width="2"/>
    <path d="M13 4h67q10 0 10 10v57" fill="none" stroke="#fff4bf" stroke-width="2" opacity=".9"/>
    <rect x="9" y="8" width="77" height="77" rx="6" fill="#532111" stroke="#ba8235" stroke-width="2"/>
    <rect x="12" y="11" width="71" height="70" rx="4" fill="url(#${id}-red)" stroke="#431014" stroke-width="2"/>
    <path d="M17 14h59q4 0 4 4v19Q51 22 15 35V18q0-4 2-4Z" fill="#ffbdab" opacity=".12"/>
    <path d="M15 76q30 9 65 0" fill="none" stroke="#ed5650" opacity=".18"/>
    <g class="framed-rank-stars">${symbols}</g>
    <path d="M7 17v-4q0-7 7-7h8M76 87h5q7 0 7-7v-5" fill="none" stroke="#fff0b1" stroke-width="1.5" opacity=".7"/>
  </svg>`;
  cache.set(tier, svg);
  return svg;
}
