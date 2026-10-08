const cache=new Map();
// Original glass, liquid, gilded cap and embossed label; two cached pixel sprites.
export function potionIcon(id) {
  if(cache.has(id))return cache.get(id);
  if(!['red','blue'].includes(id))throw new RangeError('Unknown potion');
  const colors=id==='red'?['#681c33','#ad2946','#e34d66','#ff9d9a']:['#173e79','#206ca7','#39a8da','#a2edfa'];
  const parts=[];
  const r=(x,y,w,h,c)=>parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`);
  r(13,74,40,3,'#0a1b21');r(19,71,29,3,'#152b30');
  r(23,3,20,4,'#57452d');r(21,7,24,10,'#9c7137');r(24,5,18,3,'#f6df98');
  r(23,8,20,3,'#ddbb6b');r(24,12,3,4,'#f3db96');r(29,12,2,4,'#b28342');r(39,11,3,5,'#71512f');
  r(23,17,20,13,'#273f4c');r(26,17,14,12,'#829da7');r(27,18,3,9,'#e3eece');r(37,17,3,13,'#476672');
  r(17,28,32,5,'#364f5c');r(13,33,40,5,'#364f5c');r(10,38,46,26,'#233d48');
  r(13,64,40,6,'#233d48');r(17,70,32,3,'#233d48');
  r(17,32,32,5,'#9bbabe');r(14,37,38,27,'#718f96');r(17,64,32,5,'#779898');
  r(18,41,30,24,colors[0]);r(15,44,36,17,colors[0]);
  r(18,41,28,4,colors[2]);r(17,45,30,14,colors[1]);r(20,59,24,6,colors[1]);
  r(21,43,15,2,colors[3]);r(18,47,4,10,colors[2]);r(20,60,13,2,colors[2]);
  r(44,45,4,16,colors[0]);r(18,35,5,6,'#d0e0d4');r(14,40,3,17,'#cee2d6');
  r(18,38,3,10,'#edf3de');r(19,49,2,7,'#ffcabb');r(16,60,3,4,'#c6d3c1');
  r(48,38,3,20,'#4e737e');r(44,65,4,3,'#3f626c');r(23,68,16,2,'#aac8c2');
  r(24,47,18,15,'#614b32');r(25,47,16,2,'#e7c975');r(25,60,16,2,'#aa8543');
  r(24,50,2,9,'#d6b96c');r(40,50,2,9,'#a88242');r(27,50,12,9,'#efe2b0');
  r(31,51,4,7,colors[1]);r(29,53,8,3,colors[1]);r(31,51,2,2,colors[3]);
  r(43,22,2,3,'#e0d6a5');r(48,20,2,2,'#f7e8b8');r(52,25,2,2,'#c4dbe0');
  const svg=`<svg viewBox="0 0 66 80" role="img" aria-label="${id==='red'?'빨간':'파랑'}물약 픽셀 그림" shape-rendering="crispEdges">${parts.join('')}</svg>`;
  cache.set(id,svg);return svg;
}
