// Original ceremonial pixel art; reused by the personal equipment catalogue.
const cache = new Map();
export function generalRewardIcon(kind, level = 1) {
  const key = `${kind}:${level}`;
  if (cache.has(key)) return cache.get(key);
  const p = [], r = (x,y,w,h,c) => p.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`);
  const gold = '#d4ac58', light = '#fff0b7', shade = '#8d612e';
  const star = (x,y) => { r(x+4,y,3,11,light);r(x,y+4,11,3,gold);r(x+3,y+3,5,5,light); };
  r(36,239,121,5,'#10221b');r(43,235,107,4,'#647057');
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
    r(33,228,18,7,shade);r(32,229,20,3,gold);
  } else {
    // Long polished barrel, fluted cylinder, engraved frame and walnut grip.
    r(24,69,138,25,'#111b25');r(26,67,123,7,'#6d8791');r(27,69,119,3,'#d0e0dd');
    r(27,76,126,12,'#3d5664');r(29,77,108,3,'#849eaa');r(144,75,20,18,'#263b4a');
    r(155,68,8,5,'#c2d0ce');r(24,73,6,20,shade);r(25,75,2,13,gold);
    r(86,88,52,47,'#172732');r(91,88,44,39,'#71868c');r(94,90,39,5,'#dce7df');
    r(98,96,35,32,'#425b66');r(101,98,3,25,'#9db2b7');r(110,98,3,25,'#293e4c');r(119,98,3,25,'#a0b6bc');
    r(91,127,46,8,shade);r(91,127,46,3,gold);r(137,95,19,41,shade);r(139,97,14,36,gold);
    r(136,83,11,14,'#263f4d');r(135,79,8,7,'#92a6aa');r(142,81,15,5,'#b3c5c7');
    r(108,137,32,8,gold);r(106,141,6,22,gold);r(109,161,36,6,shade);r(143,143,6,20,gold);
    r(120,137,4,14,'#b9c4bd');r(124,149,6,5,'#839898');
    r(140,131,18,25,'#4c3028');r(135,152,29,24,'#704331');r(125,173,38,43,'#442b26');
    r(130,174,27,39,'#915b3b');r(134,178,17,31,'#77452d');r(127,204,5,12,'#b3764c');
    for(let y=161;y<210;y+=6){r(139-(y>175?4:0),y,14,2,'#b57c4e');r(144,y,5,1,'#d2a16b');}
    r(124,215,37,7,shade);r(124,215,36,3,gold);star(139,119);
    for(let x=46;x<86;x+=9){r(x,84,5,2,gold);r(x+2,81,2,7,shade);}
    for(let x=37;x<132;x+=8){r(x,71,1,1,light);r(x,86,1,1,'#19333d');}
    for(let y=102;y<124;y+=5){r(140,y,2,2,light);r(150,y,1,2,shade);}
    r(57,94,28,3,shade);r(60,94,21,1,light);star(34,118);star(159,40);
  }
  const svg = `<svg class="command-baton-art general-reward-art" viewBox="0 0 192 256" role="img" aria-label="${kind==='flag'?'사단기':'장군 리볼버'} 정밀 픽셀 그림" shape-rendering="crispEdges">${p.join('')}</svg>`;
  cache.set(key,svg);return svg;
}
