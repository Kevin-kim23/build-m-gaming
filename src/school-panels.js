import { subtractMoney } from './money.js';
import { SCHOOLS, schoolOffer } from './schools.js';
import { fmtGoldCost, fmtGold } from './format.js';
import { UNIT_LIST } from './units.js';
import { schoolIcon } from './school-art.js';
export { schoolIcon } from './school-art.js';
export function schoolUnlockPreview(offer) {
  if(offer.level>=offer.school.maxLevel)return '최대 레벨 달성';
  const unit=UNIT_LIST.find(u=>u.school===offer.school.id&&u.schoolLevel===offer.nextLevel);
  return unit?`${unit.name} 해금 · 1명당 초당 +${fmtGold(unit.passive)} G / 터치 +${fmtGold(unit.tap)} G` : offer.effect;
}
export function schoolsMarkup(state) {
  return `<p class="school-intro">학교를 건설·확장하면 새로운 간부를 모집할 수 있어요.</p>`+
    Object.keys(SCHOOLS).map(id=>schoolOffer(state,id)).filter(o=>o.visible).map(o=>{
      const d=o.school;
      return `<article class="school-card" data-school="${d.id}"><div class="school-heading">${schoolIcon(d.id,o.level)}<div><span class="item-class">군사 교육 시설</span><h3>${d.name}</h3><b>${o.level?'Lv.'+o.level+' / '+d.maxLevel:'미건설'}</b></div><button type="button" class="school-detail" data-detail-school="${d.id}" aria-label="${d.name} 상세보기">상세보기</button></div>
      <p class="school-requirement">${o.requirement}</p>
      <p class="school-requirement" data-school-unlock>${schoolUnlockPreview(o)}</p>
      <div class="price-line"><span>${o.level?'다음 확장 비용':'건설 비용'}</span><strong data-school-price></strong></div>
      <button class="buy" data-upgrade-school="${d.id}"></button>
      ${o.level?'<button class="school-recruit-link" data-shop-category="recruit">군대 모집으로 이동 →</button>':''}</article>`;
    }).join('');
}
// Level-by-level effects, costs and notes live in the detail popup.
export function schoolDetailMarkup(state,id) {
  const o=schoolOffer(state,id),d=o.school;
  return {kicker:'군사 교육 시설',title:d.name,
    body:`<div class="detail-art detail-art-wide">${schoolIcon(d.id,o.level)}</div>
      <p>${o.level?'Lv.'+o.level+' / '+d.maxLevel:'미건설'} · ${o.requirement}</p>
      <ol class="school-levels">${d.effects.map((effect,i)=>`<li class="${o.level>i?'complete':''}"><b>Lv.${i+1}</b> ${effect}${o.level>i?' ✓':''}<small>${fmtGoldCost(d.costs[i])} G${d.requiredRanks?` · ${d.requiredRanks[i]} 이상 필수`:d.recommendedRanks?` · ${d.recommendedRanks[i]} 구간 권장`:''}</small></li>`).join('')}</ol>
      ${d.recommendedRanks?'<p>Lv.2~5는 추가 계급 제한 없이 골드로 확장합니다.<br>표시된 비용은 각 단계의 건설·확장비이며 모집비는 별도입니다.</p>':''}
      <p>학교는 한 채씩 보유하며 병력은 별도로 모집합니다. 자체 수입이나 전력은 없습니다.</p>`};
}
export function renderSchools(state,root) {
  for(const id of Object.keys(SCHOOLS)) {
    const card=root.querySelector(`[data-school="${id}"]`);if(!card)continue;
    const offer=schoolOffer(state,id),button=card.querySelector('[data-upgrade-school]');
    const unlock=card.querySelector('[data-school-unlock]'),preview=schoolUnlockPreview(offer);
    if(unlock.textContent!==preview)unlock.textContent=preview;
    const label=offer.reason==='max'?'최대 레벨 달성':offer.reason==='locked'?'🔒 '+offer.requirement
      :offer.reason==='gold'?`${fmtGoldCost(subtractMoney(offer.cost,state.gold))} G 부족`:`${offer.level?'Lv.'+offer.nextLevel+' 확장':'건설'} · ${offer.effect}`;
    if(button.textContent!==label)button.textContent=label;
    button.disabled=!offer.canBuy;
    const price=card.querySelector('[data-school-price]'),value=offer.reason==='max'?'—':fmtGoldCost(offer.cost)+' G';
    if(price.textContent!==value)price.textContent=value;
  }
}
