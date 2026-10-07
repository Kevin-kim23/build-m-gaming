import { subtractMoney } from './money.js';
import { personalMarkup } from "./personal-panels.js";
import { repeatPurchaseMarkup, renderRepeatPurchase } from "./equipment-repeat-ui.js";
import { fmt, fmtGold, fmtGoldCost } from "./format.js";
import {
  EQUIPMENT,
  deployedEquipment, deploymentOffer,
  equipmentOf, equipmentCount,
  equipmentPurchaseOffer,
  enhancementOffer,
  visibleEquipment,
} from "./equipment.js";
import { drawEquipment } from "./equipment-art.js";

const text = (root, id, value) => {
  const node = root.querySelector("#" + id);
  if (node && node.textContent !== value) node.textContent = value;
};
export function panelTabs(mode) {
  return `<nav class="panel-tabs" role="tablist" aria-label="부대 메뉴"><button role="tab" aria-selected="${mode === "shop"}" data-panel="shop">상점</button><button role="tab" aria-selected="${mode === "equipment"}" data-panel="equipment">장비</button></nav>`;
}
export { equipmentStoreMarkup, renderEquipmentStore } from "./equipment-tiles.js";
export function equipmentPanelMarkup(s, id, category = "military") {
  const items = visibleEquipment(s),
    d = EQUIPMENT[id];
  const head = `<div class="sheet-grip"></div><div class="shop-header"><div><small>EQUIPMENT</small><h2 id="modal-title">장비 구매 · 관리</h2></div><button id="close-equipment" aria-label="장비 닫기">×</button></div><div class="shop-wallet"><span>보유 골드</span><strong><b id="equipment-gold"></b><small>G</small></strong></div><nav class="shop-categories equipment-categories" aria-label="장비 분류"><button data-equipment-category="military" aria-pressed="${category === "military"}">군사 장비</button><button data-equipment-category="personal" aria-pressed="${category === "personal"}">개인 장비</button></nav>`;
  if (category === "personal") return head + personalMarkup(s) + '<p id="equipment-message" role="status" aria-live="polite"></p>';
  if (!items.some((item) => item.id === id))
    return (
      head + '<p class="equipment-empty">진급하면 새로운 장비가 공개됩니다.</p>'
    );
  return (
    head +
    `<p class="deployment-count" id="deployment-count"></p><nav class="equipment-select" aria-label="관리할 장비">${items.map((item) => `<button data-select-equipment="${item.id}" aria-pressed="${id === item.id}">${item.name} <span data-select-count="${item.id}">[${fmt(equipmentCount(s, item.id))}문]</span></button>`).join("")}</nav><article class="equipment-detail"><div class="equipment-detail-title"><div><h3>${d.name} <b id="equipment-level"></b></h3><span class="equipment-quantity" id="equipment-count"></span></div><span id="equipment-deployed"></span><button type="button" class="detail-open" data-detail-equipment="${id}" aria-label="${d.name} 능력 상세보기">능력 상세</button></div><div class="equipment-preview"><canvas data-gun-preview width="440" height="248" role="img" aria-label="${d.name} 외형"></canvas></div><p id="equipment-empty"></p><button class="buy" id="purchase-equipment" data-buy-equipment="${id}">${d.name} 구매</button><div id="owned-equipment" hidden><button class="equipment-deploy" id="toggle-equipment"></button><section class="enhancement-box"><div class="price-line"><span>강화 비용</span><strong id="enhancement-cost"></strong></div><button class="buy" id="enhance-equipment"></button></section>${repeatPurchaseMarkup(id)}</div></article><p id="equipment-message" role="status" aria-live="polite"></p>`
  );
}
export function renderEquipmentPanel(s, root, id) {
  text(root, "equipment-gold", fmtGold(s.gold));
  if (!root.querySelector("#equipment-level")) return;
  text(root, "deployment-count", `연병장 ${deployedEquipment(s).length}종 배치 · 좌우로 넘겨 확인하세요.`);
  const d = EQUIPMENT[id],
    gun = equipmentOf(s, id),
    offer = enhancementOffer(s, id),
    level = gun?.level ?? 0,
    purchase = equipmentPurchaseOffer(s, id);
  text(root, "equipment-level", gun ? "+" + level : "");
  text(root, "equipment-count", `[${fmt(equipmentCount(s, id))}문]`);
  for (const node of root.querySelectorAll("[data-select-count]")) node.textContent = `[${fmt(equipmentCount(s, node.dataset.selectCount))}문]`;
  renderRepeatPurchase(s, root);
  text(
    root,
    "equipment-deployed",
    gun ? (gun.deployed ? "배치 중" : "보관 중") : "미보유",
  );
  text(
    root,
    "equipment-empty",
    gun
      ? ""
      : purchase.locked
        ? d.unlockRank + " 진급 후 구매할 수 있어요."
        : fmtGoldCost(d.cost) + " 골드로 구매할 수 있어요.",
  );
  const buy = root.querySelector("#purchase-equipment");
  buy.hidden = !!gun;
  buy.disabled = !purchase.canBuy;
  text(root, "purchase-equipment", purchase.locked ? `🔒 ${d.unlockRank} 해금` : purchase.reason === 'gold'
    ? `${fmtGoldCost(subtractMoney(purchase.cost,s.gold))} G 부족` : `${d.name} 구매 · ${fmtGoldCost(purchase.cost)} G`);
  root.querySelector("#owned-equipment").hidden = !gun;
  const canvas = root.querySelector("[data-gun-preview]");
  drawEquipment(canvas, level, id);
  canvas.setAttribute("aria-label", d.name + " " + level + "강 외형");
  if (!gun) return;
  text(
    root,
    "toggle-equipment",
    gun.deployed ? "보관하기" : "연병장에 배치하기",
  );
  root
    .querySelector("#toggle-equipment")
    .setAttribute("aria-pressed", String(gun.deployed));
  root.querySelector("#toggle-equipment").disabled = !deploymentOffer(s, id).canDeploy;
  const max = offer.reason === "max";
  text(root, "enhancement-cost", max ? `현재 한도 ${offer.limit}강` : fmtGoldCost(offer.cost) + " G");
  text(
    root,
    "enhance-equipment",
    max
      ? level>offer.limit ? `기존 ${level}강 유지` : offer.limit===20 ? "최대 강화 완료" : "사단기를 강화하면 한도가 늘어납니다"
      : offer.reason === "gold"
        ? fmtGoldCost(subtractMoney(offer.cost,s.gold)) + " G 부족"
        : level + 1 + "강으로 강화",
  );
  root.querySelector("#enhance-equipment").disabled = !offer.canUpgrade;
}
