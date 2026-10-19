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
export function facilityListPreview(state,id) {
  const p=presentation(state,id),f=p.build.facility;
  return {
    effect:`${p.level?'현재':'건설 후'} · ${facilityEffect(f,p.level||1)}`,
    next:p.level&&!p.max?`강화 후 · ${facilityEffect(f,p.level+1)}`:'',
    status:p.build.locked&&!p.level?`${f.rank} 진급 시 해금`:p.offer.reason==='gold'?p.status:'',
  };
}
export function facilitiesMarkup(state) {
  const bonus=facilityBonus(state);
  return `<p class="strength-note" id="facility-total">시설 합계 · 초당 +${bonus.passive}% · 터치 +${bonus.tap}%</p>
    <div class="facility-grid equipment-list">${FACILITIES.filter(f=>facilityOffer(state,f.id).visible).map(f=>{
      const p=presentation(state,f.id),preview=facilityListPreview(state,f.id);
      return `<article class="facility-card equipment-list-card${p.build.locked&&!p.level?' locked':''}" data-facility="${f.id}" aria-label="${f.name}">
        <div class="equipment-list-art" data-facility-art data-level="${p.level}">${facilityIcon(f.id,p.level||1)}</div>
        <div class="equipment-list-info"><h3 data-facility-name>${f.name} Lv.${p.level}</h3>
        <p class="facility-current" data-facility-effect>${preview.effect}</p>
        <p class="equipment-list-next" data-facility-next>${preview.next}</p>
        <p class="equipment-list-status" data-facility-status>${preview.status}</p>
        </div>
        <button type="button" class="equipment-list-detail" data-detail-facility="${f.id}" aria-label="${f.name} 상세보기"><span aria-hidden="true">i</span></button>
        <div class="equipment-list-action"><button class="buy" type="button" data-facility-action="${f.id}" aria-label="${f.name} ${p.button}${p.max?'':' · '+fmtGoldCost(p.offer.cost)+' G'}" ${p.canAct?'':'disabled'}><span data-facility-button>${p.button}</span></button><small data-facility-price>${p.max?'':fmtGoldCost(p.offer.cost)+' G'}</small></div></article>`;
    }).join('')}</div>`;
}
export function renderFacilities(state,root) {
  const set=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value;};
  const bonus=facilityBonus(state);
  set(root.querySelector('#facility-total'),`시설 합계 · 초당 +${bonus.passive}% · 터치 +${bonus.tap}%`);
  for(const f of FACILITIES) {
    const card=root.querySelector(`[data-facility="${f.id}"]`);if(!card)continue;
    const p=presentation(state,f.id),preview=facilityListPreview(state,f.id),button=card.querySelector('[data-facility-action]');
    button.disabled=!p.canAct;set(card.querySelector('[data-facility-button]'),p.button);
    button.setAttribute('aria-label',`${f.name} ${p.button}${p.max?'':' · '+fmtGoldCost(p.offer.cost)+' G'}`);
    set(card.querySelector('[data-facility-name]'),f.name+` Lv.${p.level}`);
    set(card.querySelector('[data-facility-effect]'),preview.effect);
    set(card.querySelector('[data-facility-next]'),preview.next);
    set(card.querySelector('[data-facility-status]'),preview.status);
    set(card.querySelector('[data-facility-price]'),p.max?'':fmtGoldCost(p.offer.cost)+' G');
    card.classList.toggle('locked',p.build.locked&&!p.level);
    const art=card.querySelector('[data-facility-art]');
    if(art.dataset.level!==String(p.level)) {
      art.dataset.level=String(p.level);art.innerHTML=facilityIcon(f.id,p.level||1);
    }
  }
}

export function facilityDetailMarkup(state,id) {
  const f=FACILITIES.find(f=>f.id===id);
  if(!f)throw new RangeError('Unknown facility');
  const p=presentation(state,id);
  return {kicker:'FACILITY',title:f.name+` Lv.${p.level}`,body:
    `<p>${f.purpose}</p><p><strong>현재 효과</strong><br>${p.level?facilityEffect(f,p.level):'미보유 · 효과 없음'}</p>`+
    (p.max?'':`<p><strong>${p.level?'다음 강화':'건설 후'} · Lv.${p.level+1}</strong><br>${facilityEffect(f,p.level+1)}<br>비용 ${fmtGoldCost(p.offer.cost)} G</p>`)+
    `<p>${p.status}</p><p>해금: ${f.rank}<br>종류별 1개 건설 · 최대 Lv.${MAX_FACILITY_LEVEL} · 확정 강화</p><p>시설 보너스는 합산됩니다. 전투 능력에는 영향을 주지 않습니다.</p>`};
}
