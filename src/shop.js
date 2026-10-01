import { fmt, fmtGold } from "./format.js";
import { equipmentStoreMarkup } from "./equipment-panels.js";
import { UNITS, unitAccess } from "./units.js";
import { schoolsMarkup } from "./school-panels.js";
import { FORMATIONS } from "./formations.js";
import { RANK_DEFINITIONS } from "./ranks.js";
import { COMMAND_BATON, bulkRecruitAccess } from "./personal-equipment.js";

export const SHOP_CATEGORIES = Object.freeze([
  Object.freeze({ id: "recruit", name: "군대 모집" }),
  Object.freeze({ id: "equipment", name: "장비 구매" }),
  Object.freeze({ id: "schools", name: "군사학교" }),
]);

function bulkRecruitMarkup(coin, unit) {
  return `<section class="bulk-recruit" data-bulk-unit="${unit.id}" aria-label="${unit.name} 일괄 모집">
    <div class="bulk-recruit-title"><b>${COMMAND_BATON.name} 효과</b><span>${COMMAND_BATON.recruitAmount}명 일괄 모집</span></div>
    <div class="price-line"><span>${COMMAND_BATON.recruitAmount}명 총비용</span><strong>${coin}<b data-bulk-price></b><small>G</small></strong></div>
    <button class="buy bulk-buy" data-buy-bulk="${unit.id}"><span data-bulk-label>${unit.name} ${COMMAND_BATON.recruitAmount}명 모집</span><span aria-hidden="true">＋</span></button>
    <p class="unit-price-note">${COMMAND_BATON.recruitAmount}명을 차례로 모집하는 것과 같은 비용입니다.</p>
  </section>`;
}

// One shared card template; adding a unit does not duplicate purchase UI logic.
function recruitmentMarkup(s, coin, insignia) {
  return `<div class="unit-list">${Object.values(UNITS)
    .filter((unit) => unitAccess(s, unit).visible)
    .map(
      (unit) => `
   <article class="unit-card" data-unit="${unit.id}" aria-label="${unit.name} 모집">
    <div class="recruit-card">
     <div class="recruit-visual"><canvas data-portrait="${unit.id}" width="80" height="100" role="img" aria-label="${unit.name} 픽셀 그림"></canvas></div>
     <div class="recruit-info"><span class="item-class">${unit.id === "soldier" ? "기본 병력" : "전력 " + unit.power + " · 간부"}</span>
      <h3>${unit.name}</h3><span data-field="owned"></span>
      <p>한 명마다 <b>초당 +${fmtGold(unit.passive)} G</b><br>한 명마다 <b>터치 +${fmtGold(unit.tap)} G</b></p>
     </div>
    </div>
    <p class="unit-unlock" data-field="unlock">${unitAccess(s,unit).requirement}</p>
    ${unit.school ? '<button class="unit-school-link" data-shop-category="schools">군사학교 건설·확장 →</button>' : ''}
    <div class="price-line"><span>이번 모집 비용</span><strong>${coin}<b data-field="price"></b><small>G</small></strong></div>
    <button class="buy" data-buy="${unit.id}"><span data-field="label"></span><span aria-hidden="true">＋</span></button>
    <p class="unit-price-note">${unit.name} 모집 시에만 가격 상승</p>
    ${bulkRecruitAccess(s, unit.id).unlocked ? bulkRecruitMarkup(coin, unit) : ""}
   </article>`,
    )
    .join("")}
  </div>
  <p class="strength-note">간부 모집은 학교 레벨로 해금합니다.<br>모집 가격은 병력 종류별로 따로 증가합니다.</p>
  <details class="shop-ranks shop-rank-guide"><summary>진급 조건 보기</summary><div class="shop-ranks-title"><b>전력이 쌓이면, 계급도 올라갑니다</b><small>조건 달성 시 자동 진급</small></div>
   <div class="rank-steps">${RANK_DEFINITIONS.map((r, i) => `<div class="rank-step" data-rank="${i}">${insignia(i)}<b>${r.name}</b><small>전력 ${fmt(r.required)}</small><em>${i >= 4 ? r.condition : ""}</em></div>`).join("")}</div><p id="shop-next"></p>
  </details>
  <details class="formation-guide"><summary>분대부터 야전군까지 · 편제 안내</summary><p>총 전력으로 묶어 표시합니다. 실제 보유 인원은 그대로입니다. 대위부터 분대 이상, 대대부터 소대 이상, 연대부터 중대 이상, 사단부터 대대 이상, 군단부터 연대 이상, 야전군부터 사단 이상만 연병장에 표시합니다. 공간이 부족하면 같은 편제를 수량으로 묶습니다.</p>
   <div class="formation-guide-grid">${FORMATIONS.filter(
     (f) => f.id !== "soldier",
   )
     .slice()
     .reverse()
     .map(
       (f) =>
         `<div><canvas data-formation="${f.id}" width="96" height="82" role="img" aria-label="${f.name} 건물 아이콘"></canvas><b>${f.name}</b><span>전력 ${fmt(f.size)}</span></div>`,
     )
     .join("")}</div>
  </details>`;
}

export function shopMarkup(s, coin, insignia, category = "recruit") {
  const selected = SHOP_CATEGORIES.some((item) => item.id === category) ? category : "recruit";
  const content = selected === "recruit"
    ? recruitmentMarkup(s, coin, insignia)
    : selected === "equipment"
      ? equipmentStoreMarkup(s) || '<p class="shop-category-empty">진급하면 새로운 장비가 공개됩니다.</p>'
      : schoolsMarkup(s);
  return `<div class="sheet-grip"></div>
  <div class="shop-header"><div><small>SUPPLY OFFICE</small><h2 id="modal-title">상점</h2></div><button id="close-shop" aria-label="상점 닫기">×</button></div>
  <div class="shop-wallet"><span>보유 골드</span><strong>${coin}<b id="shop-gold"></b><small>G</small></strong></div>
  <nav class="shop-categories" aria-label="상점 분류">${SHOP_CATEGORIES.map((item) => `<button type="button" data-shop-category="${item.id}" aria-pressed="${selected === item.id}">${item.name}</button>`).join("")}</nav>
  <p id="shop-message" role="status" aria-live="polite"></p>
  <div class="shop-category-content" data-shop-content="${selected}">${content}</div>`;
}
