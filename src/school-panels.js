import { SCHOOLS, schoolOffer } from './schools.js';
import { fmtGoldCost } from './format.js';
import { schoolIcon } from './school-art.js';
export { schoolIcon } from './school-art.js';
export function schoolsMarkup(state) {
  return `<p class="school-intro">학교를 건설·확장하면 새로운 간부를 모집할 수 있어요.<br>학교는 한 채씩 보유하며 병력은 별도로 모집합니다.</p>`+
    Object.keys(SCHOOLS).map(id=>schoolOffer(state,id)).filter(o=>o.visible).map(o=>{
      const d=o.school;
      return `<article class="school-card" data-school="${d.id}"><div class="school-heading">${schoolIcon(d.id,o.level)}<div><span class="item-class">군사 교육 시설</span><h3>${d.name}</h3><b>${o.level?'Lv.'+o.level+' / '+d.maxLevel:'미건설'}</b></div></div>
      <p class="school-requirement">${o.requirement}</p><ol class="school-levels">${d.effects.map((effect,i)=>`<li class="${o.level>i?'complete':''}"><b>Lv.${i+1}</b> ${effect}${o.level>i?' ✓':''}${d.recommendedRanks?`<small>${fmtGoldCost(d.costs[i])} G · ${d.recommendedRanks[i]} 구간 권장</small>`:''}</li>`).join('')}</ol>
      ${d.recommendedRanks?'<p class="school-requirement">Lv.2~5는 추가 계급 제한 없이 골드로 확장합니다.<br>표시된 비용은 각 단계의 건설·확장비이며 모집비는 별도입니다.</p>':''}
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
      :offer.reason==='gold'?`${fmtGoldCost(offer.cost-state.gold)} G 부족`:`${offer.level?'Lv.'+offer.nextLevel+' 확장':'건설'} · ${offer.effect}`;
    if(button.textContent!==label)button.textContent=label;
    button.disabled=!offer.canBuy;
    const price=card.querySelector('[data-school-price]'),value=offer.reason==='max'?'—':fmtGoldCost(offer.cost)+' G';
    if(price.textContent!==value)price.textContent=value;
  }
}
