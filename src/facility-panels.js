import { FACILITIES, facilityOffer, facilityEffect, facilityBonus } from './facilities.js';
import { facilityIcon } from './facility-art.js';
import { fmtGoldCost } from './format.js';
import { subtractMoney } from './money.js';
function status(offer) {
  return offer.owned?'건설 완료':offer.locked?`${offer.facility.rank} 진급 시 해금`:'종류별 1개 건설 · 상시 적용';
}
export function facilitiesMarkup(state) {
  const bonus=facilityBonus(state);
  return `<p class="strength-note" id="facility-total">시설 합계 · 초당 +${bonus.passive}% · 터치 +${bonus.tap}%</p>
  <div class="facility-grid">${FACILITIES.filter(f=>facilityOffer(state,f.id).visible).map(f=>{
    const offer=facilityOffer(state,f.id);
    return `<article class="facility-card" data-facility="${f.id}">${facilityIcon(f.id)}<h3>${f.name}</h3><p>${f.purpose}</p><strong>${facilityEffect(f)}</strong><small data-facility-status>${status(offer)}</small><b>${fmtGoldCost(f.cost)} G</b><button type="button" data-build-facility="${f.id}" ${offer.canBuy?'':'disabled'}>건설</button></article>`;
  }).join('')}</div><p class="strength-note">상사부터 준장까지 계급마다 시설 1종 해금<br>같은 수입의 시설 보너스는 합산됩니다. 전투 능력에는 영향을 주지 않습니다.</p>`;
}
export function renderFacilities(state,root) {
  const set=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value;};
  const bonus=facilityBonus(state);
  set(root.querySelector('#facility-total'),`시설 합계 · 초당 +${bonus.passive}% · 터치 +${bonus.tap}%`);
  for(const f of FACILITIES) {
    const card=root.querySelector(`[data-facility="${f.id}"]`);if(!card)continue;
    const offer=facilityOffer(state,f.id),button=card.querySelector('[data-build-facility]');
    button.disabled=!offer.canBuy;
    set(button,offer.owned?'건설 완료':offer.locked?'잠금':'건설');
    set(card.querySelector('[data-facility-status]'),offer.reason==='gold'?`${fmtGoldCost(subtractMoney(offer.cost,state.gold))} G 부족`:status(offer));
    card.classList.toggle('locked',offer.locked&&!offer.owned);
  }
}
