import {reportError} from './diagnostics.js';
import {STARTER_PACK} from './starter-pack.js';
import {potionIcon} from './potion-art.js';
import {POTIONS} from './potions.js';
import {HOME_AUTO_TAP} from './home-auto-tap-rules.js';
import {fmt} from './format.js';
import {homeAutoTapPitch,AUTO_TAP_TEST_GRANT} from './home-auto-tap-ui.js';
import {openDetail,onDetailAction} from './detail-popup.js';

const adIcon='<svg viewBox="0 0 80 64" aria-hidden="true"><rect x="4" y="6" width="72" height="48" rx="8" fill="#263c35" stroke="#e1c983" stroke-width="3"/><path d="m32 17 21 13-21 13z" fill="#e1c983"/><path d="M24 61h32" stroke="#e1c983" stroke-width="3"/></svg>';
export function homeOfferMarkup(id,{allowTestGrant=AUTO_TAP_TEST_GRANT,billing=null,owned=false}={}) {
  const auto=id==='auto',p=POTIONS[id];
  const play=billing?.configured===true;
  const price=String(billing?.price??'Play 가격 확인 중').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const disabled=owned||(play?!billing.price:!allowTestGrant);
  const label=owned?'보유 중':play?(billing.price?'Google Play로 구매':'상품 확인 필요'):allowTestGrant?'구매하기 · 개발 테스트':'구매 준비 중';
  const purchaseNote=play?'Google Play 일회성 구매 상품입니다. 구매창의 가격과 결제 계정을 확인하세요.':'실제 결제·구매 복원은 아직 연결되지 않았어요. 개발 테스트에서는 결제하지 않아요.';
  if(id==='max')return {kicker:'스타터팩',title:p.name,body:`<div class="home-offer max-offer" data-home-offer="max"><div class="home-offer-art">${potionIcon('max')}</div><h3>10분 동안 금빛 성장</h3><p>${p.effect}</p><p>스타터팩: 빨강 ${STARTER_PACK.red}개 · 파랑 ${STARTER_PACK.blue}개 · 금빛 ${STARTER_PACK.max}개 · 자동터치 미포함</p><p>${play?price:`예정 가격 ${fmt(STARTER_PACK.priceWon)}원`}</p><p>시간은 종료 중에도 흐르며, 다른 부스터와 곱해 적용돼요.</p><button type="button" class="buy" data-detail-action="home-offer-claim" data-item="max" ${disabled?'disabled':''}>${label}</button><p class="potion-note">${purchaseNote} 이미 받은 부스터는 다시 지급하지 않아요.</p><p role="status" data-home-offer-message></p></div>`};
  if(!auto&&!p)throw new RangeError('Unknown home item');
  return {kicker:auto?'영구 아이템':'부스터 받기',title:auto?'자동터치':p.name,
    body:`<div class="home-offer" data-home-offer="${id}">${auto?homeAutoTapPitch():`<div class="home-offer-art">${adIcon}</div>`}
    ${auto?'':`<p>${p.effect} · ${p.durationLabel}</p>`}
    <p>${auto?`영구 보유 · ${play?price:`예정 가격 ${fmt(HOME_AUTO_TAP.priceWon)}원`}`:'광고 보상 조건을 완료하면 부스터 1개를 받아요.'}</p>
    <button type="button" class="buy" data-detail-action="home-offer-claim" data-item="${id}" ${auto&&disabled?'disabled':''}>${auto?label:'광고 보기'}</button>
    <p class="potion-note">${auto?purchaseNote:'Android 앱에서 이용할 수 있어요. 광고를 중간에 닫으면 지급되지 않아요.'}</p>
    <p role="status" data-home-offer-message></p></div>`};
}
export function createHomeOfferPopup({watch,buy,getBilling=()=>null,isOwned=()=>false,onSuccess=()=>{},active=()=>true,register=onDetailAction,show=openDetail}) {
  let busy=false;
  register(async(action,data,dialog)=>{
    if(action!=='home-offer-claim'||busy||!active())return;
    const card=dialog.querySelector('[data-home-offer]');
    if(!card||card.dataset.homeOffer!==data.item)return;
    const button=card.querySelector('[data-detail-action]'),message=card.querySelector('[data-home-offer-message]');
    if(button.disabled)return;
    busy=true;button.disabled=true;message.textContent='잠시만 기다려 주세요.';
    try {
      const purchase=data.item==='auto'||data.item==='max';
      const result=await(purchase?buy(data.item==='auto'?'auto':'starter'):watch(data.item));
      if(result?.ok)onSuccess();
      if(!card.isConnected)return;
      message.textContent=result?.ok?(data.item==='auto'?'자동터치를 보유했어요. 홈에서 켜고 끌 수 있어요.':data.item==='max'?'스타터팩을 받았어요. 아이템에서 부스터를 사용하세요.':'부스터 1개를 받았어요. 홈 블록을 눌러 사용하세요.'):
        result?.reason==='cancelled'?'취소했어요. 보상은 지급되지 않았어요.':result?.reason==='pending'?'결제 승인 대기 중이에요. 완료 전에는 지급하지 않아요.':result?.reason==='limit'?'부스터 보관 한도를 확인해 주세요.':'처리를 완료하지 못했어요. 상점의 구매 처리 확인으로 다시 확인해 주세요.';
      button.disabled=!!result?.ok;
      if(result?.ok)button.textContent='획득 완료';
    } catch(error) {reportError("home.offer",error);if(card.isConnected){message.textContent="처리하지 못했어요. 다시 시도해 주세요.";button.disabled=false;}} finally {busy=false;}
  });
  return {open:id=>show(homeOfferMarkup(id,{billing:getBilling(id==='max'?'starter':id),owned:isOwned(id==='max'?'starter':id)}))};
}
