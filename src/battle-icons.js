// Original compact vector symbols. Cached markup keeps platform emoji fonts out
// of battle UI; controls and their surrounding text carry accessible names.
const shapes = Object.freeze({
  pause:'<path d="M5 3h5v18H5zm9 0h5v18h-5z"/><path d="M6 4h2v15H6zm9 0h2v15h-2z" fill="#fff2c1" opacity=".45"/>',
  mana:'<path d="M10 2h4v4h3v4h3v7h-2v3h-3v2H9v-2H6v-3H4v-7h3V6h3z" fill="#528ed0"/><path d="M10 6h3v4h-3v5H7v-5h3z" fill="#cceaff"/><path d="M8 18h8v2H8z" fill="#95cfff"/>',
  lock:'<path d="M7 2h10v2h2v7h2v11H3V11h2V4h2zm2 3v6h6V5z" fill-rule="evenodd"/><path d="M11 14h2v5h-2z" fill="#203329"/>',
  check:'<path d="M2 11h4v4h4v-4h4V7h4V3h4v6h-4v4h-4v4h-4v4H6v-4H2z"/>',
  info:'<path d="M6 2h12v2h4v16h-4v2H6v-2H2V4h4zm1 3v1H5v12h2v1h10v-1h2V6h-2V5z" fill-rule="evenodd"/><path d="M10 7h4v3h-4zm0 5h4v6h-4z"/>',
  up:'<path d="M10 2h4v4h4v4h4v4h-8v8h-4v-8H2v-4h4V6h4z"/>',
  down:'<path d="M10 2h4v8h8v4h-4v4h-4v4h-4v-4H6v-4H2v-4h8z"/>',
  left:'<path d="M10 2h4v8h8v4h-8v8h-4v-4H6v-4H2v-4h4V6h4z"/>',
  right:'<path d="M10 2h4v4h4v4h4v4h-4v4h-4v4h-4v-8H2v-4h8z"/>',
  locate:'<path d="M10 1h4v4h5v5h4v4h-4v5h-5v4h-4v-4H5v-5H1v-4h4V5h5zm-2 7v8h8V8z" fill-rule="evenodd"/><path d="M10 10h4v4h-4z"/>',
  world:'<path d="M6 2h12v2h4v16h-4v2H6v-2H2V4h4z" fill="#789b87"/><path d="M6 4h6v4h4v4h-4v4H8v4H6v-8H4V8h2zm12 12h2v4h-4v-2h2z" fill="#d8dab0"/>',
  orbit:'<path d="M9 4h8v2h3v10h-3v3H9v-3H6V6h3z" fill="#b6abd5"/><path d="M10 5h5v3h-5z" fill="#f4e7c8"/><path d="M20 4h3v6h-3v3h-5v3H9v3H3v-2H1v-6h3v4h4v-2h6v-3h5V7h1z" fill="#d8bd83"/>',
});
const icons = new Map(Object.entries(shapes).map(([name,shape])=>[name,
  `<svg class="battle-icon battle-icon-${name}" data-battle-icon="${name}" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${shape}</svg>`]));

export function battleIcon(name) {
  const icon=icons.get(name);
  if(!icon) throw new RangeError('Unknown battle icon');
  return icon;
}

function starCount(value) {
  return Number.isInteger(value)&&value>=0&&value<=3?value:0;
}
const starPath='M12 2l3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1z';
const starRows=Object.freeze(Array.from({length:4},(_,count)=>Array.from({length:3},(_,i)=>
  `<g transform="translate(${i*28} 0)" data-star-filled="${i<count}"><path d="${starPath}" fill="${i<count?'#e5c574':'#33463c'}" stroke="${i<count?'#fff0b4':'#8b9b8e'}" stroke-width="1.2" stroke-linejoin="round"/>${i<count?'<path d="M12 3v14l-5 4 1-7-5-4 7-1z" fill="#fff0b4" opacity=".35"/>':''}</g>`).join('')));

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
  return `<g class="region-check" transform="translate(${x-10} ${y-10}) scale(.83)" fill="#e3efc9" aria-hidden="true">${shapes.check}</g>`;
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
