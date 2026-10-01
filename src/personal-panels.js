import { personalIcon } from './personal-art.js';
import { UNITS } from './units.js';
import { fmtGold, fmtGoldCost } from './format.js';
import { PERSONAL_EQUIPMENT, GENERAL_SWORD, AUTO_TOUCH } from './personal-catalog.js';
import { BULK_RECRUIT, personalStatus } from './personal-equipment.js';
import { personalUpgradeOffer, personalUpgradeStep } from './personal-enhancement.js';

export function personalLevelEffect(id,level) {
  if(id==='commandBaton')return `${UNITS[Object.keys(BULK_RECRUIT)[level-1]].name}까지 병종별 100명 모집`;
  if(id==='generalSword')return `${(GENERAL_SWORD.durationMs+(level-1)*GENERAL_SWORD.durationStepMs)/1000}초 동안 터치 골드 2배`;
  if(id==='divisionFlag')return `장비 최대 ${10+level}강 해금`;
  return `${(AUTO_TOUCH.durationMs+(level-1)*AUTO_TOUCH.durationStepMs)/1000}초 동안 자동 터치`;
}
function effectMarkup(id,level) {
  let explanation;
  if(id==='commandBaton')explanation=Object.entries(BULK_RECRUIT).filter(([,rule])=>rule.level<=level).map(([unit])=>`${UNITS[unit].name} 100명 한 번에 모집`).join('<br>')+'<br>군사학교 해금 조건이 필요하며 모집 골드는 별도로 지불합니다.';
  else if(id==='generalSword')explanation='사용 시점부터 10분 뒤 재사용합니다. 홈 터치와 리볼버 자동 터치에 적용되며 방치 수입과 전투에는 적용되지 않습니다.';
  else if(id==='divisionFlag')explanation='사단기를 1레벨 강화할 때마다 군사 장비 강화 한도가 1씩 늘어납니다. 이미 달성한 군사 장비 강화는 유지됩니다. 장비 추가 구매는 현재 잠겨 있습니다.';
  else explanation=`0.3초마다 현재 터치 보상을 받아 총 ${Math.floor((AUTO_TOUCH.durationMs+(level-1)*AUTO_TOUCH.durationStepMs)/AUTO_TOUCH.intervalMs)}회 지급합니다. 사용 시점부터 30분 뒤 재사용합니다. 장군검 효과가 적용되며, 재접속해도 남은 지급분만 정산합니다.`;
  return `<strong>${personalLevelEffect(id,level)}</strong><p>${explanation}</p><details class="personal-levels"><summary>Lv.1~10 능력 보기</summary>${Array.from({length:10},(_,i)=>`<p>Lv.${i+1} · ${personalLevelEffect(id,i+1)}</p>`).join('')}</details>`;
}
export function personalMarkup(state) {
  const cards=Object.values(PERSONAL_EQUIPMENT).map(item=>{
    const status=personalStatus(state,item.id);
    if(!status.visible)return '';
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
    ${offer.reason==='max'?'<p>최대 레벨을 달성했어요.</p>':`<p>Lv.${level} → Lv.${level+1} · 성공 <strong>${offer.chance}%</strong><br>다음 능력: ${personalLevelEffect(id,level+1)}</p><p>1회 비용 <strong>${fmtGoldCost(offer.cost)} G</strong></p>
      <button class="detail-link" type="button" data-detail-action="enhance-personal" data-id="${id}"${offer.canUpgrade?'':' disabled'}>Lv.${level+1} 강화 시도 · ${offer.chance}%</button><p data-personal-hint>${offer.reason==='gold'?'골드가 부족해요.':''}</p>`}
    <p>시도할 때마다 비용을 소모합니다. 실패해도 현재 레벨은 유지됩니다.</p><p>진급은 장비를 처음 지급할 때만 필요하며, 이후 레벨은 골드 강화로 올립니다. 사용 중인 스킬의 시간은 다음 사용부터 바뀝니다.</p></section>`:'<p class="personal-item-locked">진급 조건 달성 시 Lv.1을 자동 지급합니다.</p>';
  return {kicker:'개인 장비',title:`${item.name} <small>Lv.${level}</small>`,body:`<div data-personal-detail="${id}" data-level="${status.level}">
    <p class="personal-upgrade-result" role="status">${message}</p>
    <div class="detail-art detail-art-wide">${personalIcon(item.icon,level)}</div>
    <p>${status.owned?'보유 중 · '+item.unlockRank+' 진급 보상':'🔒 '+item.unlockRank+' 진급 시 자동 지급'}</p>
    <div class="personal-item-effect">${effectMarkup(id,level)}</div>${enhancement}
    <button type="button" class="detail-link" data-detail-action="personal-rates" data-id="${id}">강화 확률표</button></div>`};
}
export function personalRatesMarkup(id) {
  const item=PERSONAL_EQUIPMENT[id];
  return {kicker:'강화 확률표',title:`${item.name} · 강화 확률`,body:`<p>모든 개인 장비는 아래의 동일한 성공 확률을 사용합니다. 비용은 장비마다 다릅니다.</p>
    <table class="personal-rates"><caption>${item.name} · 1회 시도 기준</caption><thead><tr><th>단계</th><th>성공</th><th>골드 비용</th></tr></thead><tbody>${Array.from({length:item.maxLevel-1},(_,i)=>{
      const step=personalUpgradeStep(id,i+1);return `<tr><td>Lv.${step.level} → ${step.nextLevel}</td><td>${step.chance}%</td><td>${fmtGoldCost(step.cost)} G</td></tr>`;
    }).join('')}</tbody></table>
    <p>성공: 레벨 +1 · 실패: 현재 레벨 유지<br>성공·실패 모두 표시한 비용을 소모합니다.</p><p>매 시도는 독립적입니다. 연속 실패·계급·보유 골드에 따른 숨은 확률 보정이나 확정 성공 누적은 없습니다.</p>
    <button type="button" class="detail-link" data-detail-action="personal-detail" data-id="${id}">장비 상세로 돌아가기</button>`};
}
