import {equipmentCombatPower} from './battle-balance.js';
import {compactGuidePower} from './power-format.js';
import {subtractMoney} from './money.js';
import {fmtGold,fmtGoldCost} from './format.js';
import {EQUIPMENT,equipmentOf,equipmentStats,equipmentPurchaseOffer,enhancementOffer,visibleEquipment} from './equipment.js';
import {drawEquipment} from './equipment-art.js';

export const equipmentRole = (id) => EQUIPMENT[id]?.role ?? (id === 'transport' ? '보급 지원 · 같은 전선의 가까운 아군 장비 회복'
  : id === 'railgunTank' ? '레일건 사격 · 빠른 직선 자동 공격'
  : id === 'icbm' ? '대형 미사일 · 긴 대기 후 강한 자동 공격'
  : id === 'carrier' ? '함재기 지원 · 느린 전진과 긴 사거리의 자동 공격'
  : id === 'flyingFortress' ? '공중 중포격 · 튼튼한 기체로 지속 자동 공격'
  : id === 'orbitalAssault' ? '궤도 에너지 타격 · 출격 시 적 본부 직격'
  : id === 'fighter' ? '항공 타격 · 적 본부 자동 공격' : '화력 지원 · 적 본부 자동 공격');

const statLabels=new Map();
const upgradeLabels=new Map();
export function equipmentListStats(id,level=0) {
  const key=`${id}:${level}`;
  if(statLabels.has(key))return statLabels.get(key);
  const stats=equipmentStats(level,id);
  const text=`초당 ${fmtGold(stats.passive)} G · 터치당 ${fmtGold(stats.tap)} G · 전투력 ${compactGuidePower(BigInt(equipmentCombatPower(id,level)))}`;
  statLabels.set(key,text);return text;
}
// Preview uses the same exact income rules as the transaction, per equipment unit.
// It is cached by level so live balance updates do not recalculate the quote text.
export function equipmentListUpgrade(id,level) {
  const key=`${id}:${level}`;
  if(upgradeLabels.has(key))return upgradeLabels.get(key);
  const current=equipmentStats(level,id);
  if(level===EQUIPMENT[id].maxLevel)return '';
  const next=equipmentStats(level+1,id);
  const text=`다음 강화 · 초당 +${fmtGold(subtractMoney(next.passive,current.passive))} G · 터치 +${fmtGold(subtractMoney(next.tap,current.tap))} G`;
  upgradeLabels.set(key,text);return text;
}
function equipmentTile(d) {
  return `<article class="equip-tile equipment-list-card" data-equipment="${d.id}" aria-label="${d.name}">
    <div class="equipment-list-art"><canvas data-gun-preview width="220" height="124" role="img" aria-label="${d.name}"></canvas></div>
    <div class="equipment-list-info"><h3>${d.name} <small data-gear-level></small></h3><p class="equipment-list-stats" data-gear-stats title="장비 1대의 기본 능력 · 시설·개인장비·부스터 보너스 제외"></p><p class="equipment-list-next" data-gear-next title="장비 1대의 기본 골드 증가량 · 보너스 제외"></p><p class="equipment-list-status" data-gear-status></p></div>
    <button type="button" class="equipment-list-detail" data-detail-equipment="${d.id}" aria-label="${d.name} 상세보기"><span aria-hidden="true">ⓘ</span></button>
    <div class="equipment-list-action"><button type="button" class="buy" data-buy-equipment="${d.id}">구매</button><button type="button" class="buy" data-enhance-equipment="${d.id}" hidden>강화</button><small data-gear-price></small></div>
  </article>`;
}
export function equipmentStoreMarkup(state) {
  const items=visibleEquipment(state);
  return items.length?`<p class="strength-note">장비 1대 기준 · 수입 보너스 제외</p><section class="equipment-list">${items.map(equipmentTile).join('')}</section>`:'<p class="equipment-empty">공개된 장비가 없습니다.</p>';
}
const set=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value;};

// Keep existing cards and focus/scroll position; drawEquipment reuses cached
// sprites and skips canvases already painted with the same equipment level.
export function renderEquipmentStore(state,root,{active=true}={}) {
  for(const card of root.querySelectorAll('[data-equipment]')) {
    const id=card.dataset.equipment,d=EQUIPMENT[id],gun=equipmentOf(state,id);
    const purchase=equipmentPurchaseOffer(state,id),upgrade=enhancementOffer(state,id),q=selector=>card.querySelector(selector);
    const buy=q('[data-buy-equipment]'),enhance=q('[data-enhance-equipment]');
    buy.hidden=!!gun;buy.disabled=!active||!purchase.canBuy;
    enhance.hidden=!gun;enhance.disabled=!active||!upgrade.canUpgrade;
    card.classList.toggle('locked',!gun&&purchase.locked);
    set(q('[data-gear-level]'),gun?`Lv.${gun.level}`:'미보유');
    set(q('[data-gear-stats]'),equipmentListStats(id,gun?.level??0));
    set(q('[data-gear-next]'),gun&&upgrade.reason!=='max'?equipmentListUpgrade(id,gun.level):'');
    let status,price;
    if(gun) {
      const max=upgrade.reason==='max';
      status=upgrade.reason==='gold'?`${fmtGoldCost(subtractMoney(upgrade.cost,state.gold))} G 부족`:'';
      price=max?`현재 한도 Lv.${upgrade.limit}`:`${fmtGoldCost(upgrade.cost)} G`;
      set(enhance,max?(gun.level>upgrade.limit?`Lv.${gun.level} 유지`:upgrade.limit===d.maxLevel?'최대 강화':'강화 한도'):`강화 → Lv.${gun.level+1}`);
      enhance.setAttribute('aria-label',max?`${d.name} 현재 강화 한도 ${upgrade.limit}강`:`${d.name} ${gun.level+1}강 강화 · ${price}`);
    } else {
      status=purchase.locked?`${d.unlockRank} 진급 시 해금`:purchase.reason==='gold'?`${fmtGoldCost(subtractMoney(purchase.cost,state.gold))} G 부족`:'구매 시 자동 배치';
      price=`${fmtGoldCost(purchase.cost)} G`;
      set(buy,purchase.locked?'🔒 잠금':'구매');
      buy.setAttribute('aria-label',purchase.locked?`${d.name} · ${d.unlockRank} 진급 후 구매`:`${d.name} 구매 · ${price}`);
    }
    set(q('[data-gear-price]'),price);set(q('[data-gear-status]'),!active?'저장 상태를 확인해 주세요.':status);
    const canvas=q('[data-gun-preview]');drawEquipment(canvas,gun?.level??0,id);
    canvas.setAttribute('aria-label',`${d.name} ${gun?.level??0}강 외형`);
  }
}
