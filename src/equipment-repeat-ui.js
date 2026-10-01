import { EQUIPMENT, additionalEquipmentOffer, equipmentCount } from './equipment.js';
import { fmtGold } from './format.js';
export function repeatPurchaseMarkup(id) {
  return `<section class="additional-purchase" data-repeat-equipment="${id}" hidden>
    <h4>장비 추가 구매</h4><p>사단기 Lv.1 · 보유 장비 10강 이상 필요<br>현재 강화 단계 유지 · 같은 종류 한 칸<br>문마다 수입·전투 효과 합산</p>
    <div class="price-line"><span>1문 추가 비용</span><strong data-repeat-cost></strong></div>
    <p data-repeat-summary></p><button class="buy" data-buy-additional="${id}"></button>
  </section>`;
}
export function renderRepeatPurchase(s, root) {
  for (const section of root.querySelectorAll('[data-repeat-equipment]')) {
    const id = section.dataset.repeatEquipment, offer = additionalEquipmentOffer(s, id);
    section.hidden = !equipmentCount(s, id);
    const button = section.querySelector('[data-buy-additional]');
    button.disabled = !offer.canBuy;
    const set = (selector,value) => { const el=section.querySelector(selector);if(el.textContent!==value)el.textContent=value; };
    set('[data-repeat-cost]',fmtGold(offer.cost)+' G');
    set('[data-repeat-summary]',`최초 구매비 + ${offer.level}강까지 강화비 합계`);
    const label = offer.reason === 'locked' ? '소장 · 사단기 Lv.1부터 추가 구매'
      : offer.reason === 'enhancement' ? '먼저 10강까지 강화하세요'
      : offer.reason === 'limit' ? '보유 수량 한도 도달'
      : offer.reason === 'gold' ? fmtGold(offer.cost - s.gold) + ' G 부족'
      : `${EQUIPMENT[id].name} +${offer.level}강 1문 추가 구매`;
    if (button.textContent !== label) button.textContent = label;
  }
}
