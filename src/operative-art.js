// Original geometric pixel portraits. No external assets, emblems, or fonts.
import { OPERATIVES } from './loot.js';
const cache=new Map();
export const lootIcon=()=>'<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m3 10 13-6 13 6v15l-13 5-13-5z" fill="#947046"/><path d="m3 10 13 5 13-5-13-6z" fill="#e6c481"/><path d="M16 15v15l13-5V10z" fill="#b58e51"/><path d="m10 7 13 5v15l-4 1V14L7 9z" fill="#455d64"/><path d="M8 18h4v5H8z" fill="#ffe2a0"/></svg>';
export function operativeIcon(id) {
  if(cache.has(id))return cache.get(id);
  const o=OPERATIVES.find(o=>o.id===id);
  if(!o)throw new RangeError('Unknown operative');
  let shapes='';
  const r=(x,y,w,h,c)=>{shapes+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;};
  const dark=id==='operative'?'#252c3c':id==='scout'?'#314f43':'#354c59';
  r(12,71,42,4,'#101d2455');r(19,57,10,13,'#263641');r(35,57,10,13,'#263641');
  r(17,68,13,5,'#14242d');r(34,68,14,5,'#14242d');r(20,58,2,8,'#5a6f74');r(36,58,2,8,'#5a6f74');
  r(15,33,34,27,dark);r(18,34,28,23,'#57717a');r(18,34,6,23,'#70888b');r(43,36,5,22,dark);
  r(12,35,7,21,dark);r(46,35,7,21,dark);r(12,35,3,15,o.color);r(47,36,3,15,'#677e82');
  r(12,55,6,6,'#c99b78');r(47,55,6,6,'#c99b78');r(16,56,32,4,'#21353e');r(29,56,7,4,'#bca16a');
  r(24,14,18,18,'#bd9473');r(25,15,15,12,'#e2bc96');r(23,18,3,9,'#c99b78');r(39,18,3,10,'#ae7f64');
  r(27,21,3,2,'#263c44');r(35,21,3,2,'#263c44');r(32,23,2,3,'#ba8e70');r(29,29,8,2,'#8e6c5a');
  r(26,32,13,3,'#cfaa83');r(25,35,6,5,'#a1b3af');r(34,35,6,5,'#a1b3af');r(31,38,3,17,'#293f4b');
  r(21,42,7,8,dark);r(36,42,7,8,dark);r(21,42,7,2,o.color);r(36,42,7,2,o.color);
  for(let y=42;y<56;y+=5)r(32,y,1,1,'#e2c482');
  if(id==='operative'){
    r(20,10,24,10,dark);r(23,7,20,7,'#3d4559');r(22,10,18,2,o.color);r(22,25,20,7,'#283241');
    r(42,44,16,15,'#1d2b36');r(44,42,12,3,o.color);r(44,46,12,2,'#dfc47e');r(49,51,3,4,o.color);
  }else{
    r(21,9,22,8,dark);r(24,6,17,5,'#617b7e');r(21,14,23,4,dark);r(23,10,17,2,o.color);
    r(30,8,4,4,'#d7c088');r(31,8,2,2,'#f3dfae');
  }
  if(id==='scout'){
    r(40,16,3,13,dark);r(42,17,5,4,'#1b3036');r(43,11,1,7,'#a4b0aa');
    r(14,45,14,8,'#1c3035');r(14,43,5,12,'#28464c');r(23,43,5,12,'#28464c');r(15,45,3,3,o.color);r(24,45,3,3,o.color);
  }
  if(id==='duty'){
    r(40,41,16,20,'#263f4a');r(42,43,12,16,'#dccfa9');r(45,40,6,4,o.color);
    for(let y=47;y<57;y+=4)r(44,y,8,1,'#8b8e76');r(48,48,2,10,'#dfad60');
  }
  if(id==='supply'){
    r(34,45,23,17,'#7b5c3b');r(34,45,23,4,'#c49f67');r(36,50,19,10,'#a28151');r(43,45,5,17,o.color);r(44,52,3,4,'#f6d3a0');
  }
  if(id==='quartermaster'){
    r(12,42,17,20,'#38434f');r(14,44,13,16,'#c6b7a1');r(16,48,9,2,o.color);r(16,52,9,2,'#647c83');
    r(40,50,12,12,'#8c7859');r(42,52,8,8,'#f1d59b');r(45,53,2,4,'#314957');r(45,56,4,2,'#314957');
  }
  const svg=`<svg viewBox="0 0 64 80" shape-rendering="crispEdges" aria-hidden="true">${shapes}</svg>`;
  cache.set(id,svg);return svg;
}
