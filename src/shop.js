import { fmtGold } from "./format.js";
import { UNITS, unitAccess } from "./units.js";
import { schoolsMarkup } from "./school-panels.js";
import { COMMAND_BATON, BULK_RECRUIT, bulkRecruitAccess, commandBatonStatus } from "./personal-equipment.js";

export const SHOP_CATEGORIES = Object.freeze([
  Object.freeze({ id: "recruit", name: "군대 모집" }),
  Object.freeze({ id: "schools", name: "군사학교" }),
]);

// The 100-unit button exists only for units the command baton can bulk-recruit.
// Before the baton unlocks it shows as a locked placeholder (no purchase attributes).
function bulkSlot(s, unit) {
  if (!BULK_RECRUIT[unit.id]) return { button: "", price: "" };
  const amount = COMMAND_BATON.recruitAmount, access = bulkRecruitAccess(s, unit.id);
  if (access.unlocked) return {
    button: `<button class="buy bulk-buy" data-buy-bulk="${unit.id}" aria-label="${unit.name} ${amount}명 모집">${amount}명</button>`,
    price: `<p class="tile-price tile-price-bulk" data-bulk-unit="${unit.id}"><small>${amount}명</small><b data-bulk-price></b></p>`,
  };
  return { price: "", button: commandBatonStatus(s).visible
    ? `<button class="buy bulk-buy" disabled data-bulk-locked="${unit.id}" aria-label="${unit.name} ${amount}명 모집 잠김 (지휘봉 필요)">${amount}명</button>` : "" };
}

// One compact tile per unit: icon, name, abilities, price, 1/100 buttons. Details live in a popup.
function recruitTile(s, unit) {
  const bulk = bulkSlot(s, unit);
  return `<article class="recruit-tile" data-unit="${unit.id}" aria-label="${unit.name} 모집">
    <div class="tile-visual"><button type="button" class="tile-detail" data-detail-unit="${unit.id}" aria-label="${unit.name} 상세보기">ⓘ</button><canvas data-portrait="${unit.id}" width="80" height="100" role="img" aria-label="${unit.name} 픽셀 그림"></canvas></div>
    <h3>${unit.name}</h3><span class="tile-owned" data-field="owned"></span>${unit.role ? `<small class="tile-role">${unit.role}</small>` : ''}
    <p class="tile-stats"><span><small>초당</small> <b>${fmtGold(unit.passive)}</b></span><span><small>터치</small> <b>${fmtGold(unit.tap)}</b></span></p>
    <p class="tile-price"><b data-field="price"></b></p>${bulk.price}
    <div class="tile-buttons${bulk.button ? "" : " single"}"><button class="buy" data-buy="${unit.id}" aria-label="${unit.name} 1명 모집">1명</button>${bulk.button}</div>
    <p class="tile-hint" data-field="hint">${unitAccess(s, unit).unlocked ? "" : "🔒 " + unitAccess(s, unit).requirement}</p>
  </article>`;
}

function recruitmentMarkup(s) {
  return `<div class="unit-list recruit-grid">${Object.values(UNITS).filter((unit) => unitAccess(s, unit).visible).map((unit) => recruitTile(s, unit)).join("")}</div>
  <p class="strength-note">간부 모집은 학교 레벨로 해금합니다.<br>모집 가격은 병력 종류별로 따로 증가합니다.</p>`;
}

export function shopMarkup(s, coin, insignia, category = "recruit") {
  const selected = SHOP_CATEGORIES.some((item) => item.id === category) ? category : "recruit";
  const content = selected === "recruit"
    ? recruitmentMarkup(s)
    : schoolsMarkup(s);
  return `<div class="sheet-grip"></div>
  <div class="shop-header"><div><small>SUPPLY OFFICE</small><h2 id="modal-title">상점</h2></div><button id="close-shop" aria-label="상점 닫기">×</button></div>
  <div class="shop-wallet"><span>보유 골드</span><strong>${coin}<b id="shop-gold"></b><small>G</small></strong></div>
  <p class="shop-guide" id="shop-guide"></p>
  <nav class="shop-categories" aria-label="상점 분류">${SHOP_CATEGORIES.map((item) => `<button type="button" data-shop-category="${item.id}" aria-pressed="${selected === item.id}">${item.name}</button>`).join("")}</nav>
  <p id="shop-message" role="status" aria-live="polite"></p>
  <div class="shop-category-content" data-shop-content="${selected}">${content}</div>`;
}
