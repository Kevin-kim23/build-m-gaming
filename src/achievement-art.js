import { ACHIEVEMENTS } from "./achievements.js";
import { battleMedalSvg } from './battle-medal-art.js';

// Original 96 × 112 pixel medals, sharing a compact 18 × 21 CSS-pixel shelf slot.
const cache = new Map();
const palettes = [
  ["#30554b", "#83b69b", "#a86a40", "#edb77f"],
  ["#284b6c", "#91b6d2", "#859da6", "#e1ece8"],
  ["#80552d", "#dbb66b", "#b98c36", "#fff0aa"],
  ["#35496e", "#9bacd0", "#a6b7bf", "#f2f4e5"],
  ["#265a52", "#8ab8a0", "#b89449", "#fff0be"],
  ["#59395e", "#ba99c4", "#be9751", "#fff1b8"],
  ["#21566c", "#85bbcb", "#d2ab55", "#fff5c9"],
  ["#742f39", "#d79985", "#d5a43c", "#fff4bb"],
  ["#263568", "#aabce7", "#d8b15c", "#fff5d0"],
  ["#512454", "#d2afd9", "#d6c58a", "#fffbe3"],
  ["#243b59", "#b4d3e8", "#d6b96c", "#fff1bf"],
  ["#243e44", "#b2dedf", "#a8bdcd", "#f4fbff"],
  ["#37295b", "#b4abe9", "#b9d7e7", "#f0fcff"],
];

export function medalSvg(id) {
  if (cache.has(id)) return cache.get(id);
  const definition = ACHIEVEMENTS.find(item => item.id === id);
  if (!definition) throw new RangeError("Unknown achievement medal");
  if (definition.category === 'battle') {
  const svg = battleMedalSvg(definition.tier);
    cache.set(id, svg);
    return svg;
  }
  const tier = definition.tier;
  const [ribbon, stripe, metal, shine] = palettes[tier];
  const pixels = [];
  const r = (x,y,w,h,color) => pixels.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`);
  const octagon = (x,y,w,h,cut,color) => {
    r(x+cut,y,w-cut*2,h,color);
    r(x,y+cut,w,h-cut*2,color);
    r(x+cut/2,y+cut/2,w-cut,h-cut,color);
  };
  // Woven ribbon with folded lower corners, metal clasp and suspension ring.
  r(28,2,40,30,"#182925"); r(30,3,36,29,ribbon);
  r(30,32,36,3,ribbon); r(33,35,30,3,ribbon); r(38,38,20,3,ribbon);
  for (let x=32;x<65;x+=3) r(x,5,1,26,stripe);
  r(37,4,4,29,stripe); r(55,4,4,29,stripe);
  r(30,3,36,2,shine); r(30,30,36,3,"#17292655");
  r(28,1,40,3,metal); r(30,1,36,1,shine);
  r(38,35,20,3,metal); r(40,35,16,1,shine);
  octagon(42,38,12,13,4,"#25332d");
  octagon(43,38,10,11,2,metal); r(46,40,4,6,"#21372c"); r(44,39,2,6,shine);
  // Stepped rays and individually highlighted laurel leaves grow by award tier.
  if (tier>=3) {
    for(let n=0;n<4;n++) {
      const reach=19-n*3, y=56+n*5;
      r(24-reach,y,reach,4,metal); r(72,y,reach,4,metal);
      r(24-reach,y,reach,1,shine); r(72,y,reach,1,shine);
    }
    r(46,46,4,6,shine); r(46,100,4,6,metal);
  }
  if (tier>=4) {
    for(let n=0;n<5;n++) {
      const x=10+n*3,y=76+n*5;
      for(const leafX of [x,90-x]) {
        r(leafX,y,6,6,metal); r(leafX,y,4,2,shine);
        r(leafX+1,y+2,1,3,"#796131");
      }
    }
    r(31,102,34,3,metal);r(34,102,28,1,shine);
  }
  if(tier>=6) {
    r(4,50,4,8,shine);r(1,53,10,2,shine);
    r(88,50,4,8,shine);r(85,53,10,2,shine);
  }
  // Faceted metal rim, recessed enamel and a distinct central command emblem.
  octagon(20,49,56,54,16,"#182d26");
  octagon(22,49,52,52,14,metal);
  octagon(25,51,46,47,12,shine);
  octagon(28,54,40,42,10,metal);
  octagon(31,57,34,36,8,"#574f35");
  octagon(33,58,30,32,8,ribbon);
  r(38,59,20,2,stripe);r(34,65,2,18,stripe);
  r(42,96,15,2,"#71532f");r(23,67,2,14,shine);
  r(68,69,2,15,"#6d5838");
  for(let n=0;n<4;n++) {
    r(34+n*8,54,2,2,"#fff6d4"); r(34+n*8,93,2,2,metal);
  }
  if(tier<3) {
    for(let n=0;n<=tier;n++) {
      const y=68+n*5;
      r(39,y,18,3,metal);r(40,y,16,1,shine);
    }
  } else {
    r(46,64,4,22,shine);r(38,70,20,5,shine);
    r(41,75,14,5,metal);r(40,80,5,4,shine);r(51,80,5,4,shine);
    r(45,72,6,6,metal);r(46,72,3,3,"#fff9dc");
    if(tier>=5){r(46,73,4,4,stripe);r(46,73,2,1,"#e9faff");}
  }
  if(tier>=7) {
    r(36,15,24,4,metal);r(38,19,20,3,shine);
    for(const x of [37,46,55]){r(x,11,3,6,shine);r(x+1,10,1,1,"#fff9dc");}
    r(44,105,8,4,metal);r(46,105,4,6,shine);
  }
  if(tier>=8) {
    const ribbonStars=tier===12?4:tier-3;
    for(let i=0;i<ribbonStars;i++){const x=tier===12?36+i*8:33+i*5;r(x,23,1,5,shine);r(x-1,25,3,1,shine);}
    for(const x of [14,77]){r(x,61,5,22,metal);r(x+1,61,1,22,shine);r(x-2,61,9,2,shine);}
    r(39,83,18,3,shine);r(42,86,12,2,metal);
    if(tier===9){r(44,67,8,10,'#8ecbd5');r(45,68,3,3,'#e7fcff');r(41,16,15,2,shine);}
    if(tier>=10){
      r(37,68,22,16,metal);r(39,70,18,12,ribbon);r(42,64,12,20,shine);
      for(const x of [39,53])for(const y of [73,78])r(x,y,4,2,stripe);
      r(46,76,4,8,ribbon);r(35,85,26,2,shine);
      if(tier===11){r(45,58,6,6,shine);r(33,88,30,2,metal);r(35,90,26,1,shine);}
      if(tier===12){
        // Silver orbital halo, violet enamel and four radiant command stars.
        pixels.push('<g data-galactic-emblem="true">');
        octagon(32,58,32,36,8,ribbon);
        for(let n=0;n<28;n++){
          const a=n*Math.PI*2/28,x=Math.round(48+16*Math.cos(a)),y=Math.round(76+10*Math.sin(a));
          r(x-1,y-1,3,2,n<14?metal:shine);
        }
        octagon(40,67,16,18,5,metal);octagon(42,69,12,14,4,'#759fbb');
        r(43,70,4,3,'#d8ffff');r(46,77,7,3,'#486882');r(46,71,2,13,shine);
        for(const [x,y] of [[48,59],[33,76],[63,76],[48,91]]){
          r(x-1,y-3,2,7,shine);r(x-3,y-1,6,2,shine);
        }
        pixels.push('</g>');
      }
    }
  }
  const svg = `<svg class="achievement-medal-svg" viewBox="0 0 96 112" aria-hidden="true" focusable="false" shape-rendering="crispEdges">${pixels.join("")}</svg>`;
  cache.set(id,svg);
  return svg;
}
