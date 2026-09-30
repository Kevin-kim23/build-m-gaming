import { fmt } from "./format.js";
import {
  EQUIPMENT,
  EQUIPMENT_STAGES,
  equipmentOf,
  equipmentStats,
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
export function equipmentStoreMarkup(s) {
  const items = visibleEquipment(s);
  if (!items.length) return "";
  return `<section class="equipment-store"><h3>장비 구매</h3>${items.map((d) => `<article class="unit-card" data-equipment="${d.id}" aria-label="${d.name} 구매"><div class="equipment-store-head"><canvas data-gun-preview width="220" height="124" role="img" aria-label="${d.name}"></canvas><div><span class="item-class">${d.unlockRank} 해금 · 1대 보유</span><h3>${d.name}</h3><p>초당 +${fmt(d.passive)} G<br>터치 +${fmt(d.tap)} G</p></div></div><p data-gear-status class="unit-unlock"></p><div class="price-line"><span>구매 비용</span><strong>${fmt(d.cost)} <small>G</small></strong></div><button class="buy" data-buy-equipment="${d.id}"></button><button class="equipment-link" data-manage-equipment="${d.id}" hidden>장비 탭에서 강화·관리</button><p class="unit-price-note">구매 즉시 배치 · 장비 탭에서 최대 10강</p></article>`).join("")}</section>`;
}
export function renderEquipmentStore(s, root) {
  root.querySelectorAll("[data-equipment]").forEach((card) => {
    const id = card.dataset.equipment,
      d = EQUIPMENT[id],
      offer = equipmentPurchaseOffer(s, id),
      gun = equipmentOf(s, id);
    card.querySelector("[data-gear-status]").textContent = gun
      ? "보유 중 · +" + gun.level + "강"
      : offer.locked
        ? "🔒 " + d.unlockRank + " 진급 시 해금"
        : "구매 가능 · 강화는 장비 탭에서";
    const button = card.querySelector("[data-buy-equipment]");
    button.disabled = !offer.canBuy;
    button.textContent =
      offer.reason === "owned"
        ? "구매 완료"
        : offer.locked
          ? "잠금 · " + d.unlockRank + "부터 구매"
          : offer.reason === "gold"
            ? fmt(offer.cost - s.gold) + " G 부족"
            : d.name + " 구매";
    card.querySelector("[data-manage-equipment]").hidden = !gun;
    card.classList.toggle("locked", offer.locked);
    drawEquipment(card.querySelector("canvas"), gun?.level ?? 0, id);
  });
}
export function equipmentPanelMarkup(s, id) {
  const items = visibleEquipment(s),
    d = EQUIPMENT[id];
  const head = `<div class="sheet-grip"></div><div class="shop-header"><div><small>EQUIPMENT</small><h2 id="modal-title">장비 관리</h2></div><button id="close-equipment" aria-label="장비 닫기">×</button></div><div class="shop-wallet"><span>보유 골드</span><strong><b id="equipment-gold"></b><small>G</small></strong></div>`;
  if (!items.some((item) => item.id === id))
    return (
      head + '<p class="equipment-empty">진급하면 새로운 장비가 공개됩니다.</p>'
    );
  return (
    head +
    `<nav class="equipment-select" aria-label="관리할 장비">${items.map((item) => `<button data-select-equipment="${item.id}" aria-pressed="${id === item.id}">${item.name}</button>`).join("")}</nav><article class="equipment-detail"><div class="equipment-detail-title"><h3>${d.name} <b id="equipment-level"></b></h3><span id="equipment-deployed"></span></div><div class="equipment-preview"><canvas data-gun-preview width="440" height="248" role="img" aria-label="${d.name} 외형"></canvas></div><p id="equipment-stage"></p><div class="enhancement-steps" aria-label="강화 단계">${Array.from({ length: 10 }, (_, i) => `<i data-level="${i + 1}"></i>`).join("")}</div><p id="equipment-empty"></p><button class="buy" id="equipment-to-shop">상점에서 ${d.name} 구매</button><div id="owned-equipment" hidden><div class="equipment-stats"><span>초당 보너스 <b id="equipment-passive"></b></span><span>터치 보너스 <b id="equipment-tap"></b></span></div><button class="equipment-deploy" id="toggle-equipment"></button><p class="unit-price-note">배치 중에만 골드 보너스 적용 · 보관해도 강화 유지</p><section class="enhancement-box"><h4 id="enhancement-title"></h4><p id="enhancement-next"></p><p id="enhancement-appearance"></p><div class="price-line"><span>강화 비용</span><strong id="enhancement-cost"></strong></div><button class="buy" id="enhance-equipment"></button><p class="unit-price-note">성공률 100% · 최대 10강 · 강화 실패·파괴 없음</p></section></div></article><p id="equipment-message" role="status" aria-live="polite"></p>`
  );
}
export function renderEquipmentPanel(s, root, id) {
  text(root, "equipment-gold", fmt(s.gold));
  if (!root.querySelector("#equipment-level")) return;
  const d = EQUIPMENT[id],
    gun = equipmentOf(s, id),
    offer = enhancementOffer(s, id),
    level = gun?.level ?? 0,
    stats = equipmentStats(level, id),
    purchase = equipmentPurchaseOffer(s, id);
  text(root, "equipment-level", gun ? "+" + level : "");
  text(
    root,
    "equipment-deployed",
    gun ? (gun.deployed ? "배치 중" : "보관 중") : "미보유",
  );
  text(root, "equipment-stage", (d.stages ?? EQUIPMENT_STAGES)[level]);
  text(
    root,
    "equipment-empty",
    gun
      ? ""
      : purchase.locked
        ? d.unlockRank + " 진급 후 상점에서 구매할 수 있어요."
        : "상점에서 " + fmt(d.cost) + " 골드로 구매할 수 있어요.",
  );
  root.querySelector("#equipment-to-shop").hidden = !!gun;
  root.querySelector("#owned-equipment").hidden = !gun;
  const canvas = root.querySelector("[data-gun-preview]");
  drawEquipment(canvas, level, id);
  canvas.setAttribute("aria-label", d.name + " " + level + "강 외형");
  root
    .querySelectorAll("[data-level]")
    .forEach((e) =>
      e.classList.toggle("filled", !!gun && Number(e.dataset.level) <= level),
    );
  if (!gun) return;
  text(root, "equipment-passive", "+" + fmt(stats.passive) + " G");
  text(root, "equipment-tap", "+" + fmt(stats.tap) + " G");
  text(
    root,
    "toggle-equipment",
    gun.deployed ? "보관하기" : "연병장에 배치하기",
  );
  root
    .querySelector("#toggle-equipment")
    .setAttribute("aria-pressed", String(gun.deployed));
  const max = offer.reason === "max",
    next = max ? stats : equipmentStats(level + 1, id);
  text(
    root,
    "enhancement-title",
    max ? "최대 10강 달성" : "+" + level + " → +" + (level + 1) + " 강화",
  );
  text(
    root,
    "enhancement-next",
    max
      ? "모든 강화가 완료되었습니다."
      : "초당 " +
          fmt(stats.passive) +
          " → " +
          fmt(next.passive) +
          " G · 터치 " +
          fmt(stats.tap) +
          " → " +
          fmt(next.tap) +
          " G",
  );
  text(
    root,
    "enhancement-appearance",
    max ? (d.stages ?? EQUIPMENT_STAGES)[level] : "다음 외형: " + (d.stages ?? EQUIPMENT_STAGES)[level + 1],
  );
  text(root, "enhancement-cost", max ? "완료" : fmt(offer.cost) + " G");
  text(
    root,
    "enhance-equipment",
    max
      ? "최대 강화 완료"
      : offer.reason === "gold"
        ? fmt(offer.cost - s.gold) + " G 부족"
        : level + 1 + "강으로 강화",
  );
  root.querySelector("#enhance-equipment").disabled = !offer.canUpgrade;
}
