import { canChooseFieldTheme, fieldTheme, setFieldTheme } from './field-theme.js';
import { syncSwordControls } from "./sword-controls.js";
import { tapFeedback } from "./tap-feedback.js";
import { UNIT_LIST, unitAccess } from "./units.js";
import { schoolOffer } from "./schools.js";
import { fmt } from "./format.js";
import { homeMarkup, insignia } from "./home-view.js";
import { createGameSession } from "./session.js";
import { createBattleUI } from "./battle-ui.js";
import { createAchievementUI } from "./achievement-ui.js";
import { battleAccess } from "./battle.js";
import "./style.css";
import "./hud.css";
import "./general-promotion.css";
import {
  SAVE_KEY,
  RANKS,
  UNITS,
  armyPower,
  recruitOffer,
  perTap,
  activateSword,
  perSecond,
} from "./game.js";
import { drawScene, drawFormationPortrait } from "./art.js";
import { fieldSummary } from "./field-layout.js";
import { ownedSchools } from "./field-schools.js";
import {
  LAST_RANK,
  rankForArmy,
  promotionProgress,
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
const achievementUI = createAchievementUI(session);
function update() {
  const power = armyPower(state),
    r = rank();
  setText("#gold", fmt(state.gold));
  $("#gold").classList.toggle("large-balance", state.gold >= 1e9);
  $("#sound").setAttribute("aria-checked", String(state.sound));
  if (rosterDirty) {
    rosterDirty = false;
    achievementUI.sync();
    const deployed = deployedEquipment(state);
    setText("#rank-name", RANKS[r]);
    $(".rank-mark").innerHTML = insignia(r);
    for (const unit of UNIT_LIST) {
      const owned=state[unit.field]??0;
      setText(`[data-home-count="${unit.id}"]`,fmt(owned));
      $(`[data-roster="${unit.id}"]`).hidden=!owned&&!unitAccess(state,unit).unlocked;
    }
    setText("#formation-summary", fieldSummary(state));
    $("#formation-summary").hidden = power === 0;
    setText("#passive-rate", "+" + fmt(perSecond(state)) + " G");
    zone.classList.toggle("has-recruits", power > 0 || ownedSchools(state).length > 0);
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
    drawScene(canvas, state, $("#field-labels"));
  }
  $('.field-tools').hidden = !canChooseFieldTheme(state);
  for (const button of document.querySelectorAll('[data-field-theme]')) {
    button.disabled = !session.active;
    button.setAttribute('aria-pressed', String(fieldTheme(state) === button.dataset.fieldTheme));
  }
  const tap = perTap(state);
  setText("#tap-rate", "+" + fmt(tap) + " G");
  setText("#tap-hint-rate", "한 번에 +" + fmt(tap) + " G");
  zone.setAttribute("aria-label", "화면 터치해서 골드 " + tap + " 획득");
  syncSwordControls(document.querySelector('.field-tools'), state, session.active);
  $("#shop-dot").hidden = !(
    Object.keys(UNITS).some((id) => recruitOffer(state, id).canBuy) ||
    ["nco","officer"].some(id=>schoolOffer(state,id).canBuy) ||
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
$(".field-tools [data-use-sword]").onclick = () => session.change(s => activateSword(s));
document.querySelector('.field-theme-picker').addEventListener('click', event => {
  const button = event.target.closest('[data-field-theme]');
  if (button && !button.disabled) session.change(s => setFieldTheme(s, button.dataset.fieldTheme));
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
  pendingResize = requestAnimationFrame(() => drawScene(canvas, state, $("#field-labels")));
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
