import { supremeRankSymbol } from './rank-emblem.js';
// Original ceremonial metalwork. SVG strings are cached by the eight general tiers.
const cache = new Map();
const star = (x,y,r,fill) => {
  const points=Array.from({length:10},(_,i)=>{
    const angle=-Math.PI/2+i*Math.PI/5, radius=i%2?r*.44:r;
    return `${(x+Math.cos(angle)*radius).toFixed(2)},${(y+Math.sin(angle)*radius).toFixed(2)}`;
  }).join(' ');
  return `<polygon points="${points}" fill="${fill}" stroke="#fff1b4" stroke-width="1"/>`;
};
export function generalEmblem(tier) {
  if(!Number.isInteger(tier)||tier<1||tier>8)throw new RangeError('Unknown general ceremony tier');
  if(cache.has(tier))return cache.get(tier);
  const id=`general-ceremony-${tier}`, gold=`url(#${id}-gold)`, enamel=`url(#${id}-enamel)`;
  const feathers=Array.from({length:7+Math.min(tier,6)},(_,i)=>{
    const x=19+i*9+Math.max(0,i-4)*8,y=24+i*19,root=145+i*7;
    return `<path d="M281 ${root} Q182 ${y+64} ${x} ${y} Q${x+5} ${y+28} ${x+29} ${y+43} Q185 ${y+96} 283 ${root+34}Z" fill="${gold}" stroke="#77572c" stroke-width="1.8"/>
    <path d="M${x+9} ${y+17} Q150 ${y+90} 271 ${root+23}" fill="none" stroke="#ffefb0" stroke-width="2"/>
    <path d="M${x+29} ${y+34} Q158 ${y+87} 256 ${root+26}" fill="none" stroke="#9d7437" stroke-width="1"/>`;
  }).join('');
  const wing=`<g class="general-wing-feathers">${feathers}
    <path d="M283 139 Q207 139 153 111 Q187 163 278 201L286 177Z" fill="${gold}" stroke="#e9c979" stroke-width="2"/>
    <path d="M274 152Q221 155 187 137M274 170Q236 166 218 160" fill="none" stroke="#fff1bd" stroke-width="2"/>
    ${Array.from({length:4+tier},(_,i)=>`<circle cx="${187+i*13}" cy="${141+i*5}" r="2" fill="#ffedaa"/>`).join('')}</g>`;
  const stars=tier>=5 ? `<g transform="translate(268 137)">${supremeRankSymbol(tier)}</g>`
    : Array.from({length:tier},(_,i)=>star(300+(i-(tier-1)/2)*29,169,15,gold)).join('');
  const gems=tier>=3?`${star(74,92,7,'#f8e1a0')}${star(526,92,7,'#f8e1a0')}`:'';
  const crown=tier>=4?`<path d="m273 75 7 13 7-18 13 14 13-14 7 18 7-13-5 26h-44Z" fill="${gold}" stroke="#fff1bc" stroke-width="1.5"/><path d="M282 95h36" stroke="#77512b" stroke-width="2"/>`:star(300,85,9,gold);
  const svg=`<svg class="general-emblem" viewBox="0 0 600 330" aria-hidden="true" focusable="false">
    <defs><linearGradient id="${id}-gold" x1="0" y1="0" x2=".35" y2="1"><stop stop-color="#fff8cf"/><stop offset=".22" stop-color="#efd084"/><stop offset=".48" stop-color="#bd873d"/><stop offset=".7" stop-color="#ffe7a1"/><stop offset="1" stop-color="#89602d"/></linearGradient>
    <linearGradient id="${id}-enamel" x2=".7" y2="1"><stop stop-color="#49685c"/><stop offset=".48" stop-color="#213e36"/><stop offset="1" stop-color="#101d1c"/></linearGradient></defs>
    <g class="general-wing left">${wing}</g><g transform="translate(600 0) scale(-1 1)"><g class="general-wing right">${wing}</g></g>
    <g class="general-crest"><circle cx="300" cy="173" r="96" fill="none" stroke="#d2ad62" stroke-opacity=".4" stroke-width="1"/>
    <circle cx="300" cy="173" r="88" fill="none" stroke="#fff0b5" stroke-opacity=".35" stroke-width="2" stroke-dasharray="1 7"/>
    <path d="m300 98 70 23-8 85q-12 35-62 62-50-27-62-62l-8-85Z" fill="#251c10" stroke="#73552e" stroke-width="4"/>
    <path d="m300 101 67 22-8 80q-10 32-59 61-49-29-59-61l-8-80Z" fill="${gold}" stroke="#fff0b9" stroke-width="2"/>
    <path d="m300 111 55 19-7 70q-7 29-48 54-41-25-48-54l-7-70Z" fill="${enamel}" stroke="#a97c3f" stroke-width="2"/>
    <path d="m300 117 49 17-4 27q-37-26-89 6l-5-33Z" fill="#ffffff" opacity=".07"/>
    <path d="M261 206q39 25 78 0M269 215q31 22 62 0" stroke="#d0ab62" stroke-width="1.6" fill="none"/>
    <path d="m300 201 5 8-5 9-5-9Z" fill="#e9ce8a"/>
    <g class="general-rank-stars">${stars}</g>${crown}
    <path d="m256 258 44 18 44-18-5 14-39 19-39-19Z" fill="${gold}" stroke="#ecd08b" stroke-width="1"/>
    ${tier>=2?star(300,275,5,'#fff2be'):''}</g>${gems}</svg>`;
  cache.set(tier,svg);return svg;
}

export const saluteCannon = `<svg viewBox="0 0 140 115" aria-hidden="true" focusable="false">
  <ellipse cx="61" cy="104" rx="57" ry="6" fill="#080f0f" opacity=".65"/>
  <path d="m23 92 68-16 35 24-2 5H20Z" fill="#77613f" stroke="#d7bd77" stroke-width="2"/>
  <path d="m67 75 16-22 15 12-13 26Z" fill="#32483e" stroke="#bba06a" stroke-width="3"/>
  <g class="salute-barrel"><path d="m32 60 69-41 14 20-65 49Z" fill="#b5904e" stroke="#fae1a0" stroke-width="2"/>
  <path d="m36 62 66-38 4 6-66 43Z" fill="#fff1b2"/><path d="m46 76 62-42 5 5-64 46Z" fill="#685338"/>
  <path d="m91 22 11-6 17 24-11 8Z" fill="#31433c" stroke="#e7c884" stroke-width="3"/>
  <path d="m99 20 13 20" stroke="#fff3b8" stroke-width="2"/>
  <path d="m54 45 16 24M64 39l15 24" stroke="#75603e" stroke-width="4"/>
  <circle cx="48" cy="73" r="8" fill="#35463c" stroke="#c9a25e" stroke-width="2"/></g>
  <circle cx="48" cy="91" r="20" fill="#121e1b" stroke="#ba9455" stroke-width="4"/>
  <circle cx="48" cy="91" r="14" fill="#344a3e" stroke="#e5c47d" stroke-width="2"/>
  <path d="M48 77v28M34 91h28M38 81l20 20M38 101l20-20" stroke="#9c8152" stroke-width="2"/>
  <circle cx="48" cy="91" r="5" fill="#f1d38a"/><circle cx="100" cy="94" r="6" fill="#37483c" stroke="#c5a365" stroke-width="2"/>
</svg>`;
