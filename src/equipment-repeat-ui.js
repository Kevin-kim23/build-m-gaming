import { EQUIPMENT, additionalEquipmentCost, additionalEquipmentOffer, equipmentCount } from './equipment.js';
import { GENERAL_SWORD } from './personal-equipment.js';
import { fmt } from './format.js';

export function repeatPurchaseMarkup(id) {
  return `<section class="additional-purchase" data-repeat-equipment="${id}" hidden>
    <h4>10강 장비 추가 구매</h4><p>장군검 Lv.${GENERAL_SWORD.repeatPurchaseLevel} · 보유 장비 10강 필요<br>새 장비도 10강 · 같은 종류는 한 칸에 배치<br>문마다 수입·전투 공격력 합산</p>
    <div class="price-line"><span>1문 추가 비용</span><strong>${fmt(additionalEquipmentCost(id))} <small>G</small></strong></div>
    <p>최초 구매비 + 10강까지 강화비 합계</p><button class="buy" data-buy-additional="${id}"></button>
  </section>`;
}
export function renderRepeatPurchase(s, root) {
  for (const section of root.querySelectorAll('[data-repeat-equipment]')) {
    const id = section.dataset.repeatEquipment, offer = additionalEquipmentOffer(s, id);
    section.hidden = !equipmentCount(s, id);
    const button = section.querySelector('[data-buy-additional]');
    button.disabled = !offer.canBuy;
    const label = offer.reason === 'locked' ? `소장 · 장군검 Lv.${GENERAL_SWORD.repeatPurchaseLevel}부터 추가 구매`
      : offer.reason === 'enhancement' ? '먼저 10강까지 강화하세요'
      : offer.reason === 'limit' ? '보유 수량 한도 도달'
      : offer.reason === 'gold' ? fmt(offer.cost - s.gold) + ' G 부족'
      : `${EQUIPMENT[id].name} +10강 1문 추가 구매`;
    if (button.textContent !== label) button.textContent = label;
  }
}
