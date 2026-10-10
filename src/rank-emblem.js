// Original insignia geometry, shared by the tiny badge and promotion ceremony.
const cache = new Map();
const symbols = {5:'junior-marshal',6:'minor-marshal',7:'middle-marshal',8:'grand-marshal',9:'special-marshal',10:'deputy-commander',
  11:'galactic-brigadier',12:'galactic-major-general',13:'galactic-lieutenant-general',14:'galactic-general',15:'galactic-marshal',16:'constellation-brigadier',17:'constellation-major',18:'constellation-lieutenant',19:'constellation-general',20:'constellation-marshal'};
function star(x, y, radius, metal = 'gold') {
  const white = metal === 'white', copper = metal === 'copper-gold';
  const points = Array.from({length:10}, (_, i) => {
    const angle = -Math.PI/2 + i*Math.PI/5, r = i%2 ? radius*.44 : radius;
    return `${(x+Math.cos(angle)*r).toFixed(2)},${(y+Math.sin(angle)*r).toFixed(2)}`;
  }).join(' ');
  const facets = white || copper ? Array.from({length:5}, (_, i) => {
    const angle = -Math.PI/2 + i*Math.PI*2/5;
    const tip = `${(x+Math.cos(angle)*radius).toFixed(2)} ${(y+Math.sin(angle)*radius).toFixed(2)}`;
    const inside = `${(x+Math.cos(angle+Math.PI/5)*radius*.44).toFixed(2)} ${(y+Math.sin(angle+Math.PI/5)*radius*.44).toFixed(2)}`;
    return `<path d="M${x} ${y}L${tip} ${inside}Z" fill="${copper ? (i<2?'#ffdb9e':'#9b5432') : (i<2?'#d6e2ec':'#9cadbe')}"/>`;
  }).join('') : '';
  return `<polygon data-rank-star data-metal="${metal}" points="${points}" fill="${copper?'#dda365':white?'#ffffff':'#f3e4ac'}" stroke="${copper?'#ffe0a4':white?'#bccbd2':'#b19450'}" stroke-width=".8"/>${facets}`;
}
export function supremeRankSymbol(tier) {
  if (!Number.isInteger(tier) || !Object.hasOwn(symbols,tier)) throw new RangeError('Unknown supreme rank');
  if (cache.has(tier)) return cache.get(tier);
  let art;
  if (tier === 5) {
    art = [[15,15],[49,15],[32,32],[15,49],[49,49]].map(([x,y])=>star(x,y,10)).join('');
  } else {
    const count=tier>15?tier-15:tier>10?tier-10:tier-5, gap=count===5?12:count===2?30:count===4?16:21, radius=count===5?6:count===1?19:count===2?14:count===4?8:10;
    if(tier>15){
      const positions=count===5?[[14,19],[32,19],[50,19],[23,43],[41,43]]:count===4?[[18,19],[46,19],[18,45],[46,45]]:count===3?[[32,17],[17,43],[47,43]]:count===2?[[17,32],[47,32]]:[[32,32]];
      art=positions.map(([x,y])=>star(x,y,count===1?21:count===2?14:count===3?12:count===4?11:9,'white')).join('');
    }else art = Array.from({length:count},(_,i)=>star(32+(i-(count-1)/2)*gap,32,radius,tier>15?'white':tier>10?'copper-gold':'white')).join('');
  }
  if(tier>15)art=art.replaceAll('data-metal="white"','data-metal="ruby"').replaceAll('#ffffff','#d93650').replaceAll('#bccbd2','#f6a3ad').replaceAll('#d6e2ec','#ff8a99').replaceAll('#9cadbe','#790d28');
  cache.set(tier,art);
  return art;
}
export const supremeRankBadge = tier => `<svg class="supreme-rank-badge" data-rank-symbol="${symbols[tier]}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${supremeRankSymbol(tier)}</svg>`;
