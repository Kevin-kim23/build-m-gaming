import { FACILITIES, MAX_FACILITY_LEVEL, facilityOffer, facilityEffect, facilityBonus, facilityLevel, facilityUpgradeOffer } from './facilities.js';
import { facilityIcon } from './facility-art.js';
import { fmtGoldCost } from './format.js';
import { subtractMoney } from './money.js';

function presentation(state, id) {
  const build = facilityOffer(state,id), level = facilityLevel(state,id);
  const offer = level ? facilityUpgradeOffer(state,id) : build;
  const max = offer.reason === 'max';
  return {build, level, offer, max, canAct:level?offer.canUpgrade:offer.canBuy,
    button:max?`최대 Lv.${MAX_FACILITY_LEVEL}`:level?`Lv.${level+1} 강화`:build.locked?'잠금':'건설',
    status:offer.reason==='gold'?`${fmtGoldCost(subtractMoney(offer.cost,state.gold))} G 부족`
      :max?'최대 레벨 달성':level?'확정 강화 · 골드 소모':build.locked?`${build.facility.rank} 진급 시 해금`:'종류별 1개 건설 · 상시 적용',
  };
}
export function facilitiesMarkup(state) {
  const bonus=facilityBonus(state);
  return `<p class="strength-note" id="facility-total">시설 합계 · 초당 +${bonus.passive}% · 터치 +${bonus.tap}%</p>
    <div class="facility-grid">${FACILITIES.filter(f=>facilityOffer(state,f.id).visible).map(f=>{
      const p=presentation(state,f.id);
      return `<article class="facility-card${p.build.locked&&!p.level?' locked':''}" data-facility="${f.id}">
        <div data-facility-art data-level="${p.level}">${facilityIcon(f.id,p.level||1)}</div>
        <h3 data-facility-name>${f.name}${p.level?` Lv.${p.level}`:''}</h3>
        <strong data-facility-effect>${facilityEffect(f,p.level||1)}</strong>
        <small data-facility-next>${p.level&&!p.max?'다음: '+facilityEffect(f,p.level+1):''}</small>
        <b data-facility-price>${p.max?'':fmtGoldCost(p.offer.cost)+' G'}</b>
        <button type="button" data-facility-action="${f.id}" ${p.canAct?'':'disabled'}>${p.button}</button>
        <small data-facility-status>${p.status}</small><p>${f.purpose}</p></article>`;
    }).join('')}</div><p class="strength-note">종류별 1개 건설 · 골드로 최대 Lv.${MAX_FACILITY_LEVEL}까지 확정 강화<br>시설 보너스는 합산됩니다. 전투 능력에는 영향을 주지 않습니다.</p>`;
}
export function renderFacilities(state,root) {
  const set=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value;};
  const bonus=facilityBonus(state);
  set(root.querySelector('#facility-total'),`시설 합계 · 초당 +${bonus.passive}% · 터치 +${bonus.tap}%`);
  for(const f of FACILITIES) {
    const card=root.querySelector(`[data-facility="${f.id}"]`);if(!card)continue;
    const p=presentation(state,f.id),button=card.querySelector('[data-facility-action]');
    button.disabled=!p.canAct;set(button,p.button);
    set(card.querySelector('[data-facility-name]'),f.name+(p.level?` Lv.${p.level}`:''));
    set(card.querySelector('[data-facility-effect]'),facilityEffect(f,p.level||1));
    set(card.querySelector('[data-facility-next]'),p.level&&!p.max?'다음: '+facilityEffect(f,p.level+1):'');
    set(card.querySelector('[data-facility-price]'),p.max?'':fmtGoldCost(p.offer.cost)+' G');
    set(card.querySelector('[data-facility-status]'),p.status);
    card.classList.toggle('locked',p.build.locked&&!p.level);
    const art=card.querySelector('[data-facility-art]');
    if(art.dataset.level!==String(p.level)) {
      art.dataset.level=String(p.level);art.innerHTML=facilityIcon(f.id,p.level||1);
    }
  }
}
