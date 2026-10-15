// Original menu miniatures. Every picture is drawn for this same 48px optical canvas.
// Game assets stay unchanged; the menu uses their steel/brass/cartridge materials.
const C={ink:'#122630',shadow:'#2b4753',steel:'#718c94',light:'#b8c9c7',shine:'#eef0d8',brass:'#c9ad70',gold:'#f0d79a',wood:'#927449'};
function miniature(draw){
  const parts=[];
  const r=(x,y,w,h,c)=>parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C[c]||c}"/>`);
  const p=(d,c)=>parts.push(`<path d="${d}" fill="${C[c]||c}"/>`);
  draw(r,p);
  return `<svg viewBox="0 0 48 48" shape-rendering="crispEdges" focusable="false" aria-hidden="true">${parts.join('')}</svg>`;
}

const recruit=miniature((r,p)=>{
  // Helmet, face and broad uniform shoulders read as a recruit at menu size.
  p('M17 27h14v4h6v4h5v9H6v-9h5v-4h6z','ink');
  r(10,35,28,7,'shadow');r(13,32,22,8,'steel');r(12,35,5,6,'light');r(33,35,4,6,'shadow');
  r(19,26,10,8,'#a88e6c');p('M18 31l6 6 6-6-3-1h-6z','light');
  r(14,15,20,12,'ink');r(16,16,16,11,'#d7bd91');r(28,18,4,8,'#a08b6c');r(18,26,12,3,'#c6a97f');
  r(17,21,3,2,'ink');r(28,21,3,2,'ink');r(23,25,4,1,'#8a7056');
  p('M12 12h3V8h4V5h10v3h4v4h3v8H12z','ink');
  r(15,12,18,7,'steel');r(18,9,12,7,'steel');r(21,7,6,3,'light');r(16,13,3,5,'light');r(30,12,3,6,'shadow');
  r(10,18,28,4,'ink');r(12,18,24,1,'light');r(14,19,20,1,'steel');
  r(23,11,3,4,'brass');r(22,12,5,2,'gold');
  r(16,34,3,9,'brass');r(29,34,3,9,'brass');r(21,37,6,6,'ink');r(23,37,2,3,'light');
});

const equipment=miniature((r,p)=>{
  // Distinct turret and barrel over a wide, detailed tracked chassis.
  p('M6 29h34v3h4v9h-4v3H6v-3H3v-9h3z','ink');
  r(6,32,35,8,'steel');r(6,33,35,1,'light');r(7,40,33,2,'shadow');
  for(const x of [8,16,24,32]){r(x,35,6,5,'ink');r(x+1,35,4,3,'light');r(x+2,36,2,2,'shadow');}
  p('M10 22h23v3h6v7H7v-7h3z','ink');r(10,25,27,5,'steel');r(13,23,18,3,'light');r(29,27,7,4,'shadow');
  r(7,30,32,2,'light');r(8,27,4,2,'gold');r(32,28,4,2,'brass');
  p('M17 11h13v4h4v10H14V15h3z','ink');r(17,16,14,7,'steel');r(19,12,9,4,'steel');r(17,16,13,2,'light');r(28,18,4,5,'shadow');
  r(29,17,15,6,'ink');r(30,18,13,2,'light');r(30,20,13,1,'steel');r(42,16,3,8,'ink');r(42,18,2,4,'steel');
  r(20,8,8,3,'ink');r(21,8,6,1,'light');r(22,6,2,2,'brass');r(18,20,4,2,'brass');
});

const shop=miniature((r,p)=>{
  // A striped counter canopy and supply crate distinguish the shop from facilities.
  r(7,21,34,22,'ink');r(10,24,28,16,'steel');r(10,25,2,14,'light');r(36,25,2,15,'shadow');
  r(11,5,26,8,'ink');r(13,7,22,4,'brass');r(14,7,20,1,'gold');
  p('M10 12h28l6 9v5H4v-5z','ink');p('M11 14h26l4 7H7z','brass');
  p('M12 14h5l-1 7H8z','gold');p('M22 14h4v7h-4z','gold');p('M31 14h5l4 7h-8z','gold');
  r(7,21,8,3,'wood');r(15,21,8,3,'brass');r(23,21,9,3,'wood');r(32,21,9,3,'brass');
  r(14,27,12,11,'ink');r(16,28,8,7,'#91bbc0');r(17,29,6,2,'light');r(19,28,2,8,'steel');
  r(28,28,7,12,'ink');r(30,30,3,5,'shadow');r(29,36,2,2,'gold');r(5,41,38,3,'ink');r(7,40,34,2,'light');
  r(5,31,14,11,'ink');r(7,33,10,7,'wood');r(7,33,10,1,'gold');r(9,34,2,6,'brass');r(14,34,2,6,'brass');r(8,38,8,2,'brass');
});

const facilities=miniature((r,p)=>{
  // Office block with rooftop flag, windows and a central entrance.
  r(22,3,2,7,'light');r(24,3,8,4,'brass');r(24,4,6,2,'gold');
  r(15,8,18,7,'ink');r(17,10,14,4,'steel');r(18,10,12,1,'light');
  r(7,15,34,26,'ink');r(10,17,28,23,'steel');r(10,17,3,23,'light');r(35,18,3,22,'shadow');
  r(5,14,38,4,'ink');r(8,14,32,2,'light');
  for(const y of [20,27])for(const x of [15,23,31]){r(x,y,5,5,'ink');r(x+1,y,3,2,'#aacbcd');r(x+1,y+3,3,1,'shadow');}
  r(14,34,5,5,'ink');r(15,34,3,2,'#aacbcd');r(29,34,5,5,'ink');r(30,34,3,2,'#aacbcd');
  r(21,33,7,9,'ink');r(23,34,3,7,'brass');r(23,34,3,2,'gold');r(24,38,2,1,'ink');
  r(5,41,38,3,'ink');r(8,40,32,2,'light');r(18,42,13,2,'brass');
});

const personal=miniature((r,p)=>{
  // A sidearm separates personal equipment from battle's crossed blades.
  // Long barrel, visible cylinder and warm grip retain the game's revolver materials.
  p('M4 10h23V7h8v3h5v6h3v9h-5v5l5 12H27l-2-9h-8v-8H4z','ink');
  r(6,12,22,9,'steel');r(6,12,22,2,'light');r(6,19,18,2,'shadow');r(5,9,5,3,'ink');r(6,9,3,1,'light');
  r(5,13,2,7,'shadow');r(8,16,14,2,'light');r(9,18,13,1,'shadow');
  r(27,10,11,12,'steel');r(28,10,7,2,'light');r(37,15,4,8,'shadow');r(35,20,5,5,'steel');
  r(23,13,12,12,'ink');r(25,14,8,9,'steel');r(25,14,8,2,'light');
  r(25,17,2,4,'shadow');r(30,17,2,4,'shadow');r(27,22,4,1,'brass');
  r(30,6,7,4,'ink');r(32,7,4,2,'steel');r(35,8,3,3,'light');
  p('M27 24h10v6l4 10H29l-3-11z','wood');p('M28 25h3l2 14h-3z','brass');
  r(31,27,6,2,'#ad8d58');r(32,31,6,2,'#665b44');r(33,35,6,2,'#665b44');r(29,40,12,2,'ink');r(30,39,10,2,'brass');
  p('M19 25h7v7h-7z','brass');p('M21 25h3v5h-3z','ink');r(23,25,2,3,'light');
});

const items=miniature((r,p)=>{
  // Three cartridges retain the inventory's color identities and metal frames.
  const cell=(x,y,color,shine,kind)=>{
    r(x+3,y,7,3,'ink');r(x+4,y,5,1,'light');r(x+2,y+3,9,3,'steel');
    r(x,y+6,13,25,'ink');r(x+1,y+7,11,21,'steel');r(x+1,y+7,2,21,'light');r(x+10,y+8,2,21,'shadow');
    r(x+4,y+9,5,16,color);r(x+4,y+9,5,2,shine);r(x+4,y+12,1,10,shine);
    if(kind==='touch')p(`M${x+7} ${y+13}h2l-2 4h2l-4 5 1-5H${x+5}z`,shine);
    else if(kind==='time'){r(x+6,y+13,2,1,shine);r(x+6,y+21,2,1,shine);r(x+7,y+14,1,7,shine);}
    else{r(x+6,y+14,1,6,shine);r(x+8,y+14,1,6,shine);r(x+5,y+19,5,2,shine);}
    r(x,y+13,2,4,'brass');r(x+11,y+23,2,4,'brass');r(x+3,y+28,7,2,'light');
  };
  cell(3,12,'#ae633f','#ffdc9a','touch');cell(32,12,'#916d31','#ffe6a1','max');cell(17,5,'#3f909f','#d4f4e6','time');
  r(19,37,9,3,'ink');r(20,38,7,1,'brass');
});

const battle=miniature((r,p)=>{
  // Broad crossed blades and brass guards stay recognizable at 36px.
  p('M6 4h5l24 25v4l9 9-4 4-9-9h-4L4 12V6z','ink');
  p('M7 7h3l23 24-3 3L7 11z','light');p('M8 7h2l23 24-1 1L8 9z','shine');
  p('M25 35l10-10 3 3-10 10z','ink');p('M27 35l8-8 1 1-8 8z','gold');
  p('M33 35l7 7 2-2-7-7z','wood');r(40,41,3,3,'brass');
  p('M37 4h5l2 2v6L21 37h-4l-9 9-4-4 9-9v-4z','ink');
  p('M38 7h3v4L18 34l-3-3z','steel');p('M38 7h2L16 32l-1-1z','shine');
  p('M10 28l3-3 10 10-3 3z','ink');p('M12 28l1-1 8 8-1 1z','gold');
  p('M13 35l2 2-7 7-2-2z','wood');r(5,41,3,3,'brass');r(23,22,3,3,'gold');
});

const icons=new Map(Object.entries({recruit,equipment,shop,facilities,personal,items,battle}));
export function homeMenuIcon(key){const icon=icons.get(key);return icon?`<span class="home-menu-icon" aria-hidden="true">${icon}</span>`:'';}
