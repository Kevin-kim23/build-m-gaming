import { equipmentCount } from './equipment.js';
export function repeatPurchaseMarkup(id) {
  return `<section class="additional-purchase" data-repeat-equipment="${id}" hidden>
    <h4>장비 추가 구매</h4>
    <p>현재는 종류별 1문을 강화해 운용합니다.</p>
    <button class="buy" data-buy-additional="${id}" disabled>🔒 장비 추가 구매 잠금</button>
  </section>`;
}
export function renderRepeatPurchase(s, root) {
  for (const section of root.querySelectorAll('[data-repeat-equipment]')) {
    section.hidden = !equipmentCount(s,section.dataset.repeatEquipment);
    section.querySelector('[data-buy-additional]').disabled = true;
  }
}
