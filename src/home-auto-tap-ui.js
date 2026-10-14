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
    <header class="auto-product-name"><span>AUTO TAP</span><h3>자동터치</h3></header>
    ${homeAutoTapPitch()}
    <p class="auto-owned-status" data-home-auto-status role="status" hidden></p>
    <strong class="auto-price">예정 가격 ${fmt(HOME_AUTO_TAP.priceWon)}원</strong>
    <div class="potion-actions"><button type="button" data-buy-home-auto disabled>구매 준비 중</button><button type="button" data-toggle-home-auto aria-pressed="false" disabled hidden>자동터치 켜기</button></div>
    <p class="potion-note">실제 결제는 아직 연결되지 않았어요. 개발 화면에서만 무료 테스트 지급을 받을 수 있어요.<br>현재 기기 기록에 보관하며 구매 복원은 준비 중입니다.</p></article>`;
}
export function renderHomeAutoTap(s,root,{busy=false,active=true,allowTestGrant=AUTO_TAP_TEST_GRANT}={}){
  const card=root.querySelector('[data-home-auto-tap]');if(!card)return;
  const owned=!!s.homeAutoTap?.owned,enabled=owned&&s.homeAutoTap.enabled;
  const text=(node,next)=>{if(node.textContent!==next)node.textContent=next;};
  text(card.querySelector('[data-home-auto-status]'),owned?'영구 보유 · '+(enabled?'켜짐':'꺼짐'):'미보유');
  const buy=card.querySelector('[data-buy-home-auto]'),toggle=card.querySelector('[data-toggle-home-auto]');
  const status=card.querySelector('[data-home-auto-status]');
  if(status.hidden!==!owned)status.hidden=!owned;
  if(toggle.hidden!==!owned)toggle.hidden=!owned;
  buy.disabled=owned||busy||!active||!allowTestGrant;text(buy,owned?'보유 중':allowTestGrant?'개발용 테스트 지급':'구매 준비 중');
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
