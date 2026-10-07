import { createPersonalAwardUI } from './personal-awards.js';
import './personal-awards.css';
import { buildFacility, upgradeFacility } from './game.js';
import { facilityOffer, facilityLevel } from './facilities.js';
import { renderFacilities } from './facility-panels.js';
import './facilities.css';
import { syncSwordControls, syncRevolverControls } from "./sword-controls.js";
import { fmt, fmtGold, fmtGoldCost } from './format.js';
import { coin, insignia } from './home-view.js';
import { UNITS, RANKS, armyPower, recruit, recruitOffer, buyEquipment, buyAdditionalEquipment, enhanceEquipment, setEquipmentDeployed, upgradeSchool, activateSword, activateAutoTouch } from './game.js';
import { SCHOOLS, schoolOffer } from './schools.js';
import { renderSchools, schoolDetailMarkup } from './school-panels.js';
import { rankForArmy } from './ranks.js';
import { COMMAND_BATON, BULK_RECRUIT, commandBatonStatus, generalSwordStatus, GENERAL_SWORD, generalSwordDuration, divisionFlagStatus, generalRevolverStatus, generalRevolverDuration } from './personal-equipment.js';
import { EQUIPMENT, equipmentOf, visibleEquipment, deploymentOffer } from './equipment.js';
import { panelTabs, equipmentPanelMarkup, renderEquipmentPanel } from './equipment-panels.js';
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

// One controller owns the shared shop/equipment dialog and its event listener.
export function createArmyPanels(session, audio) {
  const dialog = document.querySelector('#modal');
  const $ = selector => dialog.querySelector(selector);
  let activePanel = 'shop', category = 'recruit', activeEquipment = 'artillery';
  let equipmentCategory = 'military', equipmentRank = -1;
  let catalogRank = -1, equipmentCatalogKey = '';
  const schools = Object.values(SCHOOLS);
  let schoolLevels = [];
  const state = () => session.state;
  const personalUI=createPersonalUpgradeUI(session,audio);
  const personalAwards=createPersonalAwardUI({canShow:()=>session.active});
  let equipmentLevels=null,catalogBaton=-1;
  const text = (selector, value) => {
    const node = $(selector), next = String(value);
    if (node && node.textContent !== next) node.textContent = next;
  };
  function lockPanel() {
    const toggle = $('#toggle-equipment');
    if (toggle) toggle.disabled = !session.active || !deploymentOffer(state(), activeEquipment).canDeploy;
    if (session.active) return;
    dialog.querySelectorAll('[data-buy], [data-buy-bulk], [data-buy-equipment], [data-buy-additional], [data-upgrade-school], [data-facility-action], #enhance-equipment')
      .forEach(button => { button.disabled = true; });
  }
  function updateShop() {
    const s = state(), rank = rankForArmy(s);
    if (catalogRank !== rank || catalogBaton!==commandBatonStatus(s).level || schools.some((school,i)=>schoolLevels[i] !== (s[school.field]??0))) { openShop(); return; }
    text('#shop-gold', fmtGold(s.gold));
    // First-five-minutes guide: say what to do and pulse the matching control.
    const guide = currentGuide(s);
    text('#shop-guide', guide ? guide.text : '');
    const pulse = (selector, on) => $(selector)?.classList.toggle('guide-pulse', on);
    pulse('[data-shop-category="schools"]', !!guide?.pulse && guide.target === 'school');
    pulse('[data-unit="soldier"] [data-buy]', category === 'recruit' && !!guide?.pulse && guide.target === 'shop');
    if (category === 'schools') renderSchools(s, dialog);
    if (category === 'facilities') renderFacilities(s, dialog);
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
    category = SHOP_CATEGORIES.some(item => item.id === nextCategory) ? nextCategory : 'recruit';
    activePanel = 'shop';
    catalogRank = rankForArmy(state());
    catalogBaton=commandBatonStatus(state()).level;
    schoolLevels = schools.map(school=>state()[school.field]??0);
    dialog.innerHTML = panelTabs('shop') + shopMarkup(state(), coin, insignia, category);
    if (!dialog.open) dialog.showModal();
    updateShop();
    dialog.querySelectorAll('[data-portrait]').forEach(c => drawFormationPortrait(c, c.dataset.portrait));
    dialog.scrollTop = 0;
    lockPanel();
  }
  function openEquipment(id = activeEquipment, nextCategory = equipmentCategory) {
    equipmentCategory = nextCategory;
    equipmentRank = rankForArmy(state());
    equipmentLevels=state().personalLevels;
    const items = visibleEquipment(state());
    activeEquipment = items.some(d => d.id === id) ? id : (items[0]?.id ?? null);
    equipmentCatalogKey = items.map(d => d.id).join(':');
    activePanel = 'equipment';
    dialog.innerHTML = panelTabs('equipment') + equipmentPanelMarkup(state(), activeEquipment, equipmentCategory);
    if (!dialog.open) dialog.showModal();
    updateEquipment();
    dialog.scrollTop = 0;
    lockPanel();
  }
  function updateEquipment() {
    renderEquipmentPanel(state(), dialog, activeEquipment);
    syncSwordControls(dialog, state(), session.active);
    syncRevolverControls(dialog, state(), session.active);
  }
  function sync() {
    personalUI.sync();
    if (!dialog.open) return;
    if (activePanel === 'shop') updateShop();
    else if (equipmentRank !== rankForArmy(state()) || equipmentLevels!==state().personalLevels || equipmentCatalogKey !== visibleEquipment(state()).map(d => d.id).join(':')) openEquipment();
    else updateEquipment();
    lockPanel();
  }
  function showUnitDetail(id) {
    const popup = openDetail(unitDetailMarkup(state(), UNITS[id]));
    popup.querySelectorAll('[data-portrait]').forEach(c => drawFormationPortrait(c, c.dataset.portrait));
  }
  function showEquipmentDetail(id) {
    const popup = openDetail(equipmentDetailMarkup(state(), id, { manage: activePanel === 'shop' }));
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
  function purchaseAdditionalGun(id) {
    const result = session.change(s => buyAdditionalEquipment(s, Date.now(), id));
    if (!result) return;
    audio.ui(result.ok ? 'purchase' : 'error',state().sound);
    text(activePanel === 'equipment' ? '#equipment-message' : '#shop-message', result.ok
      ? `${EQUIPMENT[id].name} [${fmt(result.count)}문] · +${result.level}강 유지 · ${result.deployed ? '같은 칸에 합류!' : '보관함에 합류!'}`
      : result.reason === 'disabled' ? '장비 추가 구매는 현재 잠겨 있습니다.'
      : result.reason === 'locked' ? '장비 추가 구매 조건이 필요해요.'
      : result.reason === 'enhancement' ? '먼저 10강까지 강화하세요.'
      : result.reason === 'gold' ? '골드가 부족해요.' : '추가 구매 조건을 확인하세요.');
  }
  function buildSchool(id) {
    const result=session.change(s=>upgradeSchool(s,Date.now(),id));
    if(!result)return;
    audio.ui(result.ok ? 'build' : 'error',state().sound);
    text('#shop-message',result.ok?`${SCHOOLS[id].name} Lv.${result.level} 완료! ${SCHOOLS[id].effects[result.level-1]} 해금`
      :result.reason==='locked'?schoolOffer(state(),id).requirement+' 조건이 필요해요.':result.reason==='max'?'최대 레벨입니다.':'골드가 부족해요.');
  }
  function upgradeGun() {
    const id = activeEquipment;
    const result = session.change(s => enhanceEquipment(s, Date.now(), id));
    if (!result) return;
    audio.ui(result.ok ? 'upgrade-success' : 'error',state().sound);
    if (dialog.open && activePanel === 'equipment' && activeEquipment === id) text('#equipment-message', result.ok
      ? `${EQUIPMENT[id].name} +${result.level}강 완료!`
      : result.reason === 'max' ? '현재 강화 한도입니다. 개인 장비에서 사단기를 골드로 강화하면 한도가 1강씩 늘어납니다.'
      : result.reason === 'unowned' ? '장비를 먼저 구매하세요.' : '골드가 부족해요.');
  }
  function toggleEquipment() {
    const id = activeEquipment;
    const result = session.change(s => setEquipmentDeployed(s, !equipmentOf(s, id)?.deployed, Date.now(), id));
    if (result) audio.ui(result.ok ? 'equip' : 'error',state().sound);
    if (result?.ok && dialog.open && activePanel === 'equipment' && activeEquipment === id)
      text('#equipment-message', EQUIPMENT[id].name + (result.deployed ? ' 배치 완료!' : ' 보관 완료! 강화는 유지됩니다.'));
  }
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)
        dialog.close();
      return;
    }
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.id === 'close-shop' || button.id === 'close-equipment') dialog.close();
    else if (button.dataset.panel) button.dataset.panel === 'shop' ? openShop() : openEquipment();
    else if (button.dataset.shopCategory) { openShop(button.dataset.shopCategory); $(`[data-shop-category="${category}"]`)?.focus({preventScroll:true}); }
    else if (button.dataset.equipmentCategory) openEquipment(activeEquipment, button.dataset.equipmentCategory);
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
    else if (button.dataset.buyAdditional) purchaseAdditionalGun(button.dataset.buyAdditional);
    else if (button.dataset.buyEquipment) purchaseGun(button.dataset.buyEquipment);
    else if (button.dataset.facilityAction) {
      const id=button.dataset.facilityAction,owned=facilityLevel(state(),id)>0;
      const result=session.change(s=>(owned?upgradeFacility:buildFacility)(s,Date.now(),id));
      if(result) {
        audio.ui(result.ok?(owned?'upgrade-success':'build'):'error',state().sound);
        text('#shop-message',result.ok?`${facilityOffer(state(),id).facility.name} Lv.${facilityLevel(state(),id)} ${owned?'강화':'건설'} 완료! 연병장에서 확인하세요.`:result.reason==='max'?'최대 레벨입니다.':'시설 조건과 보유 골드를 확인하세요.');
      }
    }
    else if (button.dataset.upgradeSchool) buildSchool(button.dataset.upgradeSchool);
    else if (button.dataset.manageEquipment) openEquipment(button.dataset.manageEquipment, 'military');
    else if (button.dataset.selectEquipment) openEquipment(button.dataset.selectEquipment);
    else if (button.id === 'enhance-equipment') upgradeGun();
    else if (button.id === 'toggle-equipment') toggleEquipment();
  });
  onDetailAction((action, data) => {
    if (action === 'shop-category') { closeDetail(); openShop(data.category); }
    else if (action === 'manage-equipment') { closeDetail(); openEquipment(data.id, 'military'); }
  });
  dialog.addEventListener('close', () => document.querySelector(activePanel === 'equipment' ? '#open-equipment' : '#open-shop').focus());
  return { openShop, openEquipment, sync, syncAwards:personalAwards.sync };
}
