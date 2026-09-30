import { SCHOOLS, schoolOffer } from './schools.js';
import { fmt } from './format.js';
const drawings=new Map();
// Original pixel campus, cached per school/level and shared by its shop card.
export function schoolIcon(id,level) {
  const key=`${id}:${level}`;
  if(drawings.has(key)) return drawings.get(key);
  const floors=id==='officer'?4:Math.max(1,level), color=id==='officer'?'#788fa1':'#8e9b74';
  const top=54-floors*7;
  let windows='';
  for(let row=0;row<floors;row++) for(let col=0;col<4;col++)
    windows+=`<path fill="#bacfc5" d="M${24+col*12} ${top+5+row*7}h6v4h-6z"/>`;
  let detail='';
  for(let row=0;row<floors;row++)for(let col=0;col<4;col++){
    const x=24+col*12,y=top+5+row*7;
    detail+=`<path fill="#354f52" d="M${x} ${y+1}h6v2h-6z"/><path fill="#e3e2bb" d="M${x+2.5} ${y}h.5v4h-.5zM${x-1} ${y+4}h8v.5h-8z"/>`;
  }
  for(let x=22;x<74;x+=7)detail+=`<path fill="#59765a" d="M${x} ${top-3}h4v2h-4z"/><path fill="#e0d7aa" d="M${x} ${top-3}h4v.5h-4z"/>`;
  detail+='<path fill="#c3c2a0" d="M39 63h18v2H39zM37 65h22v1H37zM20 60h18v.5H20zM58 60h18v.5H58z"/><path fill="#182e29" d="M43 55h4v7h-4zM49 55h4v7h-4z"/>';
  const svg=`<svg class="school-art" viewBox="0 0 96 72" role="img" aria-label="${SCHOOLS[id].name} Lv.${level} 건물" shape-rendering="crispEdges"><path fill="#15271d66" d="M13 59h75v8H13z"/><path fill="#445c48" d="M12 43h72v19H12z"/><path fill="${color}" d="M19 ${top}h58v${62-top}H19z"/><path fill="#c9c393" d="M16 ${top-4}h64v5H16z"/>${windows}<path fill="#35493d" d="M42 53h12v10H42z"/><path fill="#dac98c" d="M9 17h2v45H9z"/><path fill="${id==='officer'?'#85aabc':'#b5c18b'}" d="M11 17h16v9H11z"/><path fill="#e7d795" d="M43 ${top-10}h10v5H43z"/>${detail}</svg>`;
  drawings.set(key,svg);return svg;
}
export function schoolsMarkup(state) {
  return `<p class="school-intro">학교를 건설·확장하면 새로운 간부를 모집할 수 있어요.<br>학교는 한 채씩 보유하며 병력은 별도로 모집합니다.</p>`+
    Object.keys(SCHOOLS).map(id=>schoolOffer(state,id)).filter(o=>o.visible).map(o=>{
      const d=o.school;
      return `<article class="school-card" data-school="${d.id}"><div class="school-heading">${schoolIcon(d.id,o.level)}<div><span class="item-class">군사 교육 시설</span><h3>${d.name}</h3><b>${o.level?'Lv.'+o.level+' / '+d.maxLevel:'미건설'}</b></div></div>
      <p class="school-requirement">${o.requirement}</p><ol class="school-levels">${d.effects.map((effect,i)=>`<li class="${o.level>i?'complete':''}"><b>Lv.${i+1}</b> ${effect}${o.level>i?' ✓':''}</li>`).join('')}</ol>
      <div class="price-line"><span>${o.level?'다음 확장 비용':'건설 비용'}</span><strong data-school-price></strong></div>
      <button class="buy" data-upgrade-school="${d.id}"></button>
      ${o.level?'<button class="school-recruit-link" data-shop-category="recruit">군대 모집으로 이동 →</button>':''}</article>`;
    }).join('');
}
export function renderSchools(state,root) {
  for(const id of Object.keys(SCHOOLS)) {
    const card=root.querySelector(`[data-school="${id}"]`);if(!card)continue;
    const offer=schoolOffer(state,id),button=card.querySelector('[data-upgrade-school]');
    const label=offer.reason==='max'?'최대 레벨 달성':offer.reason==='locked'?'🔒 '+offer.requirement
      :offer.reason==='gold'?`${fmt(offer.cost-state.gold)} G 부족`:`${offer.level?'Lv.'+offer.nextLevel+' 확장':'건설'} · ${offer.effect}`;
    if(button.textContent!==label)button.textContent=label;
    button.disabled=!offer.canBuy;
    const price=card.querySelector('[data-school-price]'),value=offer.reason==='max'?'—':fmt(offer.cost)+' G';
    if(price.textContent!==value)price.textContent=value;
  }
}
