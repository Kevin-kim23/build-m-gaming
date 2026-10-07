import { subtractMoney } from './money.js';
import { fmt, fmtGold, fmtGoldCost } from './format.js';
import {
  EQUIPMENT, equipmentOf, equipmentCount, equipmentStats,
  equipmentPurchaseOffer, visibleEquipment,
} from './equipment.js';
import { drawEquipment } from './equipment-art.js';

export const equipmentRole = (id) => id === 'transport' ? '보급 지원 · 전투 중 아군 본부 회복'
  : id === 'railgunTank' ? '레일건 사격 · 빠른 직선 자동 공격'
  : id === 'icbm' ? '대형 미사일 · 긴 대기 후 강한 자동 공격'
  : id === 'fighter' ? '항공 타격 · 적 본부 자동 공격' : '화력 지원 · 적 본부 자동 공격';

// One wide row per item. Everything else (role, limits, exact numbers) is in the detail popup.
function equipmentTile(d) {
  return `<article class="equip-tile" data-equipment="${d.id}" aria-label="${d.name} 구매">
    <div class="equip-visual"><button type="button" class="tile-detail" data-detail-equipment="${d.id}" aria-label="${d.name} 상세보기">ⓘ</button><canvas data-gun-preview width="220" height="124" role="img" aria-label="${d.name}"></canvas></div>
    <div class="equip-info">
      <h3>${d.name} <small data-gear-count></small></h3>
      <p class="tile-stats equip-stats"><span><small>초당</small> <b data-gear-passive></b></span><span><small>터치</small> <b data-gear-tap></b></span></p>
      <p class="tile-price" data-gear-price>${fmtGoldCost(d.cost)}</p>
      <p class="tile-price tile-price-bulk" data-repeat-price hidden><small>+1문</small><b data-repeat-cost></b></p>
      <div class="tile-buttons single"><button class="buy" data-buy-equipment="${d.id}">구매</button>
      <button class="buy" data-manage-equipment="${d.id}" hidden>관리</button>
      <button class="buy" data-buy-additional="${d.id}" hidden aria-label="${d.name} 1문 추가 구매">+1문</button></div>
      <p class="tile-hint" data-gear-status></p>
    </div>
  </article>`;
}

export function equipmentStoreMarkup(s) {
  const items = visibleEquipment(s);
  if (!items.length) return '';
  return `<section class="equipment-store"><div class="equip-grid">${items.map(equipmentTile).join('')}</div>
    <p class="strength-note">구매 시 자동 배치 · 연병장을 좌우로 넘겨 확인하세요.<br>자세한 내용은 ⓘ 상세보기에서 확인하세요.</p></section>`;
}

const set = (node, value) => { if (node.textContent !== value) node.textContent = value; };

export function renderEquipmentStore(s, root) {
  root.querySelectorAll('[data-equipment]').forEach((card) => {
    const id = card.dataset.equipment, d = EQUIPMENT[id];
    const offer = equipmentPurchaseOffer(s, id), gun = equipmentOf(s, id), count = equipmentCount(s, id);
    const stats = equipmentStats(gun?.level ?? 0, id), q = (selector) => card.querySelector(selector);
    set(q('[data-gear-count]'), gun ? `[${fmt(count)}문]` : '');
    set(q('[data-gear-passive]'), fmtGold(stats.passive * (count || 1)));
    set(q('[data-gear-tap]'), fmtGold(stats.tap * (count || 1)));
    q('[data-gear-price]').hidden = !!gun;
    const buy = q('[data-buy-equipment]'), manage = q('[data-manage-equipment]'), more = q('[data-buy-additional]');
    buy.hidden = !!gun; buy.disabled = !offer.canBuy;
    manage.hidden = !gun;
    more.hidden = true; more.disabled = true;
    q('.tile-buttons').classList.add('single');
    let hint = offer.locked ? `🔒 ${d.unlockRank} 진급 시 해금` : '';
    if (gun) {
      q('[data-repeat-price]').hidden = true;
      hint = `+${gun.level}강 · 추가 구매 잠금`;
    } else {
      q('[data-repeat-price]').hidden = true;
      if (offer.reason === 'gold') hint = `${fmtGoldCost(subtractMoney(offer.cost,s.gold))} 부족`;
    }
    set(q('[data-gear-status]'), hint);
    card.classList.toggle('locked', offer.locked);
    drawEquipment(q('canvas'), gun?.level ?? 0, id);
  });
}
