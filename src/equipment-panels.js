import { personalMarkup } from "./personal-panels.js";
import { repeatPurchaseMarkup, renderRepeatPurchase } from "./equipment-repeat-ui.js";
import { fmt } from "./format.js";
import {
  EQUIPMENT,
  MAX_DEPLOYED_EQUIPMENT, deployedEquipment, deploymentOffer,
  equipmentStage, equipmentLevelLimit,
  equipmentOf, equipmentCount,
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
  return `<section class="equipment-store"><h3>장비 구매</h3>${items.map((d) => `<article class="unit-card" data-equipment="${d.id}" aria-label="${d.name} 구매"><div class="equipment-store-head"><canvas data-gun-preview width="220" height="124" role="img" aria-label="${d.name}"></canvas><div><span class="item-class">${d.unlockRank} 해금</span><h3>${d.name}</h3><span class="equipment-quantity" data-gear-count></span><p data-gear-income></p></div></div><p data-gear-status class="unit-unlock"></p><div class="price-line"><span>구매 비용</span><strong>${fmt(d.cost)} <small>G</small></strong></div><button class="buy" data-buy-equipment="${d.id}"></button><button class="equipment-link" data-manage-equipment="${d.id}" hidden>장비 탭에서 강화·관리</button><p class="unit-price-note">빈자리에 자동 배치 · 4칸이 차면 보관 · 사단기 Lv.2부터 최대 20강</p>${repeatPurchaseMarkup(d.id)}</article>`).join("")}</section>`;
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
    button.hidden = !!gun;
    const count = equipmentCount(s, id), stats = equipmentStats(gun?.level ?? 0, id);
    card.querySelector("[data-gear-count]").textContent = `[${fmt(count)}문]`;
    card.querySelector("[data-gear-income]").textContent = `초당 +${fmt(stats.passive * (count || 1))} G · 터치 +${fmt(stats.tap * (count || 1))} G${gun ? " · 보유 합계" : " · 1문 기준"}`;
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
  renderRepeatPurchase(s, root);
}
export function equipmentPanelMarkup(s, id, category = "military") {
  const items = visibleEquipment(s),
    d = EQUIPMENT[id];
  const head = `<div class="sheet-grip"></div><div class="shop-header"><div><small>EQUIPMENT</small><h2 id="modal-title">장비 관리</h2></div><button id="close-equipment" aria-label="장비 닫기">×</button></div><div class="shop-wallet"><span>보유 골드</span><strong><b id="equipment-gold"></b><small>G</small></strong></div><nav class="shop-categories equipment-categories" aria-label="장비 분류"><button data-equipment-category="military" aria-pressed="${category === "military"}">군사 장비</button><button data-equipment-category="personal" aria-pressed="${category === "personal"}">개인 장비</button></nav>`;
  if (category === "personal") return head + personalMarkup(s) + '<p id="equipment-message" role="status" aria-live="polite"></p>';
  if (!items.some((item) => item.id === id))
    return (
      head + '<p class="equipment-empty">진급하면 새로운 장비가 공개됩니다.</p>'
    );
  return (
    head +
    `<p class="deployment-count" id="deployment-count"></p><nav class="equipment-select" aria-label="관리할 장비">${items.map((item) => `<button data-select-equipment="${item.id}" aria-pressed="${id === item.id}">${item.name} <span data-select-count="${item.id}">[${fmt(equipmentCount(s, item.id))}문]</span></button>`).join("")}</nav><article class="equipment-detail"><div class="equipment-detail-title"><div><h3>${d.name} <b id="equipment-level"></b></h3><span class="equipment-quantity" id="equipment-count"></span></div><span id="equipment-deployed"></span></div><div class="equipment-preview"><canvas data-gun-preview width="440" height="248" role="img" aria-label="${d.name} 외형"></canvas></div><p id="equipment-stage"></p><p class="equipment-role">${id === "transport" ? "보급 지원 · 전투 중 아군 본부 회복" : id === "fighter" ? "항공 타격 · 적 본부 자동 공격" : "화력 지원 · 적 본부 자동 공격"}</p><div class="enhancement-steps" aria-label="강화 단계">${Array.from({ length: equipmentLevelLimit(s) }, (_, i) => `<i data-level="${i + 1}"></i>`).join("")}</div><p id="equipment-empty"></p><button class="buy" id="equipment-to-shop">상점에서 ${d.name} 구매</button><div id="owned-equipment" hidden><div class="equipment-stats"><span>초당 보너스 <b id="equipment-passive"></b></span><span>터치 보너스 <b id="equipment-tap"></b></span></div><button class="equipment-deploy" id="toggle-equipment"></button><p class="unit-price-note">배치 중에만 골드 보너스 적용 · 같은 종류 전체 보관·배치 · 강화와 수량 유지</p><section class="enhancement-box"><h4 id="enhancement-title"></h4><p id="enhancement-next"></p><p id="enhancement-appearance"></p><div class="price-line"><span>강화 비용</span><strong id="enhancement-cost"></strong></div><button class="buy" id="enhance-equipment"></button><p class="unit-price-note">성공률 100% · 현재 최대 ${equipmentLevelLimit(s)}강 · 실패·파괴 없음<br>같은 종류 전체 강화 · 보유 문수만큼 비용 지불</p></section>${repeatPurchaseMarkup(id)}</div></article><p id="equipment-message" role="status" aria-live="polite"></p>`
  );
}
export function renderEquipmentPanel(s, root, id) {
  text(root, "equipment-gold", fmt(s.gold));
  if (!root.querySelector("#equipment-level")) return;
  text(root, "deployment-count", `연병장 ${deployedEquipment(s).length} / ${MAX_DEPLOYED_EQUIPMENT}칸 사용 · 같은 종류는 한 칸에 묶입니다.`);
  const d = EQUIPMENT[id],
    gun = equipmentOf(s, id),
    offer = enhancementOffer(s, id),
    level = gun?.level ?? 0,
    stats = equipmentStats(level, id),
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
  text(root, "equipment-stage", equipmentStage(id, level));
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
  text(root, "equipment-passive", "+" + fmt(stats.passive * equipmentCount(s, id)) + " G");
  text(root, "equipment-tap", "+" + fmt(stats.tap * equipmentCount(s, id)) + " G");
  text(
    root,
    "toggle-equipment",
    gun.deployed ? "보관하기" : deploymentOffer(s, id).reason === "capacity" ? "4칸 사용 중 · 다른 장비를 먼저 보관하세요" : "연병장에 배치하기",
  );
  root
    .querySelector("#toggle-equipment")
    .setAttribute("aria-pressed", String(gun.deployed));
  root.querySelector("#toggle-equipment").disabled = !deploymentOffer(s, id).canDeploy;
  const max = offer.reason === "max",
    next = max ? stats : equipmentStats(level + 1, id);
  text(
    root,
    "enhancement-title",
    max ? `최대 ${offer.limit}강 달성` : "+" + level + " → +" + (level + 1) + " 강화",
  );
  text(
    root,
    "enhancement-next",
    max
      ? (offer.limit === 10 ? "중장 · 사단기 Lv.2부터 20강까지 확장됩니다." : "모든 강화가 완료되었습니다.")
      : "1문당 초당 " +
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
    max ? equipmentStage(id, level) : "다음 외형: " + equipmentStage(id, level + 1),
  );
  text(root, "enhancement-cost", max ? "완료" : fmt(offer.cost) + " G · " + fmt(equipmentCount(s,id)) + "문 합계");
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
