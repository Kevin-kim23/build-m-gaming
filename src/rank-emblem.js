// Original insignia geometry, shared by the tiny badge and promotion ceremony.
const cache = new Map();
const symbols = {5:'junior-marshal',6:'minor-marshal',7:'middle-marshal',8:'grand-marshal'};
function star(x, y, radius, platinum = false) {
  const points = Array.from({length:10}, (_, i) => {
    const angle = -Math.PI/2 + i*Math.PI/5, r = i%2 ? radius*.44 : radius;
    return `${(x+Math.cos(angle)*r).toFixed(2)},${(y+Math.sin(angle)*r).toFixed(2)}`;
  }).join(' ');
  return `<polygon data-rank-star data-metal="${platinum?'platinum':'gold'}" points="${points}" fill="${platinum?'#edf5ff':'#f3e4ac'}" stroke="${platinum?'#9eafbf':'#b19450'}" stroke-width=".8"/>`;
}
function laurels(low = false) {
  // Shorter, lower branches keep the tips inside the badge instead of jutting upward.
  const top = low ? 44 : 15, bottom = low ? 60 : 40;
  const leaves = Array.from({length:5},(_,i)=>{
    const x=8+i*4, y=top+i*(low?2.4:4.2);
    return `<path d="M${x} ${y+6}q-6-1-6-8q6 1 6 8Z" fill="#d5b467"/>
      <path d="M${x+1} ${y+7}q7-1 8-7q-6-1-8 7Z" fill="#f0d991"/>
      <path d="m${x-3} ${y+1} 3 4m2 0 4-3" fill="none" stroke="#91783e" stroke-width=".7"/>`;
  }).join('');
  const branch = `<g data-laurel><path d="M32 ${bottom}Q9 ${bottom-7} 7 ${top}" fill="none" stroke="#c5a55d" stroke-width="1.7"/>${leaves}</g>`;
  return branch+`<g transform="translate(64 0) scale(-1 1)">${branch}</g>`+
    `<path d="m27 ${bottom-2} 5 2 5-2-2 4h-6Z" fill="#f3e4ac"/>`;
}
export function supremeRankSymbol(tier) {
  if (!Number.isInteger(tier) || !Object.hasOwn(symbols,tier)) throw new RangeError('Unknown supreme rank');
  if (cache.has(tier)) return cache.get(tier);
  let art;
  if (tier === 5) {
    art = [[20,11],[44,11],[32,24],[20,36],[44,36]].map(([x,y])=>star(x,y,7.7)).join('')+laurels(true);
  } else {
    art = Array.from({length:tier-5},(_,i)=>star(32+(i-(tier-6)/2)*19,53,tier===6?10:9,tier>=8)).join('')+laurels();
  }
  cache.set(tier,art);
  return art;
}
export const supremeRankBadge = tier => `<svg class="supreme-rank-badge" data-rank-symbol="${symbols[tier]}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${supremeRankSymbol(tier)}</svg>`;
