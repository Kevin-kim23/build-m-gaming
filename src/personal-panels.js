import { personalIcon } from './personal-art.js';
import { UNITS } from './units.js';
import { fmtGold, fmtGoldCost } from './format.js';
import { PERSONAL_EQUIPMENT, GENERAL_SWORD, MARSHAL_GLAIVE, personalIncomePercent, AUTO_TOUCH } from './personal-catalog.js';
import { BULK_RECRUIT, personalStatus, batonDiscountPercent } from './personal-equipment.js';
import { personalUpgradeOffer, personalUpgradeStep } from './personal-enhancement.js';

export function personalLevelEffect(id,level) {
  if(id==='commandBaton')return `${UNITS[Object.keys(BULK_RECRUIT)[Math.min(level,Object.keys(BULK_RECRUIT).length)-1]].name}까지 병종별 100명 모집${batonDiscountPercent(level)?` · 일괄 모집 비용 ${batonDiscountPercent(level)}% 할인`:''}`;
  if(id==='generalSword')return `${(GENERAL_SWORD.durationMs+(level-1)*GENERAL_SWORD.durationStepMs)/1000}초 동안 터치 골드 2배`;
  if(id==='divisionFlag')return `장비 최대 ${10+level}강 해금`;
  if(id==='marshalGlaive')return `초당 골드 +${MARSHAL_GLAIVE.passiveBonusPercent+(level-1)*MARSHAL_GLAIVE.passiveBonusStep}% · 상시 적용`;
  if(id==='admiralsCompass')return `홈 터치 골드 +${personalIncomePercent(id,level)}% · 상시 적용`;
  if(id==='strategicTablet')return `배치 군사 장비의 초당·터치 골드 +${personalIncomePercent(id,level)}% · 상시 적용`;
  if(id==='supremeSeal')return `전체 초당·홈 터치 골드 +${personalIncomePercent(id,level)}% · 상시 적용`;
  return `${(AUTO_TOUCH.durationMs+(level-1)*AUTO_TOUCH.durationStepMs)/1000}초 동안 자동 터치`;
}
function effectMarkup(id,level) {
  let explanation;
  if(id==='commandBaton')explanation=Object.entries(BULK_RECRUIT).filter(([,rule])=>rule.level<=level).map(([unit])=>`${UNITS[unit].name} 100명 한 번에 모집`).join('<br>')+'<br>군사학교 해금 조건이 필요하며 모집 골드는 별도로 지불합니다. Lv.16부터 일괄 모집 비용이 레벨마다 2%p 할인되어 Lv.20에서 10% 할인됩니다. 1명 모집에는 적용되지 않습니다.';
  else if(id==='generalSword')explanation='사용 시점부터 10분 뒤 재사용합니다. 홈 터치와 리볼버 자동 터치에 적용되며 방치 수입과 전투에는 적용되지 않습니다.';
  else if(id==='divisionFlag')explanation='사단기를 1레벨 강화할 때마다 군사 장비 강화 한도가 1씩 늘어납니다. 이미 달성한 군사 장비 강화는 유지됩니다. 장비 추가 구매는 현재 잠겨 있습니다.';
  else if(id==='marshalGlaive')explanation=`보유하면 초당 골드가 기존의 ${1+(MARSHAL_GLAIVE.passiveBonusPercent+(level-1)*MARSHAL_GLAIVE.passiveBonusStep)/100}배가 됩니다. 병력·배치 장비의 점령 보너스가 포함된 수입에 적용하며 소수 골드는 버립니다. 오프라인 수입에도 적용됩니다. 터치 골드·리볼버 지급·전투 능력은 바꾸지 않습니다.`;
  else if(id==='admiralsCompass')explanation='보유하면 병력·배치 장비·시설을 포함한 홈 터치 골드에 적용됩니다. 장군검과 총사령관 인장은 각각 곱해서 적용되며 리볼버 자동 터치에도 반영됩니다. 방치 수입·전투 공격력은 바꾸지 않습니다. 계산 단계마다 소수 골드는 버립니다.';
  else if(id==='strategicTablet')explanation='연병장에 배치한 군사 장비의 초당·터치 수입 합계에 먼저 적용합니다. 병력의 기본 수입·보관 중인 장비·전투 능력은 바꾸지 않습니다. 시설·점령·다른 개인 장비 효과는 그 뒤에 각각 곱해서 적용됩니다. 장비 화면의 기본 능력에는 이 보너스가 포함되지 않습니다. 계산 단계마다 소수 골드는 버립니다.';
  else if(id==='supremeSeal')explanation='병력·배치 장비·시설·점령 보너스·언월도·제독의 나침반이 반영된 초당·홈 터치 수입에 마지막으로 적용합니다. 장군검은 추가로 2배가 됩니다. 오프라인 수입과 리볼버 자동 터치에도 적용되며 전투 능력은 바꾸지 않습니다. 계산 단계마다 소수 골드는 버립니다.';
  else explanation=`0.3초마다 현재 터치 보상을 받아 총 ${Math.floor((AUTO_TOUCH.durationMs+(level-1)*AUTO_TOUCH.durationStepMs)/AUTO_TOUCH.intervalMs)}회 지급합니다. 사용 시점부터 30분 뒤 재사용합니다. 장군검 효과가 적용되며, 재접속해도 남은 지급분만 정산합니다.`;
  return `<strong>${personalLevelEffect(id,level)}</strong><p>${explanation}</p><details class="personal-levels"><summary>Lv.1~${PERSONAL_EQUIPMENT[id].maxLevel} 능력 보기</summary>${Array.from({length:PERSONAL_EQUIPMENT[id].maxLevel},(_,i)=>`<p>Lv.${i+1} · ${personalLevelEffect(id,i+1)}</p>`).join('')}</details>`;
}
export function personalMarkup(state) {
  const cards=Object.values(PERSONAL_EQUIPMENT).map(item=>{
    const status=personalStatus(state,item.id);

    return `<article class="personal-item${status.owned?'':' locked'}" data-personal-equipment="${item.id}">
      <div class="personal-item-heading"><div class="personal-item-art">${personalIcon(item.icon,status.level||1)}</div>
      <div><span class="item-class">개인 장비</span><h3>${item.name} <small>Lv.${status.level||1}</small></h3>
      <p class="personal-item-status">${status.owned?'보유 중 · '+item.unlockRank+' 진급 보상':'🔒 '+item.unlockRank+' 진급 시 자동 지급'}</p></div></div>
      <div class="personal-item-actions"><button type="button" class="personal-detail" data-detail-personal="${item.id}">상세보기</button></div></article>`;
  }).join('');
  return cards||'<p class="shop-category-empty">진급하면 새로운 개인 장비가 공개됩니다.</p>';
}
export function personalDetailMarkup(state,id,{message=''}={}) {
  const item=PERSONAL_EQUIPMENT[id],status=personalStatus(state,id),level=status.level||1,offer=personalUpgradeOffer(state,id);
  const enhancement=status.owned?`<section class="personal-upgrade" data-personal-upgrade="${id}">
    <h3>골드로 강화 · 최대 Lv.${item.maxLevel}</h3><p>보유 골드 <b data-personal-wallet>${fmtGold(state.gold)} G</b></p>
    ${offer.reason==='max'?'<p>최대 레벨을 달성했어요.</p>':`<p>Lv.${level} → Lv.${level+1} · 확정 강화<br>강화 비용 <strong>${fmtGoldCost(offer.cost)} G</strong></p>
      <button class="detail-link" type="button" data-detail-action="enhance-personal" data-id="${id}"${offer.canUpgrade?'':' disabled'}>Lv.${level+1} 확정 강화</button>`}
    <p class="personal-upgrade-result" role="status">${message}</p><p data-personal-hint>${offer.reason==='gold'?'골드가 부족해요.':''}</p>
    ${offer.reason==='max'?'':`<p>다음 능력: ${personalLevelEffect(id,level+1)}</p>`}
    <p>표시된 골드를 지불하면 반드시 1레벨 상승합니다.</p>
    <button type="button" class="detail-link" data-detail-action="personal-upgrade-table" data-id="${id}">강화 비용·능력표</button></section>`:'<p class="personal-item-locked">진급 조건 달성 시 Lv.1을 자동 지급합니다.</p>';
  return {kicker:'개인 장비',title:`${item.name} <small>Lv.${level}</small>`,body:`<div data-personal-detail="${id}" data-level="${status.level}">
    ${enhancement}
    <div class="detail-art detail-art-wide">${personalIcon(item.icon,level)}</div>
    <p>${status.owned?'보유 중 · '+item.unlockRank+' 진급 보상':'🔒 '+item.unlockRank+' 진급 시 자동 지급'}</p>
    <div class="personal-item-effect">${effectMarkup(id,level)}</div>
    <p>진급은 장비를 처음 지급할 때만 필요하며, 이후 레벨은 골드 강화로 올립니다. 사용 중인 스킬의 시간은 다음 사용부터 바뀝니다.</p>
    ${status.owned?'':`<button type="button" class="detail-link" data-detail-action="personal-upgrade-table" data-id="${id}">강화 비용·능력표</button>`}</div>`};
}
export function personalUpgradeTableMarkup(id) {
  const item=PERSONAL_EQUIPMENT[id];
  return {kicker:'강화 비용·능력표',title:`${item.name} · 강화 안내`,body:`<p>골드로 반드시 1레벨 강화합니다. 최대 Lv.${item.maxLevel}이며 비용은 장비마다 다릅니다.</p>
    <table class="personal-upgrade-table"><caption>${item.name} · 확정 강화 비용</caption><thead><tr><th>단계</th><th>다음 능력</th><th>골드 비용</th></tr></thead><tbody>${Array.from({length:item.maxLevel-1},(_,i)=>{
      const step=personalUpgradeStep(id,i+1);return `<tr><td>Lv.${step.level} → ${step.nextLevel}</td><td>${personalLevelEffect(id,step.nextLevel)}</td><td>${fmtGoldCost(step.cost)} G</td></tr>`;
    }).join('')}</tbody></table>
    <p>표시된 비용으로 레벨 +1. 골드 부족·미보유·최대 레벨이면 비용을 차감하지 않습니다.</p><p>Lv.1~10의 능력은 유지하며, 기존에 강화한 레벨도 보존합니다.</p>
    <button type="button" class="detail-link" data-detail-action="personal-detail" data-id="${id}">장비 상세로 돌아가기</button>`};
}
