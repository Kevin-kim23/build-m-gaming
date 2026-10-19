// Original pixel illustrations: clothing, tools and insignia use only our own geometry.
// No external images, fonts, heraldry or protected medical symbols are embedded.
import { OPERATIVES } from './loot.js';

const cache = new Map();
function canvas() {
  const shapes = [];
  return {
    r: (x, y, w, h, fill) => shapes.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`),
    p: (d, fill) => shapes.push(`<path d="${d}" fill="${fill}"/>`),
    svg: (width, height) => `<svg viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${shapes.join('')}</svg>`,
  };
}

// A bevelled supply case. Large faces and the central latch remain readable at 24px.
const lootArt = (() => {
  const { r, p, svg } = canvas();
  p('M8 39h32v4H8z', '#07141b55');
  p('M3 13 12 7h28l6 7v25l-9 6H9l-6-5z', '#162a30');
  p('M5 14 13 9h26l5 6-8 5H10z', '#f3cf80');
  p('M10 20h26v22H10L5 38V15z', '#b18b45');
  p('M36 20 44 15v23l-8 4z', '#765b32');
  r(11, 22, 24, 3, '#efd08c'); r(11, 25, 24, 11, '#c49a50'); r(11, 36, 24, 3, '#a17838');
  p('M7 14 14 10h23l3 3-6 4H12z', '#ffe5a4');
  p('M8 17h4v23H8zM33 19h4v24h-4z', '#3b4c4e');
  r(9, 20, 2, 18, '#82918a'); r(34, 22, 2, 18, '#a5aa8d');
  r(13, 27, 19, 2, '#a57c39'); r(13, 30, 19, 2, '#d5af64');
  r(20, 17, 8, 15, '#665735'); r(21, 18, 6, 12, '#f8d98e');
  r(22, 22, 4, 5, '#4b5650'); r(23, 23, 2, 3, '#a9b9aa');
  r(16, 7, 15, 2, '#2f454a'); r(16, 6, 3, 3, '#74918b'); r(28, 6, 3, 3, '#74918b');
  r(6, 15, 3, 3, '#fff0bc'); r(38, 18, 2, 3, '#d1b16b');
  r(12, 23, 2, 2, '#fff0b5'); r(31, 37, 2, 2, '#ead398');
  return svg(48, 48);
})();
export const lootIcon = () => lootArt;

const skin={light:'#f4d2ac',mid:'#c28f6f',shade:'#a16f56',deep:'#6d4b40'};
const ink='#101f29';
const palette={
  duty:{dark:'#233b4c',mid:'#436177',light:'#718fa1',shine:'#a5c1c8',trim:'#91c9d6'},
  scout:{dark:'#263e36',mid:'#4f6b50',light:'#829777',shine:'#b4c3a0',trim:'#8dcab9'},
  supply:{dark:'#464435',mid:'#787454',light:'#aaa47c',shine:'#d6cd9c',trim:'#e1aa77'},
  quartermaster:{dark:'#303347',mid:'#52576f',light:'#858ba1',shine:'#c0c4d0',trim:'#d0b7e4'},
  operative:{dark:'#1c2b35',mid:'#344957',light:'#5b7381',shine:'#91a6ac',trim:'#e6c67d'},
};
// Actual 192×224 pixel drawing, not enlarged copies of the previous full figures.
// Anonymous black faces keep attention on uniforms and the distinct field tools.
function stitches(c,x,y,length,horizontal,color) {
  for(let n=0;n<length;n+=5)c.r(x+(horizontal?n:0),y+(horizontal?0:n),horizontal?3:1,horizontal?1:3,color);
}
function fastener(c,x,y,col='#b6b6a0') {
  c.r(x,y,5,5,ink);c.r(x+1,y,3,4,col);c.r(x+1,y+1,1,1,'#ecede0');
}
function patch(c,x,y,col) {
  c.p('M'+x+' '+y+'h17v12l-8 6-9-6z',ink);
  c.p('M'+(x+2)+' '+(y+2)+'h13v9l-6 4-7-4z',col);
  c.p('M'+(x+5)+' '+(y+5)+'h7v2h-2v4h-3v-4h-2z','#dbe3cf');
}
function pouch(c,x,y,w,h,a) {
  c.r(x-1,y,w+2,h+2,ink);c.r(x,y,w,h,a.dark);c.r(x+2,y+2,w-4,h-5,a.mid);
  c.r(x+2,y+2,w-4,5,a.light);c.r(x+2,y+7,w-4,2,a.dark);
  c.r(x+3,y+h-4,w-6,1,a.light);stitches(c,x+3,y+3,w-6,true,a.shine);
  c.r(x+Math.floor(w/2)-2,y+7,5,8,a.dark);fastener(c,x+Math.floor(w/2)-2,y+9);
}
function shoulder(c,x,y,a) {
  c.p('M'+x+' '+y+'h31l9 8v17H'+(x-4)+'v-17z',a.dark);
  c.r(x+1,y+2,29,7,a.light);c.r(x+2,y+2,26,2,a.shine);
  c.r(x+4,y+10,27,2,a.mid);fastener(c,x+25,y+3);
}
function neck(c) {
  c.p('M80 82h31v21l14 10-29 21-29-20 13-12z','#000000');
}
function face(c) {
  c.p('M74 26h39v5h8v9h5v35h-5v13l-10 13H82L69 88V77h-5V42h5V31h5z','#000000');
}
function uniform(c,a,{coat=false}={}) {
  const {r,p}=c;
  p('M67 103h17l13 12 12-12h16l23 7 16 15 11 53 4 43H17l4-43 11-53 16-15z',ink);
  p('M64 107h21l12 16 13-16h17l22 11 11 28 10 72H25l9-71 13-29z',a.dark);
  p('M53 117h24l15 14-4 84H35l5-65z',a.mid);
  p('M119 112l26 10 10 28 8 65h-51l-7-89z',a.mid);
  p('M51 119h9l-13 39-5 55H30l9-66z',a.light);
  p('M132 119h7l11 31 7 58h-8l-10-56z',a.light);
  p('M61 107h17l17 20-20 13-18-18zM113 107h16l9 14-23 19-17-13z',a.light);
  p('M63 109h10l16 18-13 7-13-14zM118 110h9l7 10-18 14-10-7z',a.shine);
  r(92,129,11,88,a.dark);r(96,132,2,80,a.shine);r(100,134,2,80,ink);
  for(const y of [143,160,177,194])fastener(c,94,y,a.shine);
  shoulder(c,43,112,a);shoulder(c,120,112,a);
  for(const [x,y]of [[43,145],[36,165],[146,145],[152,170]]){
    r(x,y,9,2,a.dark);r(x+2,y+3,7,1,a.light);
  }
  stitches(c,52,143,64,false,a.shine);stitches(c,140,142,62,false,a.dark);
  pouch(c,58,144,27,31,a);pouch(c,109,144,27,31,a);
  r(55,136,29,4,a.dark);r(57,137,25,1,a.shine);
  r(108,135,26,5,a.dark);r(110,136,21,1,a.shine);patch(c,31,137,a.trim);
  if(coat){
    p('M48 176h41l4 41H26l8-26zM106 176h37l22 41h-62z',a.dark);
    p('M46 179h37l4 35H32zM112 180h29l16 34h-48z',a.mid);
    stitches(c,42,207,40,true,a.light);stitches(c,116,207,34,true,a.light);
  }else{
    r(40,202,113,11,ink);r(43,203,107,3,a.light);
    r(89,201,20,13,'#bcb58e');r(92,204,14,7,a.dark);r(93,205,6,2,a.shine);
  }
}
function glove(c,x,y,a) {
  c.p('M'+(x+3)+' '+y+'h14v4h4v17h-5v5H'+(x+1)+'v-5h-3V'+(y+8)+'h5z',a.dark);
  c.r(x+2,y+5,14,15,a.mid);c.r(x+3,y+5,12,3,a.light);
  for(let i=0;i<3;i++)c.r(x+3+i*4,y+12,2,7,ink);
}
function hand(c,x,y) {
  c.p('M'+(x+3)+' '+y+'h12v4h5v16h-5v4H'+x+'v-5h-3V'+(y+7)+'h6z',skin.deep);
  c.r(x+1,y+4,14,15,skin.mid);c.r(x+2,y+3,12,5,skin.light);
  for(let n=0;n<3;n++)c.r(x+2+n*4,y+10,2,8,skin.shade);
}
function peakedCap(c,a,gold=false) {
  const {r,p}=c;
  p('M61 39V22l9-10 47-3 13 10 3 20-8 8H68z',ink);
  p('M65 27l10-10 39-3 12 9 2 14H65z',a.mid);
  p('M70 25l9-7 29-2 12 7H84v2z',a.light);
  p('M73 22l9-3 20-1v2H84l-8 4z',a.shine);
  r(64,33,64,10,a.dark);r(66,34,59,2,gold?'#e1c88c':a.light);
  r(67,40,58,3,gold?'#9d8150':a.mid);
  p('M65 43h61v4l-14 6H78l-14-6z',ink);p('M70 44h49v2l-10 3H81z',a.light);
  p('M73 44h37v1H73z',a.shine);
  p('M89 22h14v9l-7 5-7-5z','#b19558');p('M91 24h10v6l-5 3-5-3z','#ecd491');
  r(94,25,4,4,'#fff1bf');r(65,36,3,4,'#c0c7b4');r(123,36,3,4,'#8b9c94');
}
function duty(c) {
  const {r,p}=c,a=palette.duty;
  p('M136 89h21v68h-17z','#243946');r(140,93,12,52,'#627e8a');
  neck(c);uniform(c,a);face(c);peakedCap(c,a);
  // Padded communication headset, cable and boom microphone.
  p('M60 48h-7v28h12V57h-5zM128 47h9v29h-12V57h3z',ink);
  r(55,54,8,19,a.light);r(56,55,3,16,a.shine);r(126,53,9,20,a.mid);
  r(128,56,5,13,a.light);r(61,48,4,15,'#adbbb8');
  p('M132 74h5v14h-23v-3h18z','#95b2b5');r(107,83,11,5,'#253d47');r(108,83,6,1,'#b8d0cb');
  p('M132 79h3v24h6v19h-3v-16h-6z',ink);
  pouch(c,41,161,17,32,a);r(45,163,8,8,'#101f29');r(47,165,4,3,'#83c9c4');
  // Map terminal: framed screen, grid, route, switches and hand strap.
  p('M68 166h87l9 9v44H68l-9-10v-35z',ink);
  p('M70 169h82l8 8v38H72l-8-8v-32z','#657d87');
  r(74,176,72,32,'#112d3a');r(77,179,66,26,'#244b5a');
  for(let x=84;x<142;x+=10)r(x,179,1,26,'#386977');
  for(let y=185;y<205;y+=6)r(77,y,66,1,'#386977');
  p('M80 200h13v-9h17v7h12v-14h15v3h-12v14h-18v-7H96v9H80z','#9dd4b8');
  r(131,181,5,5,'#f7d891');r(78,180,13,2,'#80b7c2');
  for(const y of [180,188,196])r(150,y,4,4,y===180?'#e8cd85':'#a2b9b4');
  r(81,210,52,2,'#8fa7a8');r(107,214,16,2,'#283f4d');
  hand(c,54,187);hand(c,153,181);
}
function scout(c) {
  const {r,p}=c,a=palette.scout;
  p('M51 84h87l25 45 16 90H13l12-77z','#152d29');
  neck(c);uniform(c,a);face(c);
  // Layered hood and patterned fabric around the anonymous silhouette.
  p('M55 72V35l9-17 18-11h31l19 14 8 26v47h-18V78h7V48l-10-22H79L65 47v33H53z',ink);
  p('M57 68V36l10-15 18-11h24l17 13 9 25v39h-12V73h6V48l-11-25H80L63 45v23z',a.dark);
  p('M59 49V36l11-14 15-10h16v7H83L69 34l-6 19z',a.light);
  p('M112 15l13 11 8 26v30h-7V48l-11-23z',a.mid);
  p('M52 90h20l-10 27-7 35-17 64H17l15-73z',a.mid);
  p('M57 94h10l-11 30-7 36-17 54H21l18-72z',a.light);
  p('M129 89h13l14 40 17 87h-21l-10-63z',a.dark);
  for(const [x,y,w,h]of [[70,25,7,4],[61,42,4,6],[116,26,6,4],[128,55,5,10],[51,108,8,4],[43,132,7,6],[34,167,10,5],[27,191,8,7],[143,131,8,4],[150,172,8,5]]) {
    r(x,y,w,h,a.dark);r(x+2,y+1,Math.max(2,w-3),1,a.mid);
  }
  // Binoculars: two lens assemblies rather than a flat equipment silhouette.
  p('M52 113h19v-4h35v4h18v37H52z',ink);
  r(56,116,24,32,'#314e4a');r(96,116,24,32,'#314e4a');r(80,119,16,19,'#627d72');
  for(const x of [56,96]){
    r(x,116,24,6,'#799c89');r(x+3,119,18,25,'#182e32');
    r(x+5,123,14,17,'#2e6876');r(x+6,124,8,9,'#8ed4d4');
    r(x+7,124,6,2,'#dfefdf');r(x+15,131,2,8,'#4c8b96');
    r(x+2,141,20,4,'#5d7b6f');r(x+4,145,16,2,'#9eb49a');
  }
  r(83,114,10,4,'#91aa92');r(86,112,4,2,'#d2d9b8');
  p('M67 149h3v22h42v-23h3v27H67z','#17302c');
  glove(c,42,125,a);glove(c,121,125,a);pouch(c,68,182,25,29,a);pouch(c,108,182,25,29,a);
  r(116,180,2,19,'#ddd5a1');r(114,178,6,5,'#2c453e');
}
function supply(c) {
  const {r,p}=c,a=palette.supply;
  p('M30 91h125v104H26V106z',ink);r(31,96,24,87,a.mid);r(34,99,4,73,a.light);
  r(145,95,14,98,a.dark);r(148,98,4,89,a.mid);
  neck(c);uniform(c,a);face(c);peakedCap(c,a);
  for(const x of [58,124]){r(x,116,7,48,'#baa775');r(x+2,118,2,42,'#e6d2a1');fastener(c,x+1,127,'#f0d4a0');}
  // Reinforced supply load with lid thickness, timber grain and strap rivets.
  p('M22 176 36 163h113l17 14v44H35l-13-10z',ink);
  p('M27 176 39 167h106l15 10-14 9H39z','#d6b67d');
  p('M40 186h106v32H39l-12-9v-31z','#977448');
  p('M146 186 161 178v31l-15 9z','#60533c');
  r(43,188,100,4,'#cca66b');r(43,193,100,20,'#ad8852');r(44,212,99,3,'#795c3a');
  for(const x of [50,129]){
    r(x,175,10,43,'#33463f');r(x+2,179,3,34,'#a2ad96');
    for(const y of [186,208])fastener(c,x+3,y,'#c4c7a2');
  }
  for(const [x,y,w]of [[65,197,25],[100,200,24],[62,208,35],[104,208,20]])r(x,y,w,1,'#8a683e');
  r(83,190,28,20,'#3c4b3e');r(86,193,22,14,'#dac696');
  p('M91 196h12v3h-4v5h-4v-5h-4z','#87764d');
  r(29,178,9,5,'#eee0b4');r(140,181,6,5,'#e2c58a');
  hand(c,19,179);hand(c,157,175);
}
function quartermaster(c) {
  const {r,p}=c,a=palette.quartermaster;
  neck(c);uniform(c,a,{coat:true});face(c);peakedCap(c,a,true);
  p('M83 106h27l-14 20z','#dde2d9');p('M92 111h8l-2 9 5 25-7 9-7-9 5-25z','#293547');r(93,120,2,25,'#687080');
  for(const x of [47,124]){r(x,113,24,5,'#ad925b');r(x+1,113,22,2,'#ead59d');for(let i=0;i<3;i++)r(x+5+i*5,118,2,4,'#c6ab70');}
  r(115,138,21,5,'#b5a5c5');r(116,139,19,1,'#e4d9e9');
  // Leather ledger: bound pages, corner guards, elastic and pencil.
  p('M24 164h47l8 6v51H24z',ink);r(28,168,43,49,'#77627f');r(30,170,37,44,'#9880a1');
  r(29,169,4,48,'#594e67');r(33,172,31,2,'#c4acc7');r(68,174,6,42,'#d9d3ba');
  for(const y of [178,184,190,196,202,208])r(69,y,4,1,'#a5a791');
  r(38,182,23,2,'#dbc69f');r(42,187,15,1,'#baa887');r(48,168,4,49,'#514961');
  r(57,158,3,48,'#d1af69');r(58,160,1,39,'#f1d597');r(57,158,3,4,'#35404a');
  hand(c,21,176);hand(c,142,170);
  // Pocket chronometer with chained links and individually cut bezel ticks.
  p('M129 184h5v4h7v4h5v6h4v-10h2v13h-7v-7h-6v-4h-6v-3h-4z','#c4ac72');
  r(153,183,7,5,'#e7c983');r(154,180,5,4,'#968157');
  p('M145 188h22v4h4v23h-4v4h-22v-4h-4v-23h4z','#816d45');
  p('M146 190h19v4h4v19h-4v4h-19v-4h-4v-19h4z','#d4b873');
  r(147,194,17,18,'#f1e5bc');r(150,191,12,2,'#fff3cc');r(154,196,2,9,'#46525d');r(156,202,6,2,'#46525d');
  for(const [x,y]of [[150,195],[161,195],[148,202],[162,207],[155,210]])r(x,y,1,2,'#837451');
}
function operative(c) {
  const {r,p}=c,a=palette.operative;
  p('M41 93h109v85H39z',ink);r(140,89,14,98,a.dark);r(144,92,4,75,a.light);
  r(149,41,3,55,'#718993');r(148,38,5,8,ink);
  neck(c);uniform(c,a);face(c);
  // Low-profile helmet; the exposed face remains entirely black.
  p('M59 51V28l11-17 42-3 17 13 7 28h-14V33H74v18z',ink);
  p('M64 36V27l10-13 35-2 14 11 7 22h-8V31H74v5z',a.mid);
  p('M68 28l9-11 27-2 13 8H83l-11 9z',a.light);r(77,18,25,2,a.shine);
  p('M76 25h43v8H74z',a.dark);r(82,26,30,2,a.light);
  r(89,17,18,11,ink);r(92,19,12,7,a.light);r(95,20,6,4,a.dark);
  p('M64 123h66v77H62z',ink);r(67,126,58,68,a.dark);r(68,126,55,4,a.light);
  for(const y of [137,147,157]){
    r(69,y,53,5,'#172b36');for(let x=72;x<121;x+=10){r(x,y,7,2,a.light);r(x+1,y+2,5,2,a.mid);}
  }
  for(const x of [69,89,109])pouch(c,x,169,16,28,a);
  r(73,128,6,37,a.mid);r(113,128,6,37,a.mid);fastener(c,73,131);fastener(c,113,131);
  patch(c,31,137,'#c5aa6d');glove(c,26,180,a);
  // Secure gold case: matte body, bright corner edges, mechanical latch.
  p('M117 185v-8h32v8h18v34h-64v-34z',ink);
  r(122,180,22,8,'#b8a477');r(126,182,14,4,a.dark);
  r(108,188,54,27,'#997746');r(110,188,50,5,'#e1c583');r(113,196,43,14,'#bf9b59');
  r(114,197,40,2,'#e6cc8c');r(113,211,44,2,'#735a3a');
  for(const x of [109,153]){
    r(x,189,7,27,'#4f5d5a');r(x+1,191,2,20,'#9fae97');fastener(c,x+1,193,'#d2c796');fastener(c,x+1,208,'#c4bb8e');
  }
  r(130,195,14,14,'#394b48');r(133,197,8,9,'#e5cd90');r(135,200,4,4,'#6a715b');
  r(110,188,6,2,'#fff0b8');glove(c,128,169,a);
}
const draw={duty,scout,supply,quartermaster,operative};
export function operativeIcon(id) {
  if(cache.has(id))return cache.get(id);
  if(!OPERATIVES.some(o=>o.id===id))throw new RangeError('Unknown operative');
  const c=canvas();
  draw[id](c);
  const svg=c.svg(192,224);
  cache.set(id,svg);
  return svg;
}
