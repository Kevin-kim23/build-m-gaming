import {createHomeOfferPopup} from './home-offer-popup.js';
import {academyLevel} from './academy-levels.js';
import { createStorePurchase } from './store-purchase.js';
import { renderStore } from './store-panels.js';
import { createStoreTestPurchase } from './test-purchase.js';
import './store.css';
import { createPersonalAwardUI } from './personal-awards.js';
import { renderPotions } from './potion-panels.js';
import { POTIONS } from './potions.js';
import { createPotionController } from './potion-controller.js';
import { createPotionAd } from './potion-ad.js';
import './potions.css';
import './personal-awards.css';
import { buildFacility, upgradeFacility } from './game.js';
import { facilityOffer, facilityLevel } from './facilities.js';
import { renderFacilities } from './facility-panels.js';
import './facilities.css';
import { syncSwordControls, syncRevolverControls } from "./sword-controls.js";
import { fmt, fmtGold, fmtGoldCost } from './format.js';
import { coin, insignia } from './home-view.js';
import { UNITS, RANKS, armyPower, recruit, recruitOffer, buyEquipment, enhanceEquipment, setEquipmentDeployed, upgradeSchool, activateSword, activateAutoTouch } from './game.js';
import { SCHOOLS, schoolOffer } from './schools.js';
import { renderSchools, schoolDetailMarkup } from './school-panels.js';
import { rankForArmy } from './ranks.js';
import { COMMAND_BATON, BULK_RECRUIT, commandBatonStatus, generalSwordStatus, GENERAL_SWORD, generalSwordDuration, divisionFlagStatus, generalRevolverStatus, generalRevolverDuration } from './personal-equipment.js';
import { EQUIPMENT, equipmentOf, visibleEquipment } from './equipment.js';
import { equipmentPanelMarkup, renderEquipmentPanel } from './equipment-panels.js';
import { drawEquipment } from './equipment-art.js';
import { SHOP_CATEGORIES, shopMarkup } from './shop.js';
import { drawFormationPortrait } from './art.js';
import { showPromotion } from './promotion.js';
import { openDetail, closeDetail, onDetailAction } from './detail-popup.js';
import { unitDetailMarkup } from './unit-detail.js';
import { equipmentDetailMarkup } from './equipment-detail.js';
import { currentGuide } from './guide-ui.js';
import { createPersonalUpgradeUI } from './personal-upgrade-ui.js';
import './shop.css';
import './schools.css';

// Independent menu screens reuse one modal shell and one action listener.
// Only the selected screen is mounted, so purchases and dialogs cannot duplicate.
export function createArmyPanels(session, audio, access) {
  const dialog = document.querySelector('#modal');
  const $ = selector => dialog.querySelector(selector);
  let activePanel = 'shop', category = 'recruit', activeEquipment = 'artillery';
  let equipmentCategory = 'military', equipmentRank = -1;
  let catalogRank = -1, equipmentCatalogKey = '';
  let returnFocus = null;
  const schools = Object.values(SCHOOLS);
  let schoolLevels = [];
  const state = () => session.state;
  const potionController=createPotionController(session,{showAd:createPotionAd({isActive:()=>session.active,requireConsent:()=>access?.ensureAds()??null,
    suspendAudio:()=>audio.suspendForAd()}),onChange:()=>{
    if(dialog.open && activePanel==='shop' && category==='items')renderPotions(state(),dialog,{busy:potionController.busy,busyItem:potionController.busyItem,active:session.active});
  }});
  const storePurchase=createStorePurchase(session,{showPurchase:createStoreTestPurchase(),onChange:()=>{
    if(dialog.open && activePanel==='shop' && category==='store')renderStore(state(),dialog,{busy:storePurchase.busy,active:session.active});
  }});
  const homeOffers=createHomeOfferPopup({openStore:()=>openShop('store'),watch:id=>potionController.watch(id),buy:()=>storePurchase.buy('auto'),active:()=>session.active,onSuccess:()=>audio.ui('purchase',state().sound)});
  const personalUI=createPersonalUpgradeUI(session,audio);
  const personalAwards=createPersonalAwardUI({canShow:()=>session.active});
  let catalogBaton=-1;
  const text = (selector, value) => {
    const node = $(selector), next = String(value);
    if (node && node.textContent !== next) node.textContent = next;
  };
  function atCurrentPosition(action) {
    const scrollTop=dialog.scrollTop;
    try {return action();}
    finally {if(dialog.open)dialog.scrollTop=scrollTop;}
  }
  function lockPanel() {
    if (session.active) return;
    dialog.querySelectorAll('[data-buy], [data-buy-bulk], [data-buy-equipment], [data-enhance-equipment], [data-enhance-personal], [data-upgrade-school], [data-facility-action]')
      .forEach(button => { button.disabled = true; });
  }
  function updateShop() {
    const s = state(), rank = rankForArmy(s);
    if (catalogRank !== rank || catalogBaton!==commandBatonStatus(s).level || schools.some((school,i)=>schoolLevels[i] !== (s[school.field]??0))) { openShop(); return; }
    text('#shop-gold', fmtGold(s.gold));
    // Shared lesson text; the spotlight owns highlighting the exact live control.
    const guide = currentGuide(s);
    text('#shop-guide', guide?.panel === 'shop' && guide.category === category ? guide.text : '');
    if (category === 'recruit') renderSchools(s, dialog);
    if (category === 'facilities') renderFacilities(s, dialog);
    if (category === 'items') {
      renderPotions(s,dialog,{busy:potionController.busy,busyItem:potionController.busyItem,active:session.active});
    }
    if (category === 'store') renderStore(s,dialog,{busy:storePurchase.busy,active:session.active});
    if (category !== 'recruit') return;
    for (const unit of Object.values(UNITS)) {
      const card = $(`[data-unit="${unit.id}"]`);
      if (!card) continue;
      const offer = recruitOffer(s, unit.id);
      const field = (name, value) => text(`[data-unit="${unit.id}"] [data-field="${name}"]`, value);
      field('owned', `보유 ${fmt(offer.owned)}`);
      field('price', fmtGoldCost(offer.cost));
      field('hint', offer.locked ? `🔒 ${offer.requirement}` : offer.reason === 'limit' ? '전력 한도' : '');
      card.classList.toggle('locked', offer.locked);
      card.querySelector('[data-buy]').disabled = !offer.canBuy;
    }
    for (const bulkButton of dialog.querySelectorAll('[data-buy-bulk]')) {
      const id = bulkButton.dataset.buyBulk;
      const offer = recruitOffer(s, id, COMMAND_BATON.recruitAmount);
      text(`[data-bulk-unit="${id}"] [data-bulk-price]`, fmtGoldCost(offer.cost));
      bulkButton.disabled = !offer.canBuy;
    }
  }
  function openShop(nextCategory = category) {
    if(!dialog.open)returnFocus=document.activeElement;
    category = SHOP_CATEGORIES.some(item => item.id === nextCategory) ? nextCategory : 'recruit';
    activePanel = 'shop';
    catalogRank = rankForArmy(state());
    catalogBaton=commandBatonStatus(state()).level;
    schoolLevels = schools.map(school=>state()[school.field]??0);
    dialog.dataset.panel = 'shop';
    dialog.dataset.category = category;
    dialog.innerHTML = shopMarkup(state(), coin, insignia, category);
    if (!dialog.open) dialog.showModal();
    updateShop();
    dialog.querySelectorAll('[data-portrait]').forEach(c => drawFormationPortrait(c, c.dataset.portrait));
    dialog.scrollTop = 0;
    lockPanel();
  }
  function openEquipment(id = activeEquipment, nextCategory = equipmentCategory, preserveScroll=false) {
    const scrollTop=preserveScroll&&dialog.open?dialog.scrollTop:0;
    if(!dialog.open)returnFocus=document.activeElement;
    equipmentCategory = nextCategory === 'personal' ? 'personal' : 'military';
    equipmentRank = rankForArmy(state());
    const items = visibleEquipment(state());
    activeEquipment = items.some(d => d.id === id) ? id : (items[0]?.id ?? null);
    equipmentCatalogKey = items.map(d => d.id).join(':');
    activePanel = 'equipment';
    dialog.dataset.panel = 'equipment';
    dialog.dataset.category = equipmentCategory;
    dialog.innerHTML = equipmentPanelMarkup(state(), activeEquipment, equipmentCategory);
    if (!dialog.open) dialog.showModal();
    updateEquipment();
    dialog.scrollTop = scrollTop;
    lockPanel();
  }
  function updateEquipment() {
    renderEquipmentPanel(state(), dialog, activeEquipment,{active:session.active});
    syncSwordControls(dialog, state(), session.active);
    syncRevolverControls(dialog, state(), session.active);
  }
  function sync() {
    personalUI.sync();
    if (!dialog.open) return;
    if (activePanel === 'shop') updateShop();
    else if (equipmentRank !== rankForArmy(state()) || equipmentCatalogKey !== visibleEquipment(state()).map(d => d.id).join(':')) openEquipment(activeEquipment,equipmentCategory,true);
    else updateEquipment();
    lockPanel();
  }
  function showUnitDetail(id) {
    const popup = openDetail(unitDetailMarkup(state(), UNITS[id]));
    popup.querySelectorAll('[data-portrait]').forEach(c => drawFormationPortrait(c, c.dataset.portrait));
  }
  function showEquipmentDetail(id,preserveScroll=false) {
    const popup = openDetail(equipmentDetailMarkup(state(), id, { manage: activePanel === 'shop',active:session.active }),{preserveScroll});
    popup.querySelectorAll('[data-gun-preview]').forEach(c => drawEquipment(c, equipmentOf(state(), id)?.level ?? 0, id));
  }
  function buyUnit(id, quantity = 1) {
    const previousRank = rankForArmy(state());
    const previousBatonLevel = commandBatonStatus(state()).level;
    const previousSwordLevel = generalSwordStatus(state()).level;
    const previousFlagLevel = divisionFlagStatus(state()).level, previousRevolver = generalRevolverStatus(state()).owned;
    const result = session.change(s => recruit(s, Date.now(), id, quantity));
    if (!result) return;
    if (result.ok) {
      if (result.promoted) {
        showPromotion(result.rank, insignia);
        audio.promotion(result.rank, state().sound);
        personalAwards.award(previousRank, result.rank);
      } else audio.recruit(state().sound);
    }
    if (!dialog.open || activePanel !== 'shop') return;
    const unit = UNITS[id];
    const batonLevel = commandBatonStatus(state()).level;
    const newBulk = Object.entries(BULK_RECRUIT).filter(([,rule]) => rule.level > previousBatonLevel && rule.level <= batonLevel).map(([id]) => UNITS[id].name);
    const swordLevel = generalSwordStatus(state()).level;
    text('#shop-message', result.ok
      ? `${unit.name} ${result.count}명 합류!` + (result.promoted ? ` ${RANKS[result.rank]} 진급! 총 전력 ${fmt(armyPower(state()))}` : '')
        + (batonLevel > previousBatonLevel ? ` ${COMMAND_BATON.name} Lv.${batonLevel} 자동 지급 · ${newBulk.length ? newBulk.join("·") + " " + COMMAND_BATON.recruitAmount + "명 모집 해금!" : "계급 성장 완료!"}` : '')
        + (swordLevel > previousSwordLevel ? ` ${GENERAL_SWORD.name} Lv.${swordLevel} ${previousSwordLevel ? "성장" : "자동 지급"}!` : '')
        + (divisionFlagStatus(state()).level > previousFlagLevel ? ` 사단기 Lv.${divisionFlagStatus(state()).level} 지급!` : '')
        + (!previousRevolver && generalRevolverStatus(state()).owned ? ' 장군 리볼버 지급 · 자동 터치 해금!' : '')
      : result.reason === 'locked' ? `${recruitOffer(state(), id, quantity).requirement} 조건을 충족해야 모집할 수 있어요.`
      : result.reason === 'limit' ? '모집 인원만큼 전력 여유가 필요해요.' : '골드가 부족해요.');
    $('#shop-message')?.classList.toggle('promoted', !!result.promoted);
  }
  function purchaseGun(id) {
    const result = session.change(s => buyEquipment(s, Date.now(), id));
    if (!result) return;
    audio.ui(result.ok ? 'purchase' : 'error',state().sound);
    if (dialog.open) text(activePanel === 'equipment' ? '#equipment-message' : '#shop-message', result.ok
      ? `${EQUIPMENT[id].name} 구매 완료! ${result.deployed ? "연병장에 배치했습니다." : "보관함으로 보냈습니다."}`
      : result.reason === 'locked' ? `${EQUIPMENT[id].unlockRank} 진급 후 구매할 수 있어요.`
      : result.reason === 'owned' ? '이미 보유한 장비입니다.' : '골드가 부족해요.');
  }
  function buildSchool(id) {
    const result=session.change(s=>upgradeSchool(s,Date.now(),id));
    if(!result)return;
    audio.ui(result.ok ? 'build' : 'error',state().sound);
    text('#shop-message',result.ok?`사관학교 Lv.${academyLevel(id,result.level)} 완료! ${SCHOOLS[id].effects[result.level-1]} 해금`
      :result.reason==='locked'?schoolOffer(state(),id).requirement+' 조건이 필요해요.':result.reason==='max'?'최대 레벨입니다.':'골드가 부족해요.');
  }
  function upgradeGun(id) {
    const result = session.change(s => enhanceEquipment(s, Date.now(), id));
    if (!result) return;
    audio.ui(result.ok ? 'upgrade-success' : 'error',state().sound);
    if (dialog.open && activePanel === 'equipment') text('#equipment-message', result.ok
      ? `${EQUIPMENT[id].name} +${result.level}강 완료!`
      : result.reason === 'max' ? '현재 강화 한도입니다. 개인 장비에서 사단기를 골드로 강화하면 한도가 1강씩 늘어납니다.'
      : result.reason === 'unowned' ? '장비를 먼저 구매하세요.' : '골드가 부족해요.');
  }
  function toggleEquipment(id) {
    if(!session.active||!Object.hasOwn(EQUIPMENT,id))return;
    const result = session.change(s => setEquipmentDeployed(s, !equipmentOf(s, id)?.deployed, Date.now(), id));
    if (result) audio.ui(result.ok ? 'equip' : 'error',state().sound);
    if (result?.ok && dialog.open && activePanel === 'equipment')
      text('#equipment-message', EQUIPMENT[id].name + (result.deployed ? ' 배치 완료!' : ' 보관 완료! 강화는 유지됩니다.'));
  }
  dialog.addEventListener('click', async event => {
    if (event.target === dialog) {
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)
        dialog.close();
      return;
    }
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.id === 'close-shop' || button.id === 'close-equipment') dialog.close();
    else if(button.hasAttribute('data-buy-starter')){
      const result=await storePurchase.buy('starter');
      if(result?.ok)audio.ui('purchase',state().sound);
      if(dialog.open && activePanel==='shop' && category==='store')text('#shop-message',result?.ok
        ? '스타터팩을 받았어요! 부스터는 아이템에서 사용할 수 있어요.'
        : result?.reason==='cancelled'?'무료 테스트를 취소했어요.':result?.reason==='limit'?'부스터 보관 한도를 확인해 주세요.':'지급을 완료하지 못했어요. 다시 확인해 주세요.');
    }
    else if(button.hasAttribute('data-buy-home-auto')||button.hasAttribute('data-toggle-home-auto')){
      const buying=button.hasAttribute('data-buy-home-auto');
      const result=buying?await storePurchase.buy('auto'):storePurchase.toggle();
      if(result?.ok)audio.ui(buying?'purchase':'equip',state().sound);
      if(dialog.open && activePanel==='shop' && category==='store')text('#shop-message',result?.ok
        ? buying?'자동터치 영구 보유! 홈으로 돌아가면 작동해요.':result.enabled?'자동터치를 켰어요.':'자동터치를 껐어요.'
        : result?.reason==='cancelled'?'유료결제 테스트를 취소했어요.':'자동터치 설정을 완료하지 못했어요.');
    }
    else if(button.dataset.potionAd || button.dataset.potionUse){
      const id=button.dataset.potionAd??button.dataset.potionUse;
      const result=button.dataset.potionAd?await potionController.watch(id):potionController.use(id);
      if(result.ok)audio.ui(button.dataset.potionAd?'purchase':'equip',state().sound);
      if(dialog.open && activePanel==='shop' && category==='items')text('#shop-message',result.ok
        ? `${POTIONS[id].name} ${button.dataset.potionAd?'1개 획득!':`${POTIONS[id].durationLabel} 사용!`}`
        : result.reason==='cancelled'?'광고 시청을 완료하지 않았어요.':result.reason==='unavailable'?'광고를 불러올 수 없어요. Android 앱과 인터넷 연결을 확인해 주세요.':result.reason==='empty'?'보유한 부스터가 없어요.':'지급·사용을 완료하지 못했어요. 다시 확인해 주세요.');
    }
    else if (button.hasAttribute('data-use-revolver')) {
      const result = session.change(s => activateAutoTouch(s));
      if (result?.ok) audio.ui('revolver',state().sound);
      if (result?.ok) text('#equipment-message', `${generalRevolverDuration(state())/1000}초 동안 0.3초마다 자동 터치 골드를 받습니다.`);
    }
    else if (button.hasAttribute('data-use-sword')) {
      const result = session.change(s => activateSword(s));
      if (result?.ok) audio.ui('sword',state().sound);
      if (result?.ok) text('#equipment-message', `${generalSwordDuration(state())/1000}초 동안 터치 골드가 2배입니다!`);
    }
    else if (button.dataset.detailUnit) showUnitDetail(button.dataset.detailUnit);
    else if (button.dataset.detailSchool) openDetail(schoolDetailMarkup(state(), button.dataset.detailSchool));
    else if (button.dataset.detailEquipment) showEquipmentDetail(button.dataset.detailEquipment);
    else if (button.dataset.detailPersonal) personalUI.open(button.dataset.detailPersonal);
    else if (button.dataset.buy) buyUnit(button.dataset.buy);
    else if (button.dataset.buyBulk) buyUnit(button.dataset.buyBulk, COMMAND_BATON.recruitAmount);
    else if (button.dataset.buyEquipment) atCurrentPosition(()=>purchaseGun(button.dataset.buyEquipment));
    else if (button.dataset.enhanceEquipment) atCurrentPosition(()=>upgradeGun(button.dataset.enhanceEquipment));
    else if (button.dataset.enhancePersonal) {
      atCurrentPosition(()=>{
        const result=personalUI.upgrade(button.dataset.enhancePersonal);
        if(result)text('#equipment-message',result.message);
      });
    }
    else if (button.dataset.facilityAction) {
      const id=button.dataset.facilityAction,owned=facilityLevel(state(),id)>0;
      const result=session.change(s=>(owned?upgradeFacility:buildFacility)(s,Date.now(),id));
      if(result) {
        audio.ui(result.ok?(owned?'upgrade-success':'build'):'error',state().sound);
        text('#shop-message',result.ok?`${facilityOffer(state(),id).facility.name} Lv.${facilityLevel(state(),id)} ${owned?'강화':'건설'} 완료! 수입 효과가 적용됩니다.`:result.reason==='max'?'최대 레벨입니다.':'시설 조건과 보유 골드를 확인하세요.');
      }
    }
    else if (button.dataset.upgradeSchool) buildSchool(button.dataset.upgradeSchool);
    else if (button.dataset.manageEquipment) openEquipment(button.dataset.manageEquipment, 'military');
  });
  onDetailAction((action, data) => {
    if (action === 'open-academy') { closeDetail(); openShop('recruit'); $('[data-upgrade-school]')?.focus({preventScroll:true}); }
    else if (action === 'manage-equipment') { closeDetail(); openEquipment(data.id, 'military'); }
    else if (action === 'toggle-equipment'&&session.active&&Object.hasOwn(EQUIPMENT,data.id)) {
      toggleEquipment(data.id);showEquipmentDetail(data.id,true);
    }
  });
  const openItemOffer=id=>homeOffers.open(id);
  const useHomeItem=id=>id==='auto'?storePurchase.toggle():potionController.use(id);
  dialog.addEventListener('close', () => {
    const target=activePanel === 'equipment' ? (equipmentCategory === 'personal' ? '#open-personal' : '#open-equipment')
      : ({recruit:'#open-recruit',facilities:'#open-facilities',items:'#open-items',store:'#open-shop'}[category]);
    const fallback=document.querySelector(target);
    (returnFocus?.isConnected && returnFocus!==document.body?returnFocus:fallback).focus({preventScroll:true});
  });
  return { openShop, openEquipment, openItemOffer, useHomeItem, sync, syncAwards:personalAwards.sync };
}
