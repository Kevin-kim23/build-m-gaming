import { fmt } from "./format.js";
import { equipmentStoreMarkup } from "./equipment-panels.js";
import { UNITS } from "./units.js";
import { FORMATIONS } from "./formations.js";
import { RANK_DEFINITIONS, catalogVisible } from "./ranks.js";
import { COMMAND_BATON, commandBatonStatus } from "./personal-equipment.js";

export const SHOP_CATEGORIES = Object.freeze([
  Object.freeze({ id: "recruit", name: "군대 모집" }),
  Object.freeze({ id: "equipment", name: "장비 구매" }),
  Object.freeze({ id: "personal", name: "개인 장비" }),
]);

function bulkRecruitMarkup(coin) {
  return `<section class="bulk-recruit" aria-label="일반병 일괄 모집">
    <div class="bulk-recruit-title"><b>${COMMAND_BATON.name} 효과</b><span>${COMMAND_BATON.recruitAmount}명 일괄 모집</span></div>
    <div class="price-line"><span>${COMMAND_BATON.recruitAmount}명 총비용</span><strong>${coin}<b data-bulk-price></b><small>G</small></strong></div>
    <button class="buy bulk-buy" data-buy-bulk="soldier"><span data-bulk-label>일반병 ${COMMAND_BATON.recruitAmount}명 모집</span><span aria-hidden="true">＋</span></button>
    <p class="unit-price-note">${COMMAND_BATON.recruitAmount}명을 차례로 모집하는 것과 같은 비용입니다.</p>
  </section>`;
}

// One shared card template; adding a unit does not duplicate purchase UI logic.
function recruitmentMarkup(s, coin, insignia) {
  const bulkAvailable = commandBatonStatus(s).owned;
  return `<div class="unit-list">${Object.values(UNITS)
    .filter((unit) => catalogVisible(s, unit.unlockRank))
    .map(
      (unit) => `
   <article class="unit-card" data-unit="${unit.id}" aria-label="${unit.name} 모집">
    <div class="recruit-card">
     <div class="recruit-visual"><canvas data-portrait="${unit.id}" width="80" height="100" role="img" aria-label="${unit.name} 픽셀 그림"></canvas></div>
     <div class="recruit-info"><span class="item-class">${unit.id === "soldier" ? "기본 병력" : "전력 " + unit.power + " · 간부"}</span>
      <h3>${unit.name}</h3><span data-field="owned"></span>
      <p>한 명마다 <b>초당 +${unit.passive} G</b><br>한 명마다 <b>터치 +${unit.tap} G</b></p>
     </div>
    </div>
    <p class="unit-unlock" data-field="unlock"></p>
    <div class="price-line"><span>이번 모집 비용</span><strong>${coin}<b data-field="price"></b><small>G</small></strong></div>
    <button class="buy" data-buy="${unit.id}"><span data-field="label"></span><span aria-hidden="true">＋</span></button>
    <p class="unit-price-note">${unit.name} 모집 시에만 가격 상승</p>
    ${unit.id === "soldier" && bulkAvailable ? bulkRecruitMarkup(coin) : ""}
   </article>`,
    )
    .join("")}
  </div>
  <p class="strength-note">진급·편제: 하사 1명 = 전력 10${catalogVisible(s, "소령") ? " · 중사 1명 = 전력 20" : ""}<br>모집 가격은 병력 종류별로 따로 증가합니다.</p>
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

// Original pixel geometry; no external image or insignia asset is used.
function batonIcon() {
  return `<svg class="command-baton-art" viewBox="0 0 96 96" role="img" aria-label="${COMMAND_BATON.name} 픽셀 그림" shape-rendering="crispEdges">
    <path fill="#111f1966" d="M45 22h14v60H45zM39 76h26v8H39z"/>
    <path fill="#283b32" d="M41 20h14v56H41z"/>
    <path fill="#556953" d="M43 20h4v56h-4z"/>
    <path fill="#192b25" d="M51 20h4v56h-4z"/>
    <path fill="#a89056" d="M37 14h22v12H37zM37 70h22v10H37zM41 39h14v6H41z"/>
    <path fill="#e9d398" d="M39 12h18v7H39zM39 70h18v4H39zM41 39h14v2H41z"/>
    <path fill="#75653e" d="M37 22h22v4H37zM37 77h22v3H37z"/>
    <path fill="#f6e5ac" d="M46 28h4v4h-4zM44 32h8v4h-8zM46 36h4v3h-4z"/>
  </svg>`;
}

function personalMarkup(s) {
  const status = commandBatonStatus(s);
  if (!status.visible)
    return '<p class="shop-category-empty">진급하면 새로운 개인 장비가 공개됩니다.</p>';
  return `<article class="personal-item${status.owned ? "" : " locked"}" data-personal-equipment="${COMMAND_BATON.id}">
    <div class="personal-item-heading"><div class="personal-item-art">${batonIcon()}</div>
      <div><span class="item-class">지휘관 개인 장비</span><h3>${COMMAND_BATON.name} <small>Lv.${COMMAND_BATON.level}</small></h3><p class="personal-item-status">${status.owned ? "보유 중 · 중령 진급 보상" : "🔒 " + COMMAND_BATON.unlockRank + " 진급 시 자동 지급"}</p></div>
    </div>
    <div class="personal-item-effect"><strong>일반병 ${COMMAND_BATON.recruitAmount}명 한 번에 모집</strong><p>군대 모집에서 ${COMMAND_BATON.recruitAmount}명 모집 버튼을 사용할 수 있어요.<br>병사 모집에 필요한 골드는 별도로 지불합니다.</p></div>
    ${status.owned
      ? '<button class="personal-recruit-link" data-shop-category="recruit">군대 모집으로 이동 <span aria-hidden="true">→</span></button>'
      : '<p class="personal-item-locked">진급 조건을 달성하면 자동으로 지급됩니다.</p>'}
  </article>`;
}

export function shopMarkup(s, coin, insignia, category = "recruit") {
  const selected = SHOP_CATEGORIES.some((item) => item.id === category) ? category : "recruit";
  const content = selected === "recruit"
    ? recruitmentMarkup(s, coin, insignia)
    : selected === "equipment"
      ? equipmentStoreMarkup(s) || '<p class="shop-category-empty">진급하면 새로운 장비가 공개됩니다.</p>'
      : personalMarkup(s);
  return `<div class="sheet-grip"></div>
  <div class="shop-header"><div><small>SUPPLY OFFICE</small><h2 id="modal-title">상점</h2></div><button id="close-shop" aria-label="상점 닫기">×</button></div>
  <div class="shop-wallet"><span>보유 골드</span><strong>${coin}<b id="shop-gold"></b><small>G</small></strong></div>
  <nav class="shop-categories" aria-label="상점 분류">${SHOP_CATEGORIES.map((item) => `<button type="button" data-shop-category="${item.id}" aria-pressed="${selected === item.id}">${item.name}</button>`).join("")}</nav>
  <p id="shop-message" role="status" aria-live="polite"></p>
  <div class="shop-category-content" data-shop-content="${selected}">${content}</div>`;
}
