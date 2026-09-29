import "./style.css";
import {
  SAVE_KEY,
  LEGACY_KEY,
  RANKS,
  UNITS,
  armyPower,
  freshState,
  parseSave,
  tapGold,
  accrue,
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
  RANK_DEFINITIONS,
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
const $ = (s) => document.querySelector(s),
  fmt = (n) => n.toLocaleString("ko-KR");
let state,
  storageError = false,
  invalidSave = false,
  recovered = false;
try {
  const raw = localStorage.getItem(SAVE_KEY);
  state = parseSave(raw);
  if (raw && !state) {
    state = parseSave(localStorage.getItem(SAVE_KEY + "-backup"));
    recovered = !!state;
    invalidSave = !state;
  }
  if (!raw) {
    state = parseSave(localStorage.getItem(LEGACY_KEY));
    if (!state) state = parseSave(localStorage.getItem(LEGACY_KEY + "-backup"));
  }
} catch (error) {
  storageError = true;
  reportError("save.load", error);
}
state ??= freshState();
accrue(state);
const gameAudio = createGameAudio();
const coin =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10l5 5v10l-5 5H7l-5-5V7z" fill="#d9b55d"/><path d="M8 5h8l3 3v8l-3 3H8l-3-3V8z" fill="#e8cd84"/><path d="M14 8h-4v8h4v-4h-2" fill="none" stroke="#8a6932" stroke-width="2"/></svg>';
const speaker =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3z"/><path class="sound-waves" d="M16 8q4 4 0 8m3-11q7 7 0 14"/><path class="sound-off" d="m16 9 5 6m0-6-5 6"/></svg>';
const shopIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m4 4-2 5v3h20V9l-2-5zM4 12v9h16v-9M9 21v-6h6v6M8 4 7 12m9-8 1 8"/></svg>';
const rank = () => rankForArmy(state);
function setText(selector, value) {
  const node = $(selector),
    text = String(value);
  if (node.textContent !== text) node.textContent = text;
}
function insignia(index) {
  const r = RANK_DEFINITIONS[index];
  return (
    '<span class="insignia ' +
    r.kind +
    '">' +
    "<i></i>".repeat(r.marks) +
    "</span>"
  );
}
$("#app").innerHTML =
  `<main class="game"><header class="hud"><div class="rank"><span class="rank-mark" aria-hidden="true"></span><div><small>부대 키우기</small><h1 id="rank-name"></h1></div></div><button id="sound" aria-label="효과음" role="switch" aria-checked="${state.sound}">${speaker}</button></header><div class="gold-counter"><span class="gold-label">보유 골드</span><div>${coin}<strong id="gold"></strong><span class="gold-unit">G</span></div><p class="income-line"><span>초당 <b id="passive-rate"></b></span><i></i><span>터치 <b id="tap-rate"></b></span></p></div><button id="tap-zone" aria-label="화면 터치해서 골드 획득"><canvas id="field" aria-hidden="true"></canvas><span class="formation-summary" id="formation-summary"></span><span class="intro-copy">아직은, 빈 터.<small>골드를 모아 첫 병사를 맞이하세요.</small></span><span class="tap-hint"><b>화면을 터치하세요</b><small id="tap-hint-rate"></small></span><span class="pixel-corner top-left"></span><span class="pixel-corner top-right"></span><span class="pixel-corner bottom-left"></span><span class="pixel-corner bottom-right"></span></button><section class="home-dock" aria-label="내 부대"><div class="roster"><div class="roster-units"><div class="owned-unit"><canvas data-home-unit="soldier" width="36" height="46" role="img" aria-label="일반병"></canvas><div><span>일반병</span><strong><b id="soldier-count">0</b><small>명</small></strong></div></div><div class="owned-unit" id="sergeant-roster"><canvas data-home-unit="sergeant" width="36" height="46" role="img" aria-label="하사"></canvas><div><span>하사</span><strong><b id="sergeant-count">0</b><small>명</small></strong></div></div><div class="owned-unit" id="staff-roster" hidden><canvas data-home-unit="staffSergeant" width="36" height="46" role="img" aria-label="중사"></canvas><div><span>중사</span><strong><b id="staff-count">0</b><small>명</small></strong></div></div></div></div><div class="promotion-line"><span id="next-rank"></span><b id="rank-progress"></b></div><div class="promotion-track"><i id="promotion-fill"></i></div><nav class="home-tabs" aria-label="부대 메뉴"><button id="open-shop">${shopIcon}<span>상점</span><i id="shop-dot" hidden></i></button><button id="open-equipment"><span aria-hidden="true">⚙</span><span>장비</span></button></nav></section><footer><span id="save-status"><i></i> ${storageError ? "저장 불가" : invalidSave ? "기존 저장 파일 확인 필요" : "자동 저장"}</span><span>작은 시작, 위대한 부대.</span></footer></main>`;
const zone = $("#tap-zone"),
  canvas = $("#field"),
  dialog = $("#modal");
// Every action reloads the committed balance under a cross-tab lock before writing.
async function transact(change = () => {}) {
  const perform = () => {
    if (!invalidSave && !storageError) {
      try {
        const latest = parseSave(localStorage.getItem(SAVE_KEY));
        if (latest && latest.revision >= state.revision) state = latest;
      } catch (error) {
        storageError = true;
        reportError("save.read", error);
      }
    }
    accrue(state);
    const result = change(state);
    state.revision++;
    persist();
    update();
    return result;
  };
  if (navigator.locks) {
    let entered = false;
    try {
      return await navigator.locks.request(SAVE_KEY, () => {
        entered = true;
        return perform();
      });
    } catch (error) {
      if (!entered) return perform();
      reportError("state.transaction", error);
      update();
      return undefined;
    }
  }
  return perform();
}
function persist() {
  if (invalidSave) return;
  try {
    const prev = localStorage.getItem(SAVE_KEY);
    if (parseSave(prev)) localStorage.setItem(SAVE_KEY + "-backup", prev);
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (error) {
    storageError = true;
    reportError("save.write", error);
  }
}

let lastRosterKey = "";
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
  const deployed = deployedEquipment(state);
  const rosterKey =
    Object.values(UNITS)
      .map((u) => state[u.field] ?? 0)
      .join(":") +
    ":" +
    Object.keys(EQUIPMENT)
      .map((id) => {
        const g = equipmentOf(state, id);
        return g ? id + g.level + g.deployed : "none";
      })
      .join(":");
  if (rosterKey !== lastRosterKey) {
    lastRosterKey = rosterKey;
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
  if (storageError) setText("#save-status", "저장 불가 · 브라우저 설정 확인");
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
  }
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
  $(activePanel === "equipment" ? "#open-equipment" : "#open-shop").focus();
}
function feedback(event, amount) {
  const bounds = zone.getBoundingClientRect(),
    label = document.createElement("span");
  label.className = "gold-float";
  label.textContent = `+${fmt(amount)} G`;
  const x = event.detail === 0 ? bounds.width / 2 : event.clientX - bounds.left,
    y = event.detail === 0 ? bounds.height * 0.49 : event.clientY - bounds.top;
  label.style.left = `${Math.max(40, Math.min(bounds.width - 46, x))}px`;
  label.style.top = `${Math.max(48, Math.min(bounds.height - 25, y))}px`;
  if (zone.querySelectorAll(".gold-float").length >= 15)
    zone.querySelector(".gold-float").remove();
  zone.appendChild(label);
  setTimeout(() => label.remove(), 700);
  $("#gold").classList.remove("pop");
  void $("#gold").offsetWidth;
  $("#gold").classList.add("pop");
}
zone.addEventListener("click", async (event) => {
  const amount = await transact((s) => tapGold(s));
  if (!amount) return;
  feedback(event, amount);
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
function readLatest() {
  try {
    const s = parseSave(localStorage.getItem(SAVE_KEY));
    if (s && s.revision > state.revision) {
      state = s;
      accrue(state);
      update();
    }
  } catch (error) {
    reportError("save.refresh", error);
  }
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    hidePromotion();
    gameAudio.stop();
  }
  if (!document.hidden) {
    readLatest();
    accrue(state);
    update();
  }
});
window.addEventListener("storage", (e) => {
  if (e.key === SAVE_KEY) readLatest();
});
let pendingResize = 0;
const resizeObserver = new ResizeObserver(() => {
  cancelAnimationFrame(pendingResize);
  pendingResize = requestAnimationFrame(() => drawScene(canvas, state));
});
resizeObserver.observe(canvas);
setInterval(() => {
  if (!document.hidden) {
    accrue(state);
    update();
  }
}, 1000);
setInterval(() => {
  if (!document.hidden && armyPower(state) > 0) transact();
}, 5000);
document
  .querySelectorAll("[data-home-unit]")
  .forEach((c) => drawFormationPortrait(c, c.dataset.homeUnit));
update();
transact();
if (recovered) setText("#save-status", "보조 저장 복구 완료");
