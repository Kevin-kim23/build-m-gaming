import { artLevel, personalLustre } from './personal-lustre.js';
// Original pixel geometry: naval instrument, tactical slate and ceremonial command seal.
// No historical insignia, manufacturer marks, external bitmaps or SVG filters.
const cache=new Map();
const names={compass:'제독의 나침반',tablet:'전략 지휘패',seal:'총사령관 인장'};
const gold=['#4b351c','#846135','#bf904b','#e2b66c','#ffe6a5'];
export function latePersonalIcon(kind,level=1) {
  level=artLevel(level);
  if(!names[kind])throw new RangeError('Unknown late personal icon');
  const key=`${kind}:${level}`;
  if(cache.has(key))return cache.get(key);
  const p=[],rect=(x,y,w,h,c)=>p.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`);
  const poly=(points,c)=>p.push(`<polygon points="${points}" fill="${c}"/>`);
  const ring=(x,y,w,h)=>{
    rect(x,y,w,h,gold[0]);rect(x+2,y+1,w-4,h-3,gold[1]);rect(x+4,y+2,w-8,h-6,gold[3]);
    rect(x+5,y+3,w-10,2,gold[4]);rect(x+6,y+h-5,w-12,2,gold[2]);
  };
  const rivet=(x,y)=>{rect(x,y,5,5,gold[0]);rect(x,y,4,3,gold[3]);rect(x+1,y,2,1,gold[4]);};
  const gem=(x,y)=>{poly(`${x+4},${y} ${x+9},${y+4} ${x+5},${y+10} ${x},${y+5}`,'#17655d');poly(`${x+4},${y+1} ${x+7},${y+4} ${x+3},${y+5}`,'#baffdf');};
  rect(34,235,126,7,'#091c22');rect(42,232,108,4,'#25434b');rect(49,231,94,1,'#598189');
  if(kind==='compass') {
    // Hinged brass housing, faceted glass and a red-white navigation needle.
    ring(61,28,71,10);ring(72,19,49,10);ring(82,10,28,9);rect(89,13,13,7,'#102b31');
    poly('60,44 132,44 155,67 166,96 166,172 145,202 121,218 71,218 42,198 27,171 27,94 39,63',gold[0]);
    poly('60,48 130,48 151,69 162,98 162,169 141,198 120,213 72,213 46,194 31,169 31,96 42,67',gold[2]);
    poly('62,53 128,53 147,72 155,100 155,168 137,193 118,207 73,207 51,189 38,167 38,98 48,71',gold[4]);
    poly('65,60 124,60 141,77 148,102 148,165 132,187 115,199 76,199 56,183 45,164 45,101 55,77','#21363b');
    poly('67,66 122,66 135,81 142,104 142,162 127,181 112,193 79,193 61,178 52,160 52,104 61,82','#9ead96');
    poly('71,72 119,72 130,86 136,107 136,158 123,175 110,185 82,185 67,173 58,157 58,107 66,86','#d7dbb3');
    for(let i=0;i<16;i++){
      const a=i*Math.PI/8,x=Math.round(97+35*Math.sin(a)),y=Math.round(129-49*Math.cos(a));
      rect(x-1,y-2,2,i%4?4:8,'#43564e');
    }
    poly('97,85 105,119 128,130 106,138 97,174 90,140 66,130 88,120',gold[1]);
    poly('97,89 97,130 89,119','#b4483c');poly('97,89 106,120 97,130','#ee8b63');
    poly('97,171 97,130 105,140','#3d5961');poly('97,171 88,140 97,130','#edf0d2');
    ring(91,124,13,13);gem(93,126);
    for(const [x,y] of [[59,58],[125,58],[38,116],[147,116],[56,191],[130,188]])rivet(x,y);
    rect(52,85,2,39,'#f6ffeb');rect(54,87,2,17,'#ffffeb');rect(135,143,2,21,'#eff9e2');
    ring(64,217,67,7);rect(84,224,28,6,gold[1]);
    if(level>=3){ring(78,48,37,8);gem(92,47);}
    if(level>=5){ring(60,199,73,7);gem(92,199);}
    if(level>=7){rect(27,91,2,82,'#c7f5e5');rect(163,91,2,82,'#c7f5e5');}
    if(level>=9){gem(44,128);gem(142,128);}
  } else if(kind==='tablet') {
    // Raised alloy case around a pixel map, with original fictional tactical markings.
    poly('48,28 143,28 156,43 156,209 142,224 49,224 35,209 35,43','#10252d');
    poly('50,31 140,31 151,44 151,207 139,218 51,218 40,207 40,45','#45636b');
    rect(47,41,98,162,'#1d3941');rect(50,44,92,155,'#091e27');
    rect(55,50,81,142,'#204853');rect(58,53,75,136,'#0e303f');
    for(let x=60;x<133;x+=9)rect(x,57,1,125,'#214e56');
    for(let y=58;y<184;y+=9)rect(60,y,70,1,'#214e56');
    poly('60,78 72,73 80,88 76,97 88,112 80,130 85,145 70,164 60,160','#375f52');
    poly('126,64 116,73 119,90 108,103 116,112 107,128 121,145 131,142 131,65','#416957');
    rect(85,59,35,4,'#8cc6bf');rect(88,68,25,2,'#558d89');
    for(const [x,y] of [[71,86],[105,108],[90,141],[120,156]]){
      rect(x-2,y-2,9,9,'#092c36');rect(x,y,5,5,'#80e2ca');rect(x+1,y+1,2,2,'#e7ffd9');
    }
    rect(75,91,2,16,'#dfbb70');rect(76,107,30,2,'#dfbb70');rect(103,112,2,30,'#dfbb70');rect(93,140,12,2,'#dfbb70');
    rect(62,174,24,4,'#9accc7');rect(93,174,33,4,'#4c8c93');rect(62,181,18,2,'#456c79');
    ring(65,35,62,7);ring(66,203,62,9);rect(84,205,25,3,'#405c58');
    for(const [x,y]of [[42,38],[143,38],[42,206],[143,206]])rivet(x,y);
    rect(35,59,4,24,'#749695');rect(153,99,5,31,'#294751');rect(155,101,2,17,'#719b9c');
    rect(48,52,2,123,'#799e9f');rect(138,51,2,121,'#17313a');
    ring(63,220,67,7);
    if(level>=3){ring(40,91,7,61);ring(144,91,7,61);}
    if(level>=5){gem(92,33);gem(92,202);}
    if(level>=7){rect(54,49,1,142,'#afffea');rect(135,49,1,142,'#91e0db');}
    if(level>=9){ring(37,30,11,9);ring(143,30,11,9);}
  } else {
    // Tiered jade handle and engraved red-gold seal base, presented in three-quarter view.
    poly('45,199 68,186 148,186 163,203 146,225 53,225 34,210','#161925');
    poly('46,193 64,181 146,181 160,197 141,215 49,215 35,202',gold[0]);
    poly('47,188 65,177 144,177 158,191 140,207 50,207 35,196',gold[3]);
    rect(49,193,91,13,'#812f32');rect(49,195,91,3,'#b04b44');rect(53,199,83,2,'#d38260');
    for(let x=58;x<136;x+=13){rect(x,201,6,4,gold[1]);rect(x,201,5,1,gold[4]);}
    poly('53,178 71,162 132,162 150,178 134,192 62,192',gold[1]);
    poly('58,176 75,166 130,166 143,177 130,186 68,186',gold[4]);
    rect(68,151,66,21,gold[0]);rect(72,150,58,21,gold[2]);rect(75,153,50,4,gold[4]);
    // Faceted jade tower, protected by chased brass corner columns.
    poly('78,74 111,64 126,81 124,143 112,157 82,151 70,134 71,92','#103c35');
    poly('80,78 107,70 114,88 112,146 83,143 77,130','#28776a');
    poly('109,70 120,81 119,137 113,148 114,90','#154b43');
    poly('81,81 89,78 89,135 82,137','#70b09a');rect(85,84,3,45,'#b5dec2');
    ring(69,137,62,11);ring(72,83,54,8);ring(73,68,51,10);
    poly('77,63 82,44 92,48 98,31 105,48 117,42 121,65',gold[1]);
    poly('81,63 86,48 93,54 98,38 104,54 114,48 117,63',gold[3]);
    rect(79,61,41,4,gold[4]);gem(94,61);gem(94,153);
    for(const [x,y] of [[73,86],[119,86],[71,140],[120,140]])rivet(x,y);
    rect(63,172,8,11,gold[0]);rect(65,173,4,7,gold[2]);rect(131,171,6,10,gold[0]);
    if(level>=3){ring(76,110,48,7);gem(93,108);}
    if(level>=5){ring(55,180,86,5);gem(91,177);}
    if(level>=7){rect(72,92,2,42,'#f5e5a4');rect(124,92,2,42,'#c6ead4');}
    if(level>=9){gem(77,45);gem(111,43);ring(53,207,86,4);}
  }
  // A distinct row of engraving advances on every level, including intermediate steps.
  for(let i=0;i<level;i++){const x=64+(i%10)*7,y=229+Math.floor(i/10)*5;rect(x,y,5,2,gold[i%2?3:2]);if(level>=6)rect(x+1,y-2,3,1,'#d3ffdf');}
  const svg=`<svg class="command-baton-art late-personal-art" viewBox="0 0 192 256" role="img" aria-label="${names[kind]} Lv.${level} 정밀 픽셀 그림" shape-rendering="crispEdges">${personalLustre(kind,level)}${p.join('')}</svg>`;
  cache.set(key,svg);return svg;
}
