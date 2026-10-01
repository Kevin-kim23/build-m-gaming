import {artLevel,personalLustre} from './personal-lustre.js';
const cache=new Map();
// Original ceremonial crescent blade, engraved ferrule, long lacquered shaft and tassel.
export function glaiveIcon(value=1) {
  const level=artLevel(value);if(cache.has(level))return cache.get(level);
  const p=[],r=(x,y,w,h,c)=>p.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`);
  const gold='#cfaa57',light='#f9e3a0',dark='#5b4529',jade=level>=6?'#9cf1dd':'#489984';
  r(41,243,113,4,'#14251e');r(52,241,92,2,'#5b7057');
  r(88,83,13,154,'#13242b');r(91,86,8,149,'#294b46');r(91,87,2,147,'#577b68');r(98,86,2,148,'#102c30');
  for(let y=127;y<228;y+=5){r(92,y,6,1,'#172f35');r(93,y,3,.6,'#769481');}
  for(const y of [91,116,174,226]){r(85,y,18,7,dark);r(86,y,16,5,gold);r(87,y,13,1,light);r(89,y+3,2,2,'#967842');}
  // Stepped curved edge; no borrowed logos or historical unit insignia.
  p.push('<path d="M96 91V51h10V34h13V20h17V9h5v25h-4v16h-7v13h-8v10h-9v9h-8v9Z" fill="#23353e"/>');
  p.push('<path d="M100 80V52h10V36h13V22h14v13h-4v15h-7v12h-8v9h-9v9Z" fill="#8caeab"/>');
  p.push('<path d="M106 69V53h9V38h12V26h8v10h-5v15h-7v11h-9v7Z" fill="#c8d9c9"/>');
  p.push('<path d="M137 17h2v17h-4v15h-7v13h-8v9h-9v8h-8v-3h7v-8h8v-9h7V47h7V32h5Z" fill="#eff6de"/>');
  for(let i=0;i<8;i++){r(107+i*2,53-i*3,1,7,'#617f84');r(111+i*2,51-i*3,.7,3,'#f5f5d9');}
  r(87,58,16,36,dark);r(89,59,12,32,gold);r(90,60,2,31,light);
  for(let y=62;y<91;y+=4){r(94,y,6,2,'#9c773a');r(95,y,3,1,light);}
  r(91,70,11,14,dark);r(93,71,8,11,jade);r(94,71,2,5,'#c6f8d8');r(98,77,2,4,'#214e4b');
  r(102,85,13,5,gold);r(105,89,9,9,'#9d2d38');r(109,97,2,42,'#7b2834');
  for(let i=0;i<7;i++){r(108+i,109,1,39-(i%3)*4,i%2?'#d95d4d':'#a5363d');}
  r(86,235,16,4,gold);r(89,239,10,2,light);
  for(let i=1;i<level;i++){
    const y=123+i*10;r(87,y,16,4,dark);r(88,y,14,2,gold);r(89,y,3,1,light);
    r(93,y-3,5,5,jade);r(94,y-3,2,2,'#efffe2');
  }
  if(level>=3){r(85,100,3,48,gold);r(86,101,1,45,light);}
  if(level>=5){r(91,35,7,26,dark);r(92,36,5,22,gold);r(92,35,5,2,light);}
  if(level>=7){r(84,86,22,3,light);r(101,99,2,124,'#b0eee0');}
  if(level>=9){r(86,227,20,3,light);r(83,58,3,28,gold);r(84,58,1,25,light);}
  if(level===10){r(105,75,4,7,'#dcffdf');r(103,77,8,2,light);r(100,51,2,22,light);}
  const svg=`<svg class="command-baton-art glaive-art" viewBox="0 0 192 256" role="img" aria-label="언월도 정밀 픽셀 그림" shape-rendering="crispEdges">${personalLustre('glaive',level)}${p.join('')}</svg>`;
  cache.set(level,svg);return svg;
}
