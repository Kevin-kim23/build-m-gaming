import { artLevel, personalLustre } from './personal-lustre.js';
// Original ceremonial pixel art; reused by the personal equipment catalogue.
const cache = new Map();
export function generalRewardIcon(kind, level = 1) {
  level=artLevel(level);
  const key = `${kind}:${level}`;
  if (cache.has(key)) return cache.get(key);
  const p = [], r = (x,y,w,h,c) => p.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`);
  const gold = '#d4ac58', light = '#fff0b7', shade = '#8d612e';
  const star = (x,y) => { r(x+4,y,3,11,light);r(x,y+4,11,3,gold);r(x+3,y+3,5,5,light); };
  if(kind==='flag'){r(36,239,121,5,'#10221b');r(43,235,107,4,'#647057');}
  if (kind === 'flag') {
    // Sculpted spear, brass pole, deep blue cloth with a folded fly and gold fringe.
    r(38,28,8,204,shade);r(40,28,3,204,light);r(43,30,2,202,gold);
    r(37,19,10,12,gold);r(39,11,6,14,light);r(41,6,2,10,light);
    r(46,37,105,138,'#182737');r(151,41,12,130,'#14212d');r(163,46,10,119,'#0d1927');
    r(49,39,5,131,gold);r(53,40,96,5,gold);r(52,161,99,10,shade);
    r(58,47,26,111,'#284966');r(84,46,22,114,'#203b54');r(106,46,24,114,'#1a3147');
    r(130,46,16,115,'#233e52');r(62,48,3,111,'#355c76');r(87,47,2,113,'#31506a');
    r(146,48,3,111,shade);r(153,46,2,117,gold);r(166,49,2,110,shade);
    for(let x=51;x<170;x+=5){r(x,166,2,11+(x%3)*2,gold);r(x,166,1,7,light);}
    // Laurel, shield and rank stars, deliberately without a real military emblem.
    r(87,82,31,40,shade);r(90,79,25,39,gold);r(94,83,17,30,'#31545b');
    r(95,85,2,20,'#79ada7');r(96,115,13,7,gold);star(97,92);
    for(let i=0;i<5;i++){r(73-i%2*3,91+i*7,8,4,gold);r(123+i%2*3,91+i*7,8,4,gold);}
    r(79,127,49,3,gold);r(84,130,39,2,light);star(87,62);star(110,62);
    r(34,39,4,85,'#bd333c');r(31,41,2,77,'#f2816b');r(29,120,11,7,gold);
    for(let i=0;i<6;i++)r(28+i*2,127,1,30-i%3*3,'#cb4e43');
    if(level>=2){r(51,44,95,2,light);r(51,159,96,2,light);star(97,137);star(18,64);star(167,190);r(36,185,11,7,gold);}
    // Each paid level adds embroidery; later tiers add metal mounts.
    for(let i=2;i<Math.min(level,10);i++){const x=62+(i-2)*11;r(x,151,7,4,gold);r(x,151,7,1,light);}
    if(level>=4){r(48,35,102,3,gold);r(49,35,100,1,light);}
    if(level>=6){r(34,195,13,8,gold);r(35,196,3,6,light);star(97,47);}
    if(level>=8){r(32,217,17,7,gold);r(33,217,15,2,light);r(155,56,3,101,light);}
    if(level>=10){star(59,135);star(134,135);r(90,82,25,2,light);}
    r(33,228,18,7,shade);r(32,229,20,3,gold);
  } else {
    // Landscape silhouette: long barrel, compact cylinder, short angled walnut grip.
    r(22,61,191,25,'#132631');r(25,59,177,6,'#7598a3');r(27,59,173,2,'#e0e8de');
    r(27,67,174,12,'#456472');r(27,68,114,3,'#abc8cd');r(27,79,119,3,'#233f4d');
    r(20,64,6,19,shade);r(21,65,2,16,gold);r(24,65,2,5,light);
    r(39,54,9,6,'#b2c7c8');r(190,55,11,5,'#a1b9ba');r(205,61,13,16,'#334e5d');
    r(145,76,52,35,'#1b303b');r(149,77,42,29,'#77929b');r(149,77,41,3,'#dce5df');
    for(let x=152;x<190;x+=8){r(x,83,5,20,'#425f6c');r(x,83,2,18,'#a5bdc0');r(x+4,85,1,15,'#243d4c');}
    r(146,106,49,5,shade);r(147,106,47,2,gold);r(192,80,23,31,shade);r(195,81,17,27,gold);r(195,81,16,2,light);
    r(191,68,7,13,'#31505e');r(192,65,13,5,'#b3c7c6');r(201,62,16,5,'#718d96');
    r(160,111,36,5,gold);r(158,115,5,16,shade);r(161,129,34,5,gold);r(194,113,5,18,shade);
    r(174,114,3,10,'#c9d4ca');r(177,123,6,3,'#839ca2');
    r(198,109,14,17,'#533c2d');r(194,122,22,17,'#7c5034');r(187,135,31,21,'#4a3128');
    r(191,135,22,19,'#9d6e44');r(198,130,11,20,'#784c31');r(185,154,34,6,shade);r(186,154,32,2,gold);
    for(let y=127;y<153;y+=4){r(197-(y>139?4:0),y,13,1,'#d6a565');r(211,y,1,2,'#553b2e');}
    star(197,91);r(200,143,5,4,gold);r(201,143,2,1,light);
    for(let x=49;x<137;x+=9){r(x,76,5,1,gold);r(x+2,74,1,5,shade);r(x+1,74,1,1,light);}
    for(let x=35;x<188;x+=8){r(x,63,1,1,light);r(x,81,1,1,'#173440');}
    for(let y=85;y<105;y+=5){r(209,y,1,2,shade);r(196,y,1,1,light);}
    r(41,83,89,3,shade);r(43,83,85,1,gold);star(31,100);star(224,47);
    r(34,174,194,4,'#10221b');r(42,172,178,2,'#647057');
    for(let i=1;i<Math.min(level,10);i++){const x=49+(i-1)*10;r(x,67,6,3,gold);r(x,67,5,1,light);}
    if(level>=3){r(187,133,4,19,gold);r(188,134,2,17,light);}
    if(level>=5){r(144,75,49,3,gold);r(146,76,44,1,light);star(170,88);}
    if(level>=7){r(32,57,105,2,light);r(34,83,102,2,'#c0efdf');star(202,134);}
    if(level>=9){r(195,79,20,3,'#ddffed');r(199,115,5,15,gold);}
    if(level>=10){r(24,60,175,2,'#effff2');star(123,90);r(183,155,38,3,light);}
  }
  const svg = `<svg class="command-baton-art general-reward-art" viewBox="0 0 ${kind==='flag'?'192 256':'256 192'}" role="img" aria-label="${kind==='flag'?'사단기':'장군 리볼버'} 정밀 픽셀 그림" shape-rendering="crispEdges">${personalLustre(kind,level)}${p.join('')}</svg>`;
  cache.set(key,svg);return svg;
}
