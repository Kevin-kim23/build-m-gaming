// Layered original feather shapes. Cache the six variants used by field officers.
const cache = new Map();
export function fieldOfficerWing(marks, side) {
  const key = `${marks}-${side}`;
  if (cache.has(key)) return cache.get(key);
  const id = `field-wing-${key}`, gold = `url(#${id})`;
  const feathers = Array.from({ length: 8 + marks }, (_, i) => {
    const x = 6 + i * 7, y = 8 + i * 6, root = 82 + i * 2;
    return `<g class="field-wing-feather" style="--feather-delay:${i * 35}ms"><path d="M153 ${root}Q89 ${y + 31} ${x} ${y}Q${x + 4} ${y + 25} ${x + 25} ${y + 38}Q101 ${y + 66} 153 ${root + 14}Z" fill="${gold}" stroke="#826134" stroke-width="1.5"/>
      <path d="M${x + 7} ${y + 14}Q83 ${y + 49} 148 ${root + 7}" fill="none" stroke="#fff4c6" stroke-width="1.3" opacity=".9"/></g>`;
  }).join('');
  const svg = `<svg class="field-officer-wing" viewBox="0 0 160 130" aria-hidden="true"><defs><linearGradient id="${id}" x2=".3" y2="1"><stop stop-color="#fff7d9"/><stop offset=".24" stop-color="#ecd18b"/><stop offset=".53" stop-color="#ad7837"/><stop offset=".72" stop-color="#ffe8a6"/><stop offset="1" stop-color="#886134"/></linearGradient></defs>
    ${feathers}<path d="M154 80Q106 76 78 62Q97 91 151 103Z" fill="${gold}" stroke="#e9ce8b" stroke-width="2"/>
    <path d="M151 87Q120 86 101 77" fill="none" stroke="#fff5c8" stroke-width="1.5"/>
    ${Array.from({ length: marks + 2 }, (_, i) => `<path d="m${116 + i * 8} ${88 + i * 2} 3-4 3 4-3 4Z" fill="#fff1b9" stroke="#9d743a" stroke-width=".8"/>`).join('')}
    <path class="field-wing-shine" d="M32 32Q87 64 143 88" fill="none" stroke="#fffbee" stroke-width="3"/>
  </svg>`;
  cache.set(key, svg);
  return svg;
}
