import { tapFeedback } from "./tap-feedback.js";
import { fmt } from "./format.js";
import { homeMarkup, coin, insignia } from "./home-view.js";
import { createGameSession } from "./session.js";
import "./style.css";
import {
  SAVE_KEY,
  RANKS,
  UNITS,
  armyPower,
  recruit,
  recruitOffer,
  perTap,
  perSecond,
  buyEquipment,
  enhanceEquipment,
  setEquipmentDeployed,
} from "./game.js";
import { drawScene, drawFormationPortrait } from "./art.js";
import { fieldSummary } from "./field-layout.js";
import {
  LAST_RANK,
  rankForArmy,
  promotionProgress,
  catalogVisible,
} from "./ranks.js";
import { reportError, installErrorReporting } from "./diagnostics.js";
import { shopMarkup } from "./shop.js";
import { showPromotion, hidePromotion } from "./promotion.js";
import { createGameAudio } from "./audio.js";
import {
  EQUIPMENT,
  equipmentOf,
  visibleEquipment,
  deployedEquipment,
  equipmentPurchaseOffer,
} from "./equipment.js";
import {
  panelTabs,
  equipmentPanelMarkup,
  renderEquipmentStore,
  renderEquipmentPanel,
} from "./equipment-panels.js";
installErrorReporting();
const $ = (s) => document.querySelector(s);
let state, rosterDirty = true;
const session = createGameSession({
  storage: {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
  },
  locks: navigator.locks,
  onError: reportError,
  onChange: (next, changed) => {
    state = next;
    rosterDirty ||= changed;
    update();
  },
});
state = session.state;
const gameAudio = createGameAudio();
const rank = () => rankForArmy(state);
function setText(selector, value) {
  const node = $(selector),
    text = String(value);
  if (node.textContent !== text) node.textContent = text;
}
$("#app").innerHTML = homeMarkup(state);
const zone = $("#tap-zone"),
  canvas = $("#field"),
  dialog = $("#modal");
function transact(change) {
  return session.change(change);
}

let shopRank = -1;
let activePanel = "shop";
let activeEquipment = "artillery",
  shopCatalogRank = -1,
  equipmentCatalogKey = "";
function update() {
  const power = armyPower(state),
    r = rank();
  setText("#gold", fmt(state.gold));
  $("#gold").classList.toggle("large-balance", state.gold >= 1e9);
  $("#sound").setAttribute("aria-checked", String(state.sound));
  if (rosterDirty) {
    rosterDirty = false;
    const deployed = deployedEquipment(state);
    setText("#rank-name", RANKS[r]);
    $(".rank-mark").innerHTML = insignia(r);
    setText("#soldier-count", fmt(state.soldiers));
    setText("#sergeant-count", fmt(state.sergeants));
    $("#sergeant-roster").hidden =
      !catalogVisible(state, "소위") && !state.sergeants;
    setText("#staff-count", fmt(state.staffSergeants));
    $("#staff-roster").hidden =
      !catalogVisible(state, "소령") && !state.staffSergeants;
    setText("#formation-summary", fieldSummary(state));
    $("#formation-summary").hidden = power === 0;
    setText("#passive-rate", "+" + fmt(perSecond(state)) + " G");
    setText("#tap-rate", "+" + fmt(perTap(state)) + " G");
    setText("#tap-hint-rate", "한 번에 +" + fmt(perTap(state)) + " G");
    zone.setAttribute(
      "aria-label",
      "화면 터치해서 골드 " + perTap(state) + " 획득",
    );
    zone.classList.toggle("has-recruits", power > 0);
    zone.classList.toggle("has-equipment", deployed.length > 0);
    zone.classList.toggle("has-multiple-equipment", deployed.length > 1);
    setText(
      "#next-rank",
      r === LAST_RANK
        ? RANKS[LAST_RANK] + " 진급 완료"
        : RANKS[r + 1] + " 진급까지",
    );
    const progress = promotionProgress(state);
    setText("#rank-progress", progress.text);
    $("#promotion-fill").style.width = progress.ratio * 100 + "%";
    drawScene(canvas, state);
  }
  $("#shop-dot").hidden = !(
    Object.keys(UNITS).some((id) => recruitOffer(state, id).canBuy) ||
    Object.keys(EQUIPMENT).some(
      (id) => equipmentPurchaseOffer(state, id).canBuy,
    )
  );
  setText("#save-status", session.status);
  zone.disabled = !session.active;
  $("#sound").disabled = !session.active;
  if (dialog.open) {
    if (activePanel === "shop") updateShop();
    else if (
      equipmentCatalogKey !==
      visibleEquipment(state)
        .map((d) => d.id)
        .join(":")
    )
      openEquipment();
    else renderEquipmentPanel(state, dialog, activeEquipment);
    lockPanel();
  }
}
function lockPanel() {
  const toggle = dialog.querySelector('#toggle-equipment');
  if (toggle) toggle.disabled = !session.active;
  if (session.active) return;
  dialog.querySelectorAll('[data-buy], [data-buy-equipment], #enhance-equipment, #toggle-equipment')
    .forEach((button) => { button.disabled = true; });
}
function updateShop() {
  if (shopCatalogRank !== rank()) {
    openShop();
    return;
  }
  renderEquipmentStore(state, dialog);
  const power = armyPower(state),
    r = rank();
  setText("#shop-gold", fmt(state.gold));
  for (const id of Object.keys(UNITS)) {
    const offer = recruitOffer(state, id),
      card = dialog.querySelector('[data-unit="' + id + '"]');
    if (!card) continue;
    const text = (field, value) => {
      const node = card.querySelector('[data-field="' + field + '"]');
      if (node.textContent !== value) node.textContent = value;
    };
    text("owned", "보유 " + fmt(offer.owned) + "명");
    text("price", fmt(offer.cost));
    text(
      "unlock",
      offer.locked
        ? "🔒 " + offer.unit.unlockRank + " 진급 시 해금"
        : "전력 +" + offer.unit.power,
    );
    text(
      "label",
      offer.reason === "locked"
        ? "잠금 · " + offer.unit.unlockRank + "부터 모집"
        : offer.reason === "limit"
          ? "전력 한도 도달"
          : offer.reason === "gold"
            ? fmt(offer.cost - state.gold) + " G 부족"
            : offer.unit.name + " 1명 모집",
    );
    card.classList.toggle("locked", offer.locked);
    card.querySelector("[data-buy]").disabled = !offer.canBuy;
  }
  setText(
    "#shop-next",
    r === LAST_RANK
      ? RANKS[LAST_RANK] + " 달성!"
      : RANKS[r + 1] + " 진급 조건: " + promotionProgress(state).text,
  );
  if (shopRank !== r) {
    shopRank = r;
    for (const tile of dialog.querySelectorAll(".rank-step")) {
      const i = Number(tile.dataset.rank);
      tile.classList.toggle("reached", i <= r);
      tile.classList.toggle("current", i === r);
    }
  }
}
function openShop() {
  activePanel = "shop";
  shopCatalogRank = rank();
  dialog.innerHTML = panelTabs("shop") + shopMarkup(state, coin, insignia);
  shopRank = -1;
  if (!dialog.open) dialog.showModal();
  updateShop();
  dialog
    .querySelectorAll("[data-portrait]")
    .forEach((c) => drawFormationPortrait(c, c.dataset.portrait));
  dialog
    .querySelectorAll("[data-formation]")
    .forEach((c) => drawFormationPortrait(c, c.dataset.formation));
  $(".rank-step.current")?.scrollIntoView({
    block: "nearest",
    inline: "center",
  });
  dialog.scrollTop = 0;
  wirePanel();
  lockPanel();
  $("#close-shop").onclick = closeShop;
  dialog
    .querySelectorAll("[data-buy-equipment]")
    .forEach((b) => (b.onclick = () => purchaseGun(b.dataset.buyEquipment)));
  dialog
    .querySelectorAll("[data-manage-equipment]")
    .forEach(
      (b) => (b.onclick = () => openEquipment(b.dataset.manageEquipment)),
    );
  dialog.querySelectorAll("[data-buy]").forEach((button) => {
    button.onclick = () => buyUnit(button.dataset.buy);
  });
}
async function buyUnit(id) {
  const result = await transact((s) => recruit(s, Date.now(), id));
  if (!result) return;
  if (result.ok) {
    if (result.promoted) {
      showPromotion(result.rank, insignia);
      gameAudio.promotion(result.rank, state.sound);
    } else gameAudio.recruit(state.sound);
  }
  if (!dialog.open || activePanel !== "shop") return;
  const unit = UNITS[id];
  setText(
    "#shop-message",
    result.ok
      ? result.promoted
        ? RANKS[result.rank] + " 진급! 총 전력 " + fmt(armyPower(state))
        : unit.name +
          " 합류! 초당 +" +
          unit.passive +
          " G · 터치 +" +
          unit.tap +
          " G"
      : result.reason === "locked"
        ? unit.unlockRank + " 진급 후 " + unit.name + "를 모집할 수 있어요."
        : result.reason === "limit"
          ? "전력 한도에 도달했어요."
          : "골드가 부족해요.",
  );
  $("#shop-message").classList.toggle("promoted", !!result.promoted);
}

function wirePanel() {
  dialog.querySelectorAll("[data-panel]").forEach((button) => {
    button.onclick = () =>
      button.dataset.panel === "shop" ? openShop() : openEquipment();
  });
}
function openEquipment(id = activeEquipment) {
  const items = visibleEquipment(state);
  activeEquipment = items.some((d) => d.id === id)
    ? id
    : (items[0]?.id ?? null);
  equipmentCatalogKey = items.map((d) => d.id).join(":");
  activePanel = "equipment";
  dialog.innerHTML =
    panelTabs("equipment") + equipmentPanelMarkup(state, activeEquipment);
  if (!dialog.open) dialog.showModal();
  renderEquipmentPanel(state, dialog, activeEquipment);
  dialog.scrollTop = 0;
  wirePanel();
  lockPanel();
  $("#close-equipment").onclick = closeShop;
  dialog
    .querySelectorAll("[data-select-equipment]")
    .forEach(
      (b) => (b.onclick = () => openEquipment(b.dataset.selectEquipment)),
    );
  if (!activeEquipment) return;
  $("#equipment-to-shop").onclick = openShop;
  $("#enhance-equipment").onclick = () => upgradeGun(activeEquipment);
  $("#toggle-equipment").onclick = async () => {
    const selected = activeEquipment,
      result = await transact((s) =>
        setEquipmentDeployed(
          s,
          !equipmentOf(s, selected)?.deployed,
          Date.now(),
          selected,
        ),
      );
    if (
      result?.ok &&
      dialog.open &&
      activePanel === "equipment" &&
      activeEquipment === selected
    )
      setText(
        "#equipment-message",
        EQUIPMENT[selected].name +
          (result.deployed ? " 배치 완료!" : " 보관 완료! 강화는 유지됩니다."),
      );
  };
}
async function purchaseGun(id) {
  const result = await transact((s) => buyEquipment(s, Date.now(), id));
  if (!result) return;
  if (result.ok) gameAudio.recruit(state.sound);
  if (dialog.open && activePanel === "shop")
    setText(
      "#shop-message",
      result.ok
        ? EQUIPMENT[id].name + " 구매·배치 완료!"
        : result.reason === "locked"
          ? EQUIPMENT[id].unlockRank + " 진급 후 구매할 수 있어요."
          : result.reason === "owned"
            ? "이미 보유한 장비입니다."
            : "골드가 부족해요.",
    );
}
async function upgradeGun(id) {
  const result = await transact((s) => enhanceEquipment(s, Date.now(), id));
  if (!result) return;
  if (result.ok) gameAudio.recruit(state.sound);
  if (dialog.open && activePanel === "equipment" && activeEquipment === id)
    setText(
      "#equipment-message",
      result.ok
        ? EQUIPMENT[id].name + " +" + result.level + "강 완료!"
        : result.reason === "max"
          ? "최대 10강입니다."
          : result.reason === "unowned"
            ? "장비를 먼저 구매하세요."
            : "골드가 부족해요.",
    );
}
function closeShop() {
  dialog.close();
}
zone.addEventListener("click", (event) => {
  const amount = session.tap();
  if (!amount) return;
  tapFeedback(zone, $("#gold"), event, amount);
  gameAudio.tap(state.sound);
});
$("#sound").onclick = async () => {
  await transact((s) => {
    s.sound = !s.sound;
  });
  if (!state.sound) gameAudio.stop();
  else gameAudio.tap(true);
};
$("#open-shop").onclick = openShop;
$("#open-equipment").onclick = () => openEquipment();
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) {
    const box = dialog.getBoundingClientRect();
    if (
      e.clientX < box.left ||
      e.clientX > box.right ||
      e.clientY < box.top ||
      e.clientY > box.bottom
    )
      closeShop();
  }
});
dialog.addEventListener("close", () =>
  $(activePanel === "equipment" ? "#open-equipment" : "#open-shop").focus(),
);
function pauseGame() {
  session.pause();
  hidePromotion();
  gameAudio.stop();
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pauseGame();
  else session.start();
});
window.addEventListener("pagehide", pauseGame);
window.addEventListener("pageshow", () => {
  if (!document.hidden) session.start();
});
window.addEventListener("storage", (event) => {
  if (event.key === SAVE_KEY) session.receive(event.newValue);
});
let pendingResize = 0;
const resizeObserver = new ResizeObserver(() => {
  cancelAnimationFrame(pendingResize);
  pendingResize = requestAnimationFrame(() => drawScene(canvas, state));
});
resizeObserver.observe(canvas);
setInterval(() => {
  if (!document.hidden) session.tick();
}, 1000);
document
  .querySelectorAll("[data-home-unit]")
  .forEach((c) => drawFormationPortrait(c, c.dataset.homeUnit));
update();
if (!document.hidden) session.start();
