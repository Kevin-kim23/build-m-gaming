import { tapFeedback } from "./tap-feedback.js";
import { fmt } from "./format.js";
import { homeMarkup, insignia } from "./home-view.js";
import { createGameSession } from "./session.js";
import { createBattleUI } from "./battle-ui.js";
import { battleAccess } from "./battle.js";
import "./style.css";
import {
  SAVE_KEY,
  RANKS,
  UNITS,
  armyPower,
  recruitOffer,
  perTap,
  perSecond,
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
import { createArmyPanels } from "./army-panels.js";
import { hidePromotion } from "./promotion.js";
import { createGameAudio } from "./audio.js";
import {
  EQUIPMENT,
  deployedEquipment,
  equipmentPurchaseOffer,
} from "./equipment.js";
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
  canvas = $("#field");
const battleUI = createBattleUI(session);
const armyPanels = createArmyPanels(session, gameAudio);
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
  const access = battleAccess(state);
  $("#open-battle").hidden = !access.visible;
  setText('#battle-lock-label', access.unlocked ? '' : '🔒 중령 해금');
  battleUI.sync();
  armyPanels.sync();
}

zone.addEventListener("click", (event) => {
  const amount = session.tap();
  if (!amount) return;
  tapFeedback(zone, $("#gold"), event, amount);
  gameAudio.tap(state.sound);
});
$("#sound").onclick = async () => {
  await session.change((s) => {
    s.sound = !s.sound;
  });
  if (!state.sound) gameAudio.stop();
  else gameAudio.tap(true);
};
$("#open-shop").onclick = () => armyPanels.openShop();
$("#open-equipment").onclick = () => armyPanels.openEquipment();
$("#open-battle").onclick = () => battleUI.open();
function pauseGame() {
  battleUI.suspend();
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
