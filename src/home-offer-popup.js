import {reportError} from './diagnostics.js';
import {STARTER_PACK} from './starter-pack.js';
import {potionIcon} from './potion-art.js';
import {POTIONS} from './potions.js';
import {HOME_AUTO_TAP} from './home-auto-tap-rules.js';
import {fmt} from './format.js';
import {homeAutoTapPitch,AUTO_TAP_TEST_GRANT} from './home-auto-tap-ui.js';
import {openDetail,onDetailAction} from './detail-popup.js';

const adIcon='<svg viewBox="0 0 80 64" aria-hidden="true"><rect x="4" y="6" width="72" height="48" rx="8" fill="#263c35" stroke="#e1c983" stroke-width="3"/><path d="m32 17 21 13-21 13z" fill="#e1c983"/><path d="M24 61h32" stroke="#e1c983" stroke-width="3"/></svg>';
export function homeOfferMarkup(id,{allowTestGrant=AUTO_TAP_TEST_GRANT}={}) {
  const auto=id==='auto',p=POTIONS[id];
  if(id==='max')return {kicker:'스타터팩 구성품',title:p.name,body:`<div class="home-offer max-offer" data-home-offer="max"><div class="home-offer-art">${potionIcon('max')}</div><h3>10분 동안 금빛 성장</h3><p>${p.effect}</p><p>스타터팩에 ${STARTER_PACK.max}개 포함 · 예정 가격 ${fmt(STARTER_PACK.priceWon)}원</p><p>사용하면 연병장에 은은한 금빛이 감돌아요.<br>시간은 종료 중에도 흐르며, 다른 부스터와 곱해 적용돼요.</p><button type="button" class="buy" data-detail-action="max-store">스타터팩 보기</button></div>`};
  if(!auto&&!p)throw new RangeError('Unknown home item');
  return {kicker:auto?'영구 아이템':'부스터 받기',title:auto?'자동터치':p.name,
    body:`<div class="home-offer" data-home-offer="${id}">${auto?homeAutoTapPitch():`<div class="home-offer-art">${adIcon}</div>`}
    ${auto?'':`<p>${p.effect} · ${p.durationLabel}</p>`}
    <p>${auto?`영구 보유 · 예정 가격 ${fmt(HOME_AUTO_TAP.priceWon)}원`:'광고 보상 조건을 완료하면 부스터 1개를 받아요.'}</p>
    <button type="button" class="buy" data-detail-action="home-offer-claim" data-item="${id}" ${auto&&!allowTestGrant?'disabled':''}>${auto?(allowTestGrant?'구매하기 · 개발 테스트':'구매 준비 중'):'광고 보기'}</button>
    <p class="potion-note">${auto?'실제 결제·구매 복원은 아직 연결되지 않았어요. 개발 테스트에서는 결제하지 않아요.':'Android 앱에서 이용할 수 있어요. 광고를 중간에 닫으면 지급되지 않아요.'}</p>
    <p role="status" data-home-offer-message></p></div>`};
}
export function createHomeOfferPopup({watch,buy,openStore=()=>{},onSuccess=()=>{},active=()=>true,register=onDetailAction,show=openDetail}) {
  let busy=false;
  register(async(action,data,dialog)=>{
    if(action==='max-store'&&active()){dialog.close();openStore();return;}
    if(action!=='home-offer-claim'||busy||!active())return;
    const card=dialog.querySelector('[data-home-offer]');
    if(!card||card.dataset.homeOffer!==data.item)return;
    const button=card.querySelector('[data-detail-action]'),message=card.querySelector('[data-home-offer-message]');
    if(button.disabled)return;
    busy=true;button.disabled=true;message.textContent='잠시만 기다려 주세요.';
    try {
      const result=await(data.item==='auto'?buy():watch(data.item));
      if(result?.ok)onSuccess();
      if(!card.isConnected)return;
      message.textContent=result?.ok?(data.item==='auto'?'자동터치를 보유했어요. 홈에서 켜고 끌 수 있어요.':'부스터 1개를 받았어요. 홈 블록을 눌러 사용하세요.'):
        result?.reason==='cancelled'?'취소했어요. 보상은 지급되지 않았어요.':'지금 이용할 수 없어요. Android 앱과 인터넷 연결을 확인해 주세요.';
      button.disabled=!!result?.ok;
      if(result?.ok)button.textContent='획득 완료';
    } catch(error) {reportError("home.offer",error);if(card.isConnected){message.textContent="처리하지 못했어요. 다시 시도해 주세요.";button.disabled=false;}} finally {busy=false;}
  });
  return {open:id=>show(homeOfferMarkup(id))};
}
