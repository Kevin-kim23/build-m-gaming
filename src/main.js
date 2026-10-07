import { campaignBonusPercent } from "./campaign-rewards.js";
import { autoTouchStatus } from "./personal-equipment.js";
import { canChooseFieldTheme, fieldTheme, setFieldTheme } from './field-theme.js';
import { syncSwordControls, syncRevolverControls } from "./sword-controls.js";
import { tapFeedback } from "./tap-feedback.js";
import { createTapTracker } from "./multi-tap.js";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { createBackHandler } from "./back-button.js";
import { showToast } from "./toast.js";
import { schoolOffer } from "./schools.js";
import { fmtGold } from "./format.js";
import { homeMarkup, insignia } from "./home-view.js";
import { createGameSession } from "./session.js";
import { createOfflineRewardUI } from './offline-reward-ui.js';
import './offline-reward.css';
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
  activateAutoTouch,
  perSecond,
} from "./game.js";
import { drawScene } from "./art.js";
import { fieldSummary } from "./field-layout.js";
import { ownedSchools } from "./field-schools.js";
import {
  LAST_RANK,
  rankForArmy,
  promotionProgress,
} from "./ranks.js";
import { reportError, installErrorReporting } from "./diagnostics.js";
import { createArmyPanels } from "./army-panels.js";
import { createGuideUI } from "./guide-ui.js";
import { createInfoPanel } from "./info-ui.js";
import { openRankGuide } from "./rank-guide.js";
import "./detail.css";
import "./touch.css";
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
const battleUI = createBattleUI(session, gameAudio);
const armyPanels = createArmyPanels(session, gameAudio);
const achievementUI = createAchievementUI(session, gameAudio);
const guideUI = createGuideUI();
const infoUI = createInfoPanel(session);
const offlineUI = createOfflineRewardUI(session);
function update() {
  gameAudio.configure({enabled:state.sound,active:session.active && !document.hidden});
  const power = armyPower(state),
    r = rank();
  const goldLabel = fmtGold(state.gold);
  setText("#gold", goldLabel);
  $("#gold").classList.toggle("large-balance", goldLabel.length >= 10);
  $("#sound").setAttribute("aria-checked", String(state.sound));
  if (rosterDirty) {
    rosterDirty = false;
    achievementUI.sync();
    const deployed = deployedEquipment(state);
    setText("#rank-name", RANKS[r]);
    $(".rank-mark").innerHTML = insignia(r);
    setText("#formation-summary", fieldSummary(state));
    $("#formation-summary").hidden = power === 0;
    setText("#passive-rate", "+" + fmtGold(perSecond(state)) + " G");
    const conquestBonus = campaignBonusPercent(state);
    setText("#campaign-income-bonus", `점령 +${conquestBonus}%`);
    $("#campaign-income-bonus").hidden = !conquestBonus;
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
  setText("#tap-rate", "+" + fmtGold(tap) + " G");
  setText("#tap-hint-rate", "한 번에 +" + fmtGold(tap) + " G");
  zone.setAttribute("aria-label", "화면 터치해서 골드 " + tap + " 획득");
  syncSwordControls(document.querySelector('.field-tools'), state, session.active);
  syncRevolverControls(document.querySelector('.field-tools'), state, session.active);
  guideUI.sync(state);
  $("#shop-dot").hidden = !(
    Object.keys(UNITS).some((id) => recruitOffer(state, id).canBuy) ||
    ["nco","officer","advanced"].some(id=>schoolOffer(state,id).canBuy) ||
    Object.keys(EQUIPMENT).some(
      (id) => equipmentPurchaseOffer(state, id).canBuy,
    )
  );
  setText("#save-status", session.status);
  infoUI.sync();
  zone.disabled = !session.active;
  $("#sound").disabled = !session.active;
  const access = battleAccess(state);
  $("#open-battle").hidden = !access.visible;
  setText('#battle-lock-label', access.unlocked ? '' : '🔒 중령 해금');
  battleUI.sync();
  armyPanels.sync();
  offlineUI.sync();
}

// Every finger that touches the field earns gold at once (up to four fingers). Pointer events are
// used instead of click because phones drop clicks while another finger is still down.
const taps = createTapTracker();
function earnTap(point) {
  const amount = session.tap();
  if (!amount) return;
  tapFeedback(zone, $("#gold"), point, amount);
  gameAudio.tap(state.sound);
}
zone.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  if (!taps.down(event.pointerId, event.timeStamp)) return;
  try { zone.setPointerCapture?.(event.pointerId); } catch (error) { reportError("tap.capture", error); }
  earnTap({ clientX: event.clientX, clientY: event.clientY, detail: 1 });
});
for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
  zone.addEventListener(type, (event) => taps.up(event.pointerId));
// Keyboard and assistive-technology activation arrives as a click without a pointer (detail 0).
zone.addEventListener("click", (event) => { if (event.detail === 0) earnTap(event); });
$(".field-tools [data-use-sword]").onclick = () => {
  if (session.change(s => activateSword(s))?.ok) gameAudio.ui('sword',state.sound);
};
$(".field-tools [data-use-revolver]").onclick = () => {
  if (session.change(s => activateAutoTouch(s))?.ok) gameAudio.ui('revolver',state.sound);
};
document.querySelector('.field-theme-picker').addEventListener('click', event => {
  const button = event.target.closest('[data-field-theme]');
  if (button && !button.disabled) session.change(s => setFieldTheme(s, button.dataset.fieldTheme));
});
$("#sound").onclick = async () => {
  await session.change((s) => {
    s.sound = !s.sound;
  });
  if (!state.sound) gameAudio.stop();
  else { gameAudio.unlock(); gameAudio.tap(true); }
};
// One gesture hook unlocks browser audio. Disabled controls and field taps have their own feedback.
document.addEventListener('pointerdown', () => gameAudio.unlock(), {capture:true,passive:true});
document.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') gameAudio.unlock(); }, {capture:true});
document.addEventListener('click', event => {
  const button=event.target.closest?.('button');
  if (button && !button.disabled && button !== zone && button.id !== 'sound') gameAudio.ui('click',state.sound);
});
$("#open-ranks").onclick = () => openRankGuide(state, insignia);
$("#open-shop").onclick = () => armyPanels.openShop();
$("#open-equipment").onclick = () => armyPanels.openEquipment();
$("#open-battle").onclick = () => battleUI.open();
function pauseGame() {
  taps.clear();
  battleUI.suspend();
  session.pause();
  hidePromotion();
  gameAudio.stop();
}
// Android back button (the plugin only exists inside the app, so the browser version skips this).
// Registered once at startup: popups close first, then a second press within two seconds leaves.
if (Capacitor.isNativePlatform()) {
  const onBack = createBackHandler({
    hint: showToast,
    exit: () => {
      pauseGame();
      App.exitApp().catch((error) => reportError("app.exit", error));
    },
  });
  App.addListener("backButton", onBack).catch((error) => reportError("app.backButton", error));
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
// One clock; automatic payouts use elapsed 300 ms boundaries, not timer counts.
let lastTick = 0;
setInterval(() => {
  const now = Date.now(), delay = autoTouchStatus(state, now).active ? 300 : 1000;
  if (!document.hidden && now - lastTick >= delay) { lastTick = now; session.tick(); }
}, 100);
update();
if (!document.hidden) session.start();
