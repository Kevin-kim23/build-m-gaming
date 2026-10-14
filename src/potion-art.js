import {POTIONS,isPotion} from './potions.js';

const cache=new Map();
// Original energy cartridges: a lightning core and a time core, never medical emblems.
// Keep inventory IDs and the existing view box so saved items and all icon slots remain compatible.
export function potionIcon(id) {
  if(!isPotion(id))throw new RangeError('Unknown potion');
  if(cache.has(id))return cache.get(id);
  const touch=id==='red';
  const [deep,mid,light,shine]=touch?['#742f29','#d9653c','#ffac62','#ffe5b0']:['#15465a','#24879b','#65dce5','#c6ffff'];
  const parts=[];
  const r=(x,y,w,h,c)=>parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`);
  const p=(d,c)=>parts.push(`<path d="${d}" fill="${c}"/>`);
  r(12,73,42,3,'#0a1921');r(18,76,30,2,'#10232b');
  // Connector cap, layered steel housing and brass retaining clips.
  r(23,3,20,4,'#172732');r(21,7,24,7,'#344955');r(25,4,16,2,'#adb6ac');
  r(24,8,18,3,'#728c92');r(26,8,2,3,'#d1e1da');r(38,8,2,3,'#d1e1da');
  r(17,14,32,4,'#172732');r(13,18,40,6,'#1c303b');r(11,24,44,39,'#142630');
  r(14,63,38,9,'#1b303a');r(18,71,30,4,'#12222a');
  r(18,17,30,4,'#607983');r(15,22,37,38,'#445e68');r(16,60,34,9,'#3f5963');
  r(17,22,3,38,'#9eb9bb');r(47,24,4,37,'#2b424d');r(20,18,26,2,'#bdcebd');
  r(14,28,3,10,'#d4ac66');r(13,30,2,6,'#fff0b4');r(49,48,4,11,'#946c3c');
  r(50,50,2,6,'#e2b56d');r(16,65,7,3,'#b98e54');r(42,65,7,3,'#81613c');
  // Recessed core is bright, but the frame stays neutral in both variants.
  r(21,24,25,37,'#0b1e27');r(23,26,21,33,deep);r(25,27,17,30,mid);
  r(25,27,17,3,light);r(25,31,3,21,light);r(40,31,2,23,deep);r(28,55,11,2,light);
  r(23,23,20,2,'#c8dccf');r(24,60,20,2,'#829d9f');
  if(touch){
    // Offset lightning bolt on the energy cell; no cross-shaped label.
    p('M34 31h7l-6 10h6L28 54l4-11h-6z','#632b26');
    p('M33 30h7l-6 10h6L28 52l4-11h-6z',shine);
    r(35,31,3,2,'#fff9db');
  }else{
    // A narrow hourglass gives the passive-income item a distinct silhouette inside the core.
    r(29,31,10,3,'#0e4756');r(29,49,10,3,'#0e4756');
    p('M28 31h11v3h-2v4l-3 4 3 4v3h2v3H28v-3h2v-3l3-4-3-4v-4h-2z',shine);
    p('M32 34h4v3l-2 3-2-3z',deep);p('M34 44l3 5h-6z',light);
  }
  // Side vents, screw heads and a small charge meter survive small rendering sizes.
  for(const y of [42,47,52])r(13,y,4,2,'#0b1d25');
  r(18,24,2,2,'#e2e5cd');r(18,59,2,2,'#d2dcce');r(47,24,2,2,'#94aaab');
  r(25,66,16,4,'#142f36');r(26,67,4,2,light);r(32,67,3,2,light);r(37,67,3,2,shine);
  r(23,72,20,1,'#789195');r(21,10,2,3,'#c7b277');r(43,10,2,3,'#977548');
  const svg=`<svg viewBox="0 0 66 80" role="img" aria-label="${POTIONS[id].name} 에너지 카트리지" shape-rendering="crispEdges">${parts.join('')}</svg>`;
  cache.set(id,svg);return svg;
}
