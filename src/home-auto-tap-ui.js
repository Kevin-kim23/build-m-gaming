import {HOME_AUTO_TAP} from './home-auto-tap-rules.js';
import {createStorePurchase,STORE_TEST_GRANT} from './store-purchase.js';
import {fmtGold} from './format.js';
import {billingPriceLabel} from './billing-price-label.js';
import {reportError} from './diagnostics.js';

import {homeAutoTapIcon} from './home-auto-tap-art.js';
export {homeAutoTapIcon} from './home-auto-tap-art.js';
export const AUTO_TAP_TEST_GRANT=STORE_TEST_GRANT;
// The store and home offer share the same truthful benefit preview. Pure markup:
// decorative clicks never call the game transaction or award gold.
export function homeAutoTapPitch(){
  return `<div class="auto-pitch">
    <div class="auto-pitch-tag"><span>한 번 구매 · 영구 해금</span></div>
    <h3>반복 터치를<br><em>자동으로.</em></h3>
    <div class="auto-pitch-scene" aria-hidden="true"><span class="auto-pitch-halo"></span><span class="auto-pitch-ring"></span><span class="auto-pitch-pointer">${homeAutoTapIcon}</span><span class="auto-pitch-word">AUTO</span><span class="auto-pitch-gold">+ G</span><small>작동 예시</small></div>
    <p class="auto-pitch-spec">초당 ${HOME_AUTO_TAP.tapsPerSecond}회 <span>·</span> 원할 때 ON / OFF</p>
    <p class="auto-pitch-limit">홈 화면에서만 작동해요.<br>상점·전투·팝업·앱 종료 중에는 멈춥니다.</p>
  </div>`;
}
export function homeAutoTapMarkup(){
  return `<article class="potion-card auto-tap-card" aria-label="자동터치" data-home-auto-tap>
    <div class="auto-product-row"><div class="store-product-art" aria-hidden="true">${homeAutoTapIcon}</div>
    <header class="auto-product-name"><h3>자동터치</h3><span class="auto-rate-label">초당 ×${HOME_AUTO_TAP.tapsPerSecond}!</span></header>
    <div class="auto-product-action"><button type="button" data-buy-home-auto disabled>구매 준비 중</button><button type="button" data-toggle-home-auto aria-pressed="false" disabled hidden>자동터치 켜기</button></div></div>
    <details class="store-purchase-help"><summary>구매·복원 안내</summary><p class="auto-owned-status" data-home-auto-status role="status" hidden></p><button type="button" data-restore-home-auto disabled hidden>구매 복원</button><p>초당 ${HOME_AUTO_TAP.tapsPerSecond}회 · 영구 해금. 홈에서만 작동하며 상점·전투·팝업·앱 종료 중에는 멈춥니다.</p><p class="potion-note" data-play-note>실제 결제는 아직 연결되지 않았어요. 개발 화면에서만 무료 테스트 지급을 받을 수 있어요.<br>현재 기기 기록에 보관하며 구매 복원은 준비 중입니다.</p></details></article>`;
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
  if(buy.hidden!==owned)buy.hidden=owned;
  const play=billing?.configured===true;
  const price=billingPriceLabel(billing?.price);
  buy.disabled=owned||busy||!active||(play?!price:!allowTestGrant);
  const label=owned?'보유 중':play?(price||'상품 확인 필요'):allowTestGrant?'무료 테스트':'구매 준비 중';
  text(buy,label);
  buy.setAttribute('aria-label',play&&price&&!owned?'자동터치 '+label+' 구매':'자동터치 '+label);
  const restore=card.querySelector('[data-restore-home-auto]');
  if(restore){restore.hidden=!play;restore.disabled=busy||!active;}
  if(play){
    const note=card.querySelector('[data-play-note]');
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
