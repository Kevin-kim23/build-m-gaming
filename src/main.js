import { createHomeAutoTapRuntime, homeAutoTapHomeVisible } from './home-auto-tap.js';
import { createLootShop } from './loot-ui.js';
import { createHomeAutoTapFeedback } from './home-auto-tap-ui.js';
import { createHomeItemControls } from './home-quick-items.js';
import './home-auto-tap.css';
import { createIncomeHud } from './income-hud.js';
import { potionMultiplier } from './potions.js';
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
import {createAccessUI} from './access-ui.js';
import { createGameLifecycle } from './game-lifecycle.js';
import { showToast } from "./toast.js";
import { fmtGold,fmt } from "./format.js";
import { homeMarkup, insignia, promotionTone } from "./home-view.js";
import { createGameSession } from "./session.js";
import { createOfflineRewardUI } from './offline-reward-ui.js';
import { createOfflineNativeAd } from './potion-ad.js';
import './offline-reward.css';
import { createBattleUI } from "./battle-ui.js";
import { createDefenseUI } from "./defense-ui.js";
import { defenseUnlocked, defenseOf } from "./defense-progress.js";
import { createAchievementUI } from "./achievement-ui.js";
import { battleAccess } from "./battle.js";
import { renderBattleLock } from './battle-icons.js';
import "./style.css";
import "./hud.css";
import "./general-promotion.css";
import {
  SAVE_KEY,
  RANKS,
  armyPower,
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
import "./home-actions.css";
import "./equipment-list.css";
import "./game-frame.css";
import "./home-menu.css";
import "./ui-theme.css";
import './loot.css';
import "./tap-feedback.css";
import "./ui-compact.css";
import "./touch.css";
import { hidePromotion } from "./promotion.js";
import { createSettingsUI } from './settings-ui.js';
import { createGameAudio } from "./audio.js";
import {
  deployedEquipment,
} from "./equipment.js";
installErrorReporting();
const $ = (s) => document.querySelector(s);
let state, rosterDirty = true, passiveBoost = -1;
const session = createGameSession({
  storage: {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
  },
  locks: navigator.locks,
  onError: reportError,
  onAutoTouchIncome: amount => {
    if (lifecycle.canRun && homeAutoTapHomeVisible(document)) revolverFeedback.show(amount);
  },
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
const incomeHud=createIncomeHud(document);
const zone = $("#tap-zone"),
  canvas = $("#field");
const fieldNavigation=createFieldNavigation({viewport:$('#field-viewport'),zone,
  hint:$('#field-scroll-hint'),earnTap});
function drawHomeField() {
  const world=fieldNavigation.sync(state);
  drawScene(canvas,state,$('#field-labels'),world);
}
window.addEventListener('character-art-ready',()=>{if(session.active)drawHomeField();});
const battleUI = createBattleUI(session, gameAudio);
const defenseUI = createDefenseUI(session, { notify: showToast });
const accessUI=createAccessUI({onExit:()=>{
  if(Capacitor.isNativePlatform())App.exitApp().catch(error=>reportError('app.exit',error));
  else showToast('이 창을 닫으면 종료됩니다. 동의 전에는 게임이 시작되지 않습니다.');
}});
const armyPanels = createArmyPanels(session, gameAudio, accessUI);
const lootShop = createLootShop(session,{onSuccess:()=>gameAudio.ui('equip',state.sound),notify:showToast});
const achievementUI = createAchievementUI(session, gameAudio);
const guideUI = createGuideUI();
const infoUI = createInfoPanel(session);
const settingsUI = createSettingsUI(session, infoUI, gameAudio, () => guideUI.resume(), accessUI, () => achievementUI.open());
const offlineUI = createOfflineRewardUI(session,{showAd:createOfflineNativeAd({
  isActive:()=>session.active,requireConsent:()=>accessUI.ensureAds(),
  suspendAudio:()=>gameAudio.suspendForAd(),
})});
const openingBars = createOpeningSystemBars({native: Capacitor.isNativePlatform(), bars: SystemBars, onError: reportError});
openingBars.sync();
const opening = createOpeningScreen({onStart: async () => {
  openingBars.finish();
  $('#app').inert=true;
  try {if(!await accessUI.ensureStart())return;}
  catch(error){reportError('access.start',error);showToast('시작 안내를 열지 못했습니다. 앱을 다시 실행해 주세요.');return;}
  $('#app').inert=false;
  gameAudio.setMusicScene('home');
  lifecycle.start();
  void armyPanels.syncBilling();
  if (!document.querySelector('dialog[open]')) zone.focus({preventScroll:true});
}, soundEnabled: !session.hasSavedProgress || (state.sound && !session.saveNotice), soundVolume: state.sfxVolume,
  onState: (stage, active) => {
    if (stage !== 'complete') gameAudio.music.configure({scene: stage === 'title' ? 'title' : null, active, volume: session.saveNotice ? 0 : state.musicVolume});
  }, onError: reportError});
const lifecycle = createGameLifecycle({session, opening, onPause: () => {
  homeAutoRuntime.reset();
  homeAutoFeedback.clear();revolverFeedback.clear();
  guideUI.suspend();
  fieldNavigation.clear();
  battleUI.suspend();
  defenseUI.suspend();
  hidePromotion();
  gameAudio.stop();
  gameAudio.music.configure({active:false});
}});
const homeAutoFeedback=createHomeAutoTapFeedback($('#home-auto-feedback'));
const revolverFeedback=createHomeAutoTapFeedback($('#revolver-feedback'), '리볼버!');
const homeAutoRuntime=createHomeAutoTapRuntime(session,{
  canRun:()=>lifecycle.canRun && homeAutoTapHomeVisible(document),
  onIncome:amount=>homeAutoFeedback.show(amount),
});
const homeItems=createHomeItemControls($('.field-tools'),{
  state:()=>state,writable:()=>session.active && lifecycle.canRun,
  use:id=>armyPanels.useHomeItem(id),openOffer:id=>armyPanels.openItemOffer(id),
  onSuccess:()=>gameAudio.ui('equip',state.sound),
});
// Reset at both edges of a modal/guide pause, including very brief opens between clock ticks.
document.addEventListener('toggle',event=>{
  if(event.target.matches('dialog, #guide-spotlight')){homeAutoRuntime.reset();homeAutoFeedback.clear();revolverFeedback.clear();}
},true);
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
    passiveBoost = -1;
    achievementUI.sync();
    const deployed = deployedEquipment(state);
    setText("#rank-name", RANKS[r]);
    $(".rank-mark").innerHTML = insignia(r);
    setText("#formation-summary", fieldSummary(state));
    $("#formation-summary").hidden = power === 0;
    incomeHud.refresh(state);
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
    setText("#rank-progress", progress.remaining ? `전력 ${fmt(progress.remaining)} 남음` : progress.text);
    const percent = progress.ratio >= 1 ? 100 : Math.floor(progress.ratio * 100);
    $("#promotion-fill").style.width = progress.ratio * 100 + "%";
    $("#promotion-fill").dataset.tone = promotionTone(percent);
    setText("#promotion-percent", `${r === LAST_RANK ? RANKS[LAST_RANK] + " 진급 완료" : RANKS[r + 1] + " 진급까지"} ${percent}%`);
    $(".promotion-track").setAttribute("aria-valuenow", String(percent));
    drawHomeField();
  }
  const nextPassiveBoost=potionMultiplier(state,'passive',Date.now());
  if(nextPassiveBoost!==passiveBoost){
    passiveBoost=nextPassiveBoost;
    setText("#passive-rate", "+" + fmtGold(perSecond(state)) + " G");
  }
  const tap = perTap(state);
  setText("#tap-rate", "+" + fmtGold(tap) + " G");
  incomeHud.syncSword(state);
  incomeHud.syncPotions(state);
  setText("#tap-hint-rate", "한 번에 +" + fmtGold(tap) + " G");
  zone.setAttribute("aria-label", "화면 터치해서 골드 " + tap + " 획득");
  syncSwordControls(document.querySelector('.field-tools'), state, session.active);
  syncRevolverControls(document.querySelector('.field-tools'), state, session.active);
  homeItems.sync();
  setText("#save-status", session.status);
  infoUI.sync();
  zone.disabled = !session.active;
  $("#sound").disabled = !session.active;
  const access = battleAccess(state);
  $("#open-battle").hidden = !access.visible;
  renderBattleLock($('#battle-lock-label'), access.unlocked ? '' : access.reason==='rank'?'대위 해금':'장비 필요');
  $("#open-defense").hidden = !access.visible;
  setText('#defense-home-label', defenseUnlocked(state) ? (defenseOf(state).best ? `최고 ${defenseOf(state).best}` : '') : '부사령관 해금');
  battleUI.sync();
  if (lifecycle.started) guideUI.sync(state, session.active && lifecycle.canRun);
  armyPanels.sync();
  lootShop.sync();
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
$("#open-shop").onclick = () => armyPanels.openShop('store');
$("#open-recruit").onclick = () => armyPanels.openShop('recruit');
$("#open-facilities").onclick = () => armyPanels.openShop('facilities');
$("#open-items").onclick = () => armyPanels.openShop('items');
$("#open-equipment").onclick = () => armyPanels.openEquipment(undefined,'military');
$("#open-personal").onclick = () => armyPanels.openEquipment(undefined,'personal');
$("#open-battle").onclick = () => battleUI.open();
$("#open-defense").onclick = () => defenseUI.open();
$("#open-loot").onclick = () => lootShop.open();
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
    if(isActive&&lifecycle.started)void armyPanels.syncBilling();
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
// One 100ms clock: each automatic source settles elapsed time with its own interval.
let lastTick = 0;
setInterval(() => {
  const automaticGold=homeAutoRuntime.tick();
  if (!lifecycle.canRun) return;
  const now = Date.now(), delay = autoTouchStatus(state, now).active ? 300 : 1000;
  // A paid auto pulse already settled income and updated the HUD on this turn.
  if (now - lastTick >= delay) { lastTick = now; if(!automaticGold)session.tick(); }
}, 100);
update();
lifecycle.syncVisibility();
