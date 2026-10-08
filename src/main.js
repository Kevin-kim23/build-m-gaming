import { campaignBonusPercent } from "./campaign-rewards.js";
import { autoTouchStatus } from "./personal-equipment.js";
import { syncSwordControls, syncRevolverControls } from "./sword-controls.js";
import { tapFeedback } from "./tap-feedback.js";
import { createFieldNavigation } from './field-navigation.js';
import './field-world.css';
import { Capacitor, SystemBars } from "@capacitor/core";
import { createOpeningSystemBars } from './opening-system-bars.js';
import { App } from "@capacitor/app";
import { createBackHandler } from "./back-button.js";
import { createOpeningScreen } from './opening.js';
import { createGameLifecycle } from './game-lifecycle.js';
import { showToast } from "./toast.js";
import { FACILITIES, facilityOffer, facilityUpgradeOffer } from './facilities.js';
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
  LAST_RANK, GENERAL_RANK,
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
import { createSettingsUI } from './settings-ui.js';
import { createGameAudio } from "./audio.js";
import {
  deployedEquipment,
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
const fieldNavigation=createFieldNavigation({viewport:$('#field-viewport'),zone,
  hint:$('#field-scroll-hint'),earnTap});
function drawHomeField() {
  const world=fieldNavigation.sync(state);
  drawScene(canvas,state,$('#field-labels'),world);
}
const battleUI = createBattleUI(session, gameAudio);
const armyPanels = createArmyPanels(session, gameAudio);
const achievementUI = createAchievementUI(session, gameAudio);
const guideUI = createGuideUI();
const infoUI = createInfoPanel(session);
const settingsUI = createSettingsUI(session, infoUI, gameAudio, () => guideUI.resume());
const offlineUI = createOfflineRewardUI(session);
const openingBars = createOpeningSystemBars({native: Capacitor.isNativePlatform(), bars: SystemBars, onError: reportError});
openingBars.sync();
const opening = createOpeningScreen({onStart: () => {
  openingBars.finish();
  gameAudio.setMusicScene('home');
  lifecycle.start();
  if (!document.querySelector('dialog[open]')) zone.focus({preventScroll:true});
}, soundEnabled: !session.hasSavedProgress || (state.sound && !session.saveNotice), soundVolume: state.sfxVolume,
  onState: (stage, active) => {
    if (stage !== 'complete') gameAudio.music.configure({scene: stage === 'title' ? 'title' : null, active, volume: session.saveNotice ? 0 : state.musicVolume});
  }, onError: reportError});
const lifecycle = createGameLifecycle({session, opening, onPause: () => {
  guideUI.suspend();
  fieldNavigation.clear();
  battleUI.suspend();
  hidePromotion();
  gameAudio.stop();
  gameAudio.music.configure({active:false});
}});
function update() {
  gameAudio.configure({enabled:state.sound,volume:state.sfxVolume,active:session.active && lifecycle.canRun});
  if (lifecycle.started) gameAudio.music.configure({volume:state.musicVolume,active:session.active && lifecycle.canRun});
  const power = armyPower(state),
    r = rank();
  const goldLabel = fmtGold(state.gold);
  setText("#gold", goldLabel);
  // Currency suffixes can shorten at a carry boundary; size by amount, never string length.
  $("#gold").classList.toggle("large-balance", state.gold >= 1_000_000);
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
    drawHomeField();
  }
  $('.field-tools').hidden = r < GENERAL_RANK;
  const tap = perTap(state);
  setText("#tap-rate", "+" + fmtGold(tap) + " G");
  setText("#tap-hint-rate", "한 번에 +" + fmtGold(tap) + " G");
  zone.setAttribute("aria-label", "화면 터치해서 골드 " + tap + " 획득");
  syncSwordControls(document.querySelector('.field-tools'), state, session.active);
  syncRevolverControls(document.querySelector('.field-tools'), state, session.active);
  $("#shop-dot").hidden = !(
    Object.keys(UNITS).some((id) => recruitOffer(state, id).canBuy) ||
    ["nco","officer","advanced"].some(id=>schoolOffer(state,id).canBuy) ||
    FACILITIES.some(f=>facilityOffer(state,f.id).canBuy || facilityUpgradeOffer(state,f.id).canUpgrade)
  );
  setText("#save-status", session.status);
  infoUI.sync();
  zone.disabled = !session.active;
  $("#sound").disabled = !session.active;
  const access = battleAccess(state);
  $("#open-battle").hidden = !access.visible;
  setText('#battle-lock-label', access.unlocked ? '' : '🔒 중령 해금');
  battleUI.sync();
  if (lifecycle.started) guideUI.sync(state, session.active && lifecycle.canRun);
  armyPanels.sync();
  if (lifecycle.started) {
    offlineUI.sync();
    armyPanels.syncAwards();
  }
}

// A completed tap earns gold; horizontal gestures only move the map.
function earnTap(point) {
  const amount = session.tap();
  if (!amount) return;
  tapFeedback($(".field-region"), $("#gold"), point, amount);
  gameAudio.tap(state.sound);
}
$(".field-tools [data-use-sword]").onclick = () => {
  if (session.change(s => activateSword(s))?.ok) gameAudio.ui('sword',state.sound);
};
$(".field-tools [data-use-revolver]").onclick = () => {
  if (session.change(s => activateAutoTouch(s))?.ok) gameAudio.ui('revolver',state.sound);
};

$("#sound").onclick = () => settingsUI.show();
// One gesture hook unlocks browser audio. Disabled controls and field taps have their own feedback.
document.addEventListener('pointerdown', () => { gameAudio.unlock(); gameAudio.music.unlock(); }, {capture:true,passive:true});
document.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { gameAudio.unlock(); gameAudio.music.unlock(); } }, {capture:true});
document.addEventListener('click', event => {
  if (!lifecycle.canRun) return;
  const button=event.target.closest?.('button');
  if (button && !button.disabled && button !== zone && button.id !== 'sound') gameAudio.ui('click',state.sound);
});
$("#open-ranks").onclick = () => openRankGuide(state, insignia);
$("#open-shop").onclick = () => armyPanels.openShop();
$("#open-equipment").onclick = () => armyPanels.openEquipment();
$("#open-battle").onclick = () => battleUI.open();
// Android back button (the plugin only exists inside the app, so the browser version skips this).
// Registered once at startup: popups close first, then a second press within two seconds leaves.
if (Capacitor.isNativePlatform()) {
  const onBack = createBackHandler({
    hint: showToast,
    exit: () => {
      lifecycle.pageHide();
      App.exitApp().catch((error) => reportError("app.exit", error));
    },
  });
  App.addListener("backButton", onBack).catch((error) => reportError("app.backButton", error));
  App.addListener('appStateChange', ({isActive}) => {
    if (isActive) openingBars.sync();
    lifecycle.setNativeActive(isActive);
  })
    .catch(error => reportError('app.appStateChange', error));
}
document.addEventListener('visibilitychange', lifecycle.syncVisibility);
window.addEventListener('pagehide', lifecycle.pageHide);
window.addEventListener('pageshow', lifecycle.pageShow);
window.addEventListener("storage", (event) => {
  if (event.key === SAVE_KEY) session.receive(event.newValue);
});
let pendingResize = 0;
const resizeObserver = new ResizeObserver(() => {
  cancelAnimationFrame(pendingResize);
  pendingResize = requestAnimationFrame(() => drawHomeField());
});
resizeObserver.observe($("#field-viewport"));
// One clock; automatic payouts use elapsed 300 ms boundaries, not timer counts.
let lastTick = 0;
setInterval(() => {
  if (!lifecycle.canRun) return;
  const now = Date.now(), delay = autoTouchStatus(state, now).active ? 300 : 1000;
  if (now - lastTick >= delay) { lastTick = now; session.tick(); }
}, 100);
update();
lifecycle.syncVisibility();
