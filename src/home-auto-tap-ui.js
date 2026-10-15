import {HOME_AUTO_TAP} from './home-auto-tap-rules.js';
import {createStorePurchase,STORE_TEST_GRANT} from './store-purchase.js';
import {fmt,fmtGold} from './format.js';
import {reportError} from './diagnostics.js';

import {homeAutoTapIcon} from './home-auto-tap-art.js';
export {homeAutoTapIcon} from './home-auto-tap-art.js';
export const AUTO_TAP_TEST_GRANT=STORE_TEST_GRANT;
// The store and home offer share the same truthful benefit preview. Pure markup:
// decorative clicks never call the game transaction or award gold.
export function homeAutoTapPitch(){
  return `<div class="auto-pitch">
    <div class="auto-pitch-tag"><span>편의 아이템</span><span>영구 보유</span></div>
    <h3>손은 쉬어도<br><em>부대는 성장</em></h3>
    <p class="auto-pitch-lead">반복 터치는 맡기고, 다음 성장을 준비하세요.</p>
    <div class="auto-pitch-scene" aria-hidden="true"><span class="auto-pitch-halo"></span><span class="auto-pitch-ring"></span><span class="auto-pitch-pointer">${homeAutoTapIcon}</span><span class="auto-pitch-gold">+ G</span><small>작동 예시</small></div>
    <div class="auto-pitch-benefits"><div><strong>초당 ${HOME_AUTO_TAP.tapsPerSecond}회</strong><span>자동으로 터치</span></div><div><strong>함께 사용</strong><span>손가락 터치도 그대로</span></div><div><strong>ON / OFF</strong><span>원할 때 켜고 끄기</span></div></div>
    <p class="auto-pitch-limit">홈 화면에서만 작동해요.<br>상점·전투·팝업·앱 종료 중에는 멈춥니다.</p>
  </div>`;
}
export function homeAutoTapMarkup(){
  return `<article class="potion-card auto-tap-card" aria-label="자동터치" data-home-auto-tap>
    <div class="store-product-art" aria-hidden="true">${homeAutoTapIcon}</div>
    <header class="auto-product-name"><h3>자동터치</h3></header>
    <p class="auto-owned-status" data-home-auto-status role="status" hidden></p>
    <div class="product-purchase-row"><strong class="auto-price" data-play-price>예정 가격 ${fmt(HOME_AUTO_TAP.priceWon)}원</strong>
    <div class="potion-actions"><button type="button" data-buy-home-auto disabled>구매 준비 중</button><button type="button" data-toggle-home-auto aria-pressed="false" disabled hidden>자동터치 켜기</button></div></div>
    <details class="store-purchase-help"><summary>구매·복원 안내</summary><button type="button" data-restore-home-auto disabled hidden>구매 복원</button><p>초당 ${HOME_AUTO_TAP.tapsPerSecond}회 · 영구 해금. 홈에서만 작동하며 상점·전투·팝업·앱 종료 중에는 멈춥니다.</p><p class="potion-note" data-play-note>실제 결제는 아직 연결되지 않았어요. 개발 화면에서만 무료 테스트 지급을 받을 수 있어요.<br>현재 기기 기록에 보관하며 구매 복원은 준비 중입니다.</p></details></article>`;
}
export function renderHomeAutoTap(s,root,{busy=false,active=true,allowTestGrant=AUTO_TAP_TEST_GRANT,billing=null}={}){
  const card=root.querySelector('[data-home-auto-tap]');if(!card)return;
  const owned=!!s.homeAutoTap?.owned,enabled=owned&&s.homeAutoTap.enabled;
  const text=(node,next)=>{if(node.textContent!==next)node.textContent=next;};
  text(card.querySelector('[data-home-auto-status]'),owned?'영구 보유 · '+(enabled?'켜짐':'꺼짐'):'미보유');
  const buy=card.querySelector('[data-buy-home-auto]'),toggle=card.querySelector('[data-toggle-home-auto]');
  const status=card.querySelector('[data-home-auto-status]');
  if(status.hidden!==!owned)status.hidden=!owned;
  if(toggle.hidden!==!owned)toggle.hidden=!owned;
  const play=billing?.configured===true;
  buy.disabled=owned||busy||!active||(play?!billing.price:!allowTestGrant);
  text(buy,owned?'보유 중':play?(billing.price?'구매':'상품 확인 필요'):allowTestGrant?'개발용 테스트 지급':'구매 준비 중');
  const restore=card.querySelector('[data-restore-home-auto]');
  if(restore){restore.hidden=!play;restore.disabled=busy||!active;}
  if(play){
    const price=card.querySelector('[data-play-price]'),note=card.querySelector('[data-play-note]');
    if(price)text(price,billing.price||'Play 가격 확인 중');
    if(note)text(note,'Google Play 일회성 구매 상품입니다. 구매창의 가격과 계정을 확인하세요. 같은 Play 계정으로 영구 상품을 복원할 수 있어요. 게임 진행 기록은 복원되지 않아요.');
  }
  toggle.disabled=!owned||busy||!active;text(toggle,enabled?'자동터치 끄기':'자동터치 켜기');
  toggle.setAttribute('aria-pressed',String(enabled));
}
export function createHomeAutoTapPurchase(session,{onError=reportError,...options}){
  const purchase=createStorePurchase(session,{...options,onError:(_,error)=>onError('homeAutoTap.purchase',error)});
  return {buy:()=>purchase.buy('auto'),toggle:purchase.toggle,get busy(){return purchase.busy;}};
}
export function createHomeAutoTapFeedback(node, label = '자동'){
  let animation=null;
  return {show(amount){
    node.textContent=`${label} +${fmtGold(amount)} G`;
    animation?.cancel();
    animation=node.animate?.([{opacity:0},{opacity:.85,offset:.2},{opacity:0}],{duration:420});
  },clear(){animation?.cancel();animation=null;}};
}
