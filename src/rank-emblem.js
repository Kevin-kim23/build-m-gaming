// Original insignia geometry, shared by the tiny badge and promotion ceremony.
const cache = new Map();
const symbols = {5:'junior-marshal',6:'minor-marshal',7:'middle-marshal',8:'grand-marshal',9:'special-marshal',10:'deputy-commander'};
function star(x, y, radius, white = false) {
  const points = Array.from({length:10}, (_, i) => {
    const angle = -Math.PI/2 + i*Math.PI/5, r = i%2 ? radius*.44 : radius;
    return `${(x+Math.cos(angle)*r).toFixed(2)},${(y+Math.sin(angle)*r).toFixed(2)}`;
  }).join(' ');
  const facets = white ? Array.from({length:5}, (_, i) => {
    const angle = -Math.PI/2 + i*Math.PI*2/5;
    const tip = `${(x+Math.cos(angle)*radius).toFixed(2)} ${(y+Math.sin(angle)*radius).toFixed(2)}`;
    const inside = `${(x+Math.cos(angle+Math.PI/5)*radius*.44).toFixed(2)} ${(y+Math.sin(angle+Math.PI/5)*radius*.44).toFixed(2)}`;
    return `<path d="M${x} ${y}L${tip} ${inside}Z" fill="${i<2?'#d6e2ec':'#9cadbe'}"/>`;
  }).join('') : '';
  return `<polygon data-rank-star data-metal="${white?'white':'gold'}" points="${points}" fill="${white?'#ffffff':'#f3e4ac'}" stroke="${white?'#bccbd2':'#b19450'}" stroke-width=".8"/>${facets}`;
}
export function supremeRankSymbol(tier) {
  if (!Number.isInteger(tier) || !Object.hasOwn(symbols,tier)) throw new RangeError('Unknown supreme rank');
  if (cache.has(tier)) return cache.get(tier);
  let art;
  if (tier === 5) {
    art = [[15,15],[49,15],[32,32],[15,49],[49,49]].map(([x,y])=>star(x,y,10)).join('');
  } else {
    const count=tier-5, gap=count===5?12:count===2?30:count===4?16:21, radius=count===5?6:count===1?19:count===2?14:count===4?8:10;
    art = Array.from({length:count},(_,i)=>star(32+(i-(count-1)/2)*gap,32,radius,true)).join('');
  }
  cache.set(tier,art);
  return art;
}
export const supremeRankBadge = tier => `<svg class="supreme-rank-badge" data-rank-symbol="${symbols[tier]}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${supremeRankSymbol(tier)}</svg>`;
