import {academyView} from './academy-view.js';
import {ACADEMY_STAGES,academyLevel} from './academy-levels.js';
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
  const view=academyView(state),o=view.offer;
  return `<article class="school-card" data-school="${view.id}"><div class="school-heading">${schoolIcon(view.artId,view.artLevel)}<div><span class="item-class">군사 교육 시설</span><h3>사관학교</h3><b>${view.level?'Lv.'+view.level+' / '+view.maxLevel:'미건설'}</b></div><button type="button" class="school-detail" data-detail-school="${view.id}" aria-label="사관학교 상세보기">상세보기</button></div>
    <p class="school-requirement">${o.requirement}</p><p class="school-requirement" data-school-unlock>${schoolUnlockPreview(o)}</p>
    <div class="school-upgrade-row"><div class="price-line"><span>${view.level?'다음 확장 비용':'건설 비용'}</span><strong data-school-price></strong></div>
    <button class="buy" data-upgrade-school="${view.id}"></button></div></article>`;
}
export function schoolDetailMarkup(state) {
  const view=academyView(state);
  return {kicker:'군사 교육 시설',title:'사관학교',body:`<div class="detail-art detail-art-wide">${schoolIcon(view.artId,view.artLevel)}</div>
    <p>Lv.${view.level} / ${view.maxLevel} · ${view.offer.requirement}</p>
    <ol class="school-levels">${ACADEMY_STAGES.flatMap(id=>{
      const d=SCHOOLS[id];return d.effects.map((effect,i)=>`<li class="${(state[d.field]??0)>i?'complete':''}"><b>Lv.${academyLevel(id,i+1)}</b> ${effect}${(state[d.field]??0)>i?' ✓':''}<small>${fmtGoldCost(d.costs[i])} G${d.requiredRanks?` · ${d.requiredRanks[i]} 이상 필수`:d.recommendedRanks?` · ${d.recommendedRanks[i]} 구간 권장`:''}</small></li>`);
    }).join('')}</ol><p>Lv.7~10은 추가 계급 제한 없이 골드로 확장합니다. 다른 단계의 필수 계급은 각 항목에 표시됩니다.</p><p>표시 비용은 각 단계의 확장비이며 모집비는 별도입니다. 자체 수입이나 전력은 없습니다.</p>`};
}
export function renderSchools(state,root) {
  const view=academyView(state),offer=view.offer,card=root.querySelector(`[data-school="${view.id}"]`);if(!card)return;
  const button=card.querySelector('[data-upgrade-school]'),unlock=card.querySelector('[data-school-unlock]'),preview=schoolUnlockPreview(offer);
  if(unlock.textContent!==preview)unlock.textContent=preview;
  const label=offer.reason==='max'?'최대 레벨 달성':offer.reason==='locked'?'🔒 '+offer.requirement
    :offer.reason==='gold'?`${fmtGoldCost(subtractMoney(offer.cost,state.gold))} G 부족`:`${view.level?'Lv.'+view.nextLevel+' 확장':'건설'} · ${offer.effect}`;
  if(button.textContent!==label)button.textContent=label;
  button.disabled=!offer.canBuy;
  card.classList.toggle('is-max',offer.reason==='max');
  const price=card.querySelector('[data-school-price]'),value=offer.reason==='max'?'—':fmtGoldCost(offer.cost)+' G';
  if(price.textContent!==value)price.textContent=value;
}
