// Original insignia geometry, shared by the tiny badge and promotion ceremony.
const cache = new Map();
function star(x, y, radius) {
  const points = Array.from({length:10}, (_, i) => {
    const angle = -Math.PI/2 + i*Math.PI/5, r = i%2 ? radius*.44 : radius;
    return `${(x+Math.cos(angle)*r).toFixed(2)},${(y+Math.sin(angle)*r).toFixed(2)}`;
  }).join(' ');
  return `<polygon data-rank-star points="${points}" fill="#f3e4ac" stroke="#b19450" stroke-width="1"/>`;
}
export function supremeRankSymbol(tier) {
  if (tier !== 5 && tier !== 6) throw new RangeError('Unknown supreme rank');
  if (cache.has(tier)) return cache.get(tier);
  let art;
  if (tier === 5) {
    art = [[15,15],[49,15],[32,32],[15,49],[49,49]].map(([x,y])=>star(x,y,10)).join('');
  } else {
    const leaves = Array.from({length:6},(_,i)=>{
      const x=9+i*3.5, y=29+i*4.7;
      return `<path d="M${x} ${y+7}q-8-2-7-10q7 1 7 10Z" fill="#d5b467"/>
        <path d="M${x+1} ${y+8}q9-1 10-8q-8-1-10 8Z" fill="#f0d991"/>
        <path d="m${x-4} ${y+1} 4 6m2 0 5-4" fill="none" stroke="#91783e" stroke-width=".7"/>`;
    }).join('');
    const branch = `<g data-laurel><path d="M32 61Q8 52 6 24" fill="none" stroke="#c5a55d" stroke-width="2"/>${leaves}</g>`;
    art = star(32,22,21) + branch + `<g transform="translate(64 0) scale(-1 1)">${branch}</g>` +
      '<path d="m27 59 5 2 5-2-2 5h-6Z" fill="#f3e4ac"/>';
  }
  cache.set(tier,art);
  return art;
}
export const supremeRankBadge = tier => `<svg class="supreme-rank-badge" data-rank-symbol="${tier===5?'marshal':'grand-marshal'}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${supremeRankSymbol(tier)}</svg>`;
