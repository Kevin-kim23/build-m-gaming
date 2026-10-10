import { supremeRankSymbol } from './rank-emblem.js';

// Original beveled enamel artwork; the reference supplies a material direction only.
const cache = new Map();
let instanceSerial = 0;

// Inline SVG IDs belong to the whole document, including closed dialogs.
// Keep cached artwork intact, but give each rendered copy its own definitions.
export function rankBadgeInstance(art) {
  const prefix = `rank-instance-${++instanceSerial}-`;
  return art.replace(/\bid="([^"]+)"/g, (_, id) => `id="${prefix}${id}"`)
    .replace(/url\(#([^)]*)\)/g, (_, id) => `url(#${prefix}${id})`);
}

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

const marshalThemes = Object.freeze({
  6: { name:'sapphire', metal:['#f5fcff','#b9d4e8','#486784','#d7ebfa','#36465e'], enamel:['#3374b2','#123e70','#071626'], light:'#8ae4ff' },
});

// One cached, original 96px artwork per marshal tier, shared by HUD and rank guide.
export function marshalRankBadge(tier) {
  if (!Number.isInteger(tier) || tier < 6 || tier > 10) throw new RangeError('Unknown framed marshal rank');
  const key = `marshal-${tier}`;
  if (cache.has(key)) return cache.get(key);
  const p = marshalThemes[6], id = `rank-frame-${key}`, metal = `url(#${id}-metal)`;
  const studs = [[13,13],[83,13],[13,83],[83,83]].map(([x,y])=>`<path d="M${x} ${y-3}l3 3-3 3-3-3Z" fill="${p.metal[0]}" stroke="${p.metal[2]}" stroke-width=".8"/>`).join('');
  const engraving = Array.from({length:tier-5}, (_, i)=>`<path d="m${45+i*6-(tier-6)*3} 77 3-2 3 2-3 2Z" fill="${p.light}" opacity=".7"/>`).join('');
  const svg = `<svg class="framed-rank-badge marshal-rank-badge" data-marshal-frame="${tier}" data-frame-theme="${p.name}" viewBox="0 0 96 96" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="${id}-metal" x2=".35" y2="1">${p.metal.map((color,i)=>`<stop offset="${i/4}" stop-color="${color}"/>`).join('')}</linearGradient>
      <linearGradient id="${id}-enamel" x2=".65" y2="1">${p.enamel.map((color,i)=>`<stop offset="${i/2}" stop-color="${color}"/>`).join('')}</linearGradient>
      <radialGradient id="${id}-light"><stop stop-color="${p.light}" stop-opacity=".23"/><stop offset="1" stop-color="${p.light}" stop-opacity="0"/></radialGradient>
      <filter id="${id}-relief" x="-15%" y="-20%" width="130%" height="150%"><feDropShadow dx="0" dy="2" stdDeviation=".5" flood-color="#02080e" flood-opacity=".95"/></filter>
    </defs>
    <rect x="2" y="5" width="92" height="90" rx="12" fill="#050a11"/>
    <rect x="2" y="1" width="91" height="91" rx="12" fill="${metal}" stroke="${p.metal[4]}" stroke-width="2"/>
    <path d="M13 4h68q9 0 9 10v61M5 68V14q0-9 8-9" fill="none" stroke="${p.metal[0]}" stroke-width="1.8" opacity=".9"/>
    <rect x="8" y="7" width="79" height="80" rx="7" fill="${p.metal[4]}" stroke="${p.metal[1]}" stroke-width="1.3"/>
    <rect x="11" y="10" width="73" height="73" rx="5" fill="url(#${id}-enamel)" stroke="${p.metal[2]}" stroke-width="1.5"/>
    <path d="M14 34V19q0-5 5-5h57q4 0 4 4v18Q48 21 14 34Z" fill="${p.light}" opacity=".12"/>
    <path d="M14 72q31 13 66 0v6H14Z" fill="#030a15" opacity=".34"/>
    <ellipse cx="48" cy="46" rx="34" ry="30" fill="url(#${id}-light)"/>
    <path d="m17 39 12-12h38l12 12v20L67 70H29L17 59Z" fill="none" stroke="${p.light}" stroke-width=".7" opacity=".19"/>
    <path d="M21 18h15M60 18h15M20 74h9M67 74h9" stroke="${p.light}" stroke-width="1" opacity=".5"/>
    <g class="framed-rank-stars" transform="translate(16 15)" filter="url(#${id}-relief)">${supremeRankSymbol(tier)}</g>
    ${engraving}${studs}
    <path d="M40 7h16l-3 3H43Z" fill="${p.metal[0]}"/><path d="M38 85h20l-4 3H42Z" fill="${p.metal[2]}"/>
  </svg>`;
  cache.set(key,svg);
  return svg;
}
