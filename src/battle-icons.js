// Original 64 × 64 pixel metalwork. Stepped silhouettes stay clear at 18px;
// separate bevels, facets and edge lights supply detail when enlarged. No fonts,
// external assets, gradient IDs or per-frame drawing. Markup is cached once.
const path=(d,fill)=>`<path d="${d}" fill="${fill}"/>`;
const rect=(x,y,w,h,fill)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
const pauseBar=path('M5 4h15v4h4v49h-4v4H5V4z','#172720')+
  path('M8 7h11v3h2v45h-3v3H8z','#836530')+
  path('M8 7h11v3h-8v43H8z','#fff0b3')+
  rect(11,10,7,43,'#dfbd6c')+rect(11,11,3,20,'#f8df92')+
  rect(17,12,3,42,'#b18a45')+rect(10,52,8,3,'#a37a39')+rect(11,32,3,16,'#ead189');
const northArrow=path('M28 3h8v6h6v6h6v6h6v6h6v10H42v24H22V37H4V27h6v-6h6v-6h6V9h6z','#172720')+
  path('M29 7h6v6h6v6h6v6h6v6h4v3H38v24H26V34H7v-3h6v-6h6v-6h6v-6h4z','#a38245')+
  path('M29 8h5v6h-5v6h-6v6h-6v6H9v-3h6v-6h6v-6h6v-6h2z','#fff1b8')+
  path('M31 15h3v6h6v6h6v5H35v23h-6V32H19v-4h6v-6h6z','#e6c77d')+
  path('M34 21h6v6h6v5H35v23h-3V27h2z','#c4a25d')+
  rect(28,35,3,17,'#fff0b3')+rect(27,55,10,3,'#6e562e');
const check=path('M4 28h10v6h6v6h4v-6h6v-6h6v-6h6v-6h6V9h12v14h-6v6h-6v6h-6v6h-6v6h-6v6h-6v6H14v-6H8v-6H2V29z','#172720')+
  path('M6 31h6v6h6v6h8v-6h6v-6h6v-6h6v-6h6v-7h7v9h-6v6h-6v6h-6v6h-6v6h-6v6h-6v5h-5v-6h-6v-6H6z','#9b7a3c')+
  path('M7 31h5v7h6v6h8v-6h6v-6h6v-6h6v-6h6v-7h5v5h-6v6h-6v6h-6v6h-6v6h-6v6H15v-5H9v-6H7z','#fff0b4')+
  path('M12 39h6v6h8v-6h6v-6h6v-6h6v-6h6v-5h5v5h-6v6h-6v6h-6v6h-6v6h-6v6h-8v-5h-5z','#e3cb81')+
  path('M17 48h8v-3h4v5h-6v5h-5v-5h-1z','#bd9c51');
const shapes = Object.freeze({
  pause:pauseBar+`<g transform="translate(33 0)">${pauseBar}</g>`,
  mana:path('M27 2h10v6h7v7h7v8h6v23h-6v8h-8v6H21v-6h-8v-8H7V23h6v-8h7V8h7z','#102c42')+
    path('M28 5h8v7h7v7h7v8h4v17h-6v8h-8v5H24v-5h-8v-8h-6V27h6v-8h7v-7h5z','#3376ac')+
    path('M29 7h6l-3 22-16 12-3-13 6-10 7-7z','#a8efff')+
    path('M35 10l13 16-16 3z','#62d4f1')+
    path('M32 29l16-3 3 16-12 10z','#266ca7')+
    path('M32 29l7 23H25L16 41z','#4ebae5')+
    path('M13 28h4v11h-4zm4 14h5v6h-5z','#d3f8ff')+
    path('M27 14h5v11h-5v5h-5v-6h5z','#f0ffff')+
    path('M24 53h16v3H24z','#8de1fa')+rect(45,28,4,13,'#1c5286')+rect(26,35,3,9,'#a3e9fa'),
  lock:path('M20 3h24v5h6v6h3v17h6v29H5V31h6V14h3V8h6zm5 12v16h14V15z','#14221c')+
    path('M21 6h22v5h5v7h2v13h-8V15h-5v-3H27v3h-5v16h-8V18h2v-7h5z','#82958d')+
    path('M21 7h21v4H23v5h-5v15h-3V18h2v-7h4z','#e4eee0')+
    path('M44 15h4v16h-6V19h2z','#4f655c')+
    path('M9 30h46v27H9z','#92662f')+rect(10,30,43,4,'#fae3a0')+
    rect(12,35,39,18,'#d5ad58')+rect(12,35,7,18,'#e7ca7d')+rect(49,34,5,20,'#b17e37')+
    rect(12,53,40,3,'#6e4c25')+path('M28 37h8v3h3v7h-4v6h-6v-6h-4v-7h3z','#624a2b')+
    path('M29 38h6v3h2v4h-4v7h-3v-7h-3v-4h2z','#1b2b25')+
    rect(14,37,3,3,'#fff0bb')+rect(47,48,3,3,'#f9dfa1'),
  check,
  info:path('M19 2h26v5h9v8h6v34h-6v8h-9v5H19v-5h-9v-8H4V15h6V7h9z','#15271f')+
    path('M20 5h24v5h8v7h5v30h-5v7h-8v5H20v-5h-8v-7H7V17h5v-7h8z','#9b7c44')+
    path('M20 5h24v4H22v5h-7v7h-4v26H7V17h5v-7h8z','#f3df9d')+
    path('M23 12h18v4h8v7h3v20h-3v7h-8v3H23v-3h-8v-7h-3V23h3v-7h8z','#354d40')+
    path('M23 16h18v3H25v5h-7v18h-3V23h4v-4h4z','#516e56')+
    path('M44 21h5v23h-5v5H24v-3h17v-7h3z','#22392f')+
    rect(27,19,10,9,'#f2da91')+rect(28,19,8,3,'#fff4c4')+
    path('M25 32h12v15h3v3H24v-3h4V36h-3z','#d4b36b')+
    rect(28,33,3,13,'#fff0b5')+rect(24,50,16,2,'#84643b'),
  up:northArrow,
  down:`<g transform="rotate(180 32 32)">${northArrow}</g>`,
  left:`<g transform="rotate(270 32 32)">${northArrow}</g>`,
  right:`<g transform="rotate(90 32 32)">${northArrow}</g>`,
  locate:path('M27 1h10v9h10v7h7v10h9v10h-9v10h-7v7H37v9H27v-9H17v-7h-7V37H1V27h9V17h7v-7h10z','#14251e')+
    path('M29 3h6v10h11v7h5v9h10v6H51v10h-6v6H35v10h-6V51H19v-6h-6V35H3v-6h10V19h6v-6h10z','#a88a4e')+
    path('M29 3h5v14H23v6h-6v11H3v-5h11V19h5v-5h10z','#fce6a5')+
    path('M25 19h14v5h6v16h-6v5H25v-5h-6V24h6z','#314b3b')+
    path('M27 23h10v4h4v10h-4v4H27v-4h-4V27h4z','#111e18')+
    rect(29,27,7,10,'#e3c476')+rect(27,29,11,6,'#e3c476')+rect(29,28,3,5,'#fff2c2')+
    rect(42,20,3,7,'#dcc27b')+rect(44,37,3,7,'#735a34')+rect(30,48,4,10,'#7a623a'),
  world:path('M21 2h22v4h9v7h6v9h4v20h-4v9h-6v7h-9v4H21v-4h-9v-7H6v-9H2V22h4v-9h6V6h9z','#122c2b')+
    path('M22 5h20v4h9v6h5v8h3v18h-3v8h-5v6h-9v4H22v-4h-9v-6H8v-8H5V23h3v-8h5V9h9z','#28647b')+
    path('M22 6h19v4H24v5h-9v10h-5v15H6V23h3v-8h5V10h8z','#82c3ca')+
    path('M48 16h5v10h4v14h-5v8h-6v5H26v-4h19v-7h4V28h-1z','#1a435a')+
    path('M23 11h14v5h9v8h-7v7H28v6h-7v12h-6V38h-5V23h7v-7h6z','#7caa76')+
    path('M23 12h12v4H24v6h-6v8h-6v-6h6v-7h5z','#d1df9e')+
    path('M27 22h10v5H26v7h-5v8h-4V31h7v-5h3z','#a7c584')+
    path('M41 38h11v10h-8v6h-9v-7h6z','#789e6a')+
    rect(43,39,6,4,'#bfd394')+path('M24 52h10v4H24z','#619ca3')+
    rect(37,11,3,3,'#e4e9b6')+rect(9,30,2,8,'#b0dfd3'),
  orbit:path('M48 9h11v6h3v10h-5v8h-6v-9h4v-7h-7z','#6e583c')+
    path('M25 8h15v4h9v8h5v20h-5v8h-9v5H23v-5h-9v-8H9V23h5v-9h11z','#201e35')+
    path('M25 11h14v5h8v7h4v15h-5v8h-8v4H25v-5h-8v-8h-5V25h5v-9h8z','#70649e')+
    path('M25 12h13v5H26v5h-7v13h-5V25h5v-8h6z','#c8c0e1')+
    path('M26 20h18v5H29v5H18v-5h8z','#a498c5')+
    path('M43 26h7v11h-6v8H31v-5h9v-7h3z','#493a77')+
    path('M8 26h7v8H9v7h9v-4h11v-5h10v-5h9v-6h8v-7h3v12h-6v7h-9v6H33v5H22v5H9v-3H3V33h5z','#372b25')+
    path('M8 29h4v4H7v9h11v-4h11v-4h11v-6h10v-6h7v-5h2v8h-7v6H42v6H31v5H20v5H10v-3H5V34h3z','#dbba72')+
    path('M9 42h9v-4h11v-4h11v-5h10v-6h5v3h-4v5H41v6H30v5H19v4H9z','#fff0b9')+
    path('M23 46h13v4h-9v-2h-4z','#8a78b2')+rect(27,14,7,3,'#eee6fa')+rect(17,22,3,5,'#d5cbed'),
});
const icons = new Map(Object.entries(shapes).map(([name,shape])=>[name,
  `<svg class="battle-icon battle-icon-${name}" data-battle-icon="${name}" viewBox="0 0 64 64" width="18" height="18" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${shape}</svg>`]));

export function battleIcon(name) {
  const icon=icons.get(name);
  if(!icon) throw new RangeError('Unknown battle icon');
  return icon;
}

function starCount(value) {
  return Number.isInteger(value)&&value>=0&&value<=3?value:0;
}
const starPath='M29 2h6v6h3v8h4v4h12v3h8v6h-4v4h-4v4h-5v5h3v14h-3v4h-6v-4h-8v-4h-6v4h-8v4h-6v-4h-3V42h3v-5h-5v-4H6v-4H2v-6h8v-3h12v-4h4V8h3z';
function starArt(filled) {
  return path(starPath,filled?'#624526':'#17271f')+
    path('M30 6h4v10h4v7h15v3h5v3h-6v6h-7v8h3v12h-5v-3h-9v-4h-4v4h-9v3h-5V43h3v-8h-7v-6H6v-3h5v-3h15v-7h4z',filled?'#d9a84d':'#52665a')+
    path('M30 6h4v10h-3v10H13v3H6v-3h5v-3h15v-7h4z',filled?'#fff0ad':'#8d9f91')+
    path('M32 17l6 13 13-2-13 11 6 13-12-9-12 9 6-15-14-9h17z',filled?'#edcb76':'#3a5042')+
    path('M32 17v26l-12 9 6-15-14-9h17z',filled?'#ffe7a0':'#627668')+
    path('M32 30h5l1 9 6 13-12-9z',filled?'#c49038':'#314637')+
    path('M32 43v5h-3v4h-8v3h-5v-4h5v-4h6v-4z',filled?'#b47b2d':'#293e32')+
    rect(31,12,2,10,filled?'#fff8d5':'#a0b0a1')+rect(12,25,13,2,filled?'#fff4c2':'#7b9080');
}
const starRows=Object.freeze(Array.from({length:4},(_,count)=>Array.from({length:3},(_,i)=>
  `<g transform="translate(${i*28} 0) scale(.375)" data-star-filled="${i<count}" shape-rendering="crispEdges">${starArt(i<count)}</g>`).join('')));

export function battleStarsMarkup(value, best=false) {
  const count=starCount(value);
  return `<svg class="battle-star-icons" viewBox="0 0 80 24" width="80" height="24" role="img" aria-label="${best?'최고 ':''}별 ${count}개" focusable="false">${starRows[count]}</svg>`;
}

// Map symbols stay SVG children, never HTML wrappers nested inside the map.
export function mapBattleStars(value,x,y) {
  const count=starCount(value);
  return `<g class="region-stars" role="img" aria-label="최고 별 ${count}개" transform="translate(${x-26} ${y-16}) scale(.65)">${starRows[count]}</g>`;
}
export function mapBattleCheck(x,y) {
  return `<g class="region-check" transform="translate(${x-10} ${y-10}) scale(.83)" fill="#e3efc9" aria-hidden="true"><g transform="scale(.375)" shape-rendering="crispEdges">${shapes.check}</g></g>`;
}

// Called on pause/result transitions only; no DOM work is added to battle frames.
export function renderBattleStars(node,value=null,newBest=false) {
  if(!node) return;
  node.innerHTML=value===null?'':battleStarsMarkup(value)+(newBest?'<span class="battle-new-best">신기록!</span>':'');
  node.classList.toggle('pop',value!==null);
}

export function renderBattleLock(node,label='') {
  if(!node||node.dataset.battleLock===label) return;
  node.dataset.battleLock=label;
  node.textContent=label;
  if(label) node.insertAdjacentHTML('afterbegin',battleIcon('lock'));
}
