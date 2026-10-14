import {HOME_AUTO_TAP} from './home-auto-tap-rules.js';
import {createStorePurchase,STORE_TEST_GRANT} from './store-purchase.js';
import {fmt,fmtGold} from './format.js';
import {reportError} from './diagnostics.js';

import {homeAutoTapIcon} from './home-auto-tap-art.js';
export {homeAutoTapIcon} from './home-auto-tap-art.js';
export const AUTO_TAP_TEST_GRANT=STORE_TEST_GRANT;
export function homeAutoTapMarkup(){
  return `<article class="potion-card auto-tap-card" aria-label="자동터치" data-home-auto-tap>
    <div class="potion-heading"><div class="potion-art">${homeAutoTapIcon}</div><div><h3>자동터치</h3><strong>초당 ${HOME_AUTO_TAP.tapsPerSecond}회 · 영구 보유</strong><p>홈에서 자동으로 골드를 모아요.</p><b data-home-auto-status></b></div></div>
    <p class="potion-note">손가락 터치와 함께 사용할 수 있어요.<br>상점·전투·팝업·앱 종료 중에는 멈춥니다.</p>
    <strong class="auto-price">예정 가격 ${fmt(HOME_AUTO_TAP.priceWon)}원</strong>
    <div class="potion-actions"><button type="button" data-buy-home-auto disabled>구매 준비 중</button><button type="button" data-toggle-home-auto aria-pressed="false" disabled>자동터치 켜기</button></div>
    <p class="potion-note">기존 무료 지급 보유자는 계속 사용할 수 있어요.<br>신규 이용자는 유료 구매 예정 · 현재 구매와 계정 복원은 준비 중입니다.</p></article>`;
}
export function renderHomeAutoTap(s,root,{busy=false,active=true,allowTestGrant=AUTO_TAP_TEST_GRANT}={}){
  const card=root.querySelector('[data-home-auto-tap]');if(!card)return;
  const owned=!!s.homeAutoTap?.owned,enabled=owned&&s.homeAutoTap.enabled;
  const text=(node,next)=>{if(node.textContent!==next)node.textContent=next;};
  text(card.querySelector('[data-home-auto-status]'),owned?'영구 보유 · '+(enabled?'켜짐':'꺼짐'):'미보유');
  const buy=card.querySelector('[data-buy-home-auto]'),toggle=card.querySelector('[data-toggle-home-auto]');
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
