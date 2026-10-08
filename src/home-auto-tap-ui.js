import {HOME_AUTO_TAP,grantTestHomeAutoTap,toggleHomeAutoTap} from './home-auto-tap-rules.js';
import {fmt,fmtGold} from './format.js';
import {reportError} from './diagnostics.js';

const icon='<svg viewBox="0 0 66 80" role="img" aria-label="자동터치 지원 장치 픽셀 그림" shape-rendering="crispEdges"><path fill="#122625" d="M13 12h40v58H13z"/><path fill="#839586" d="M16 9h34v4H16zM10 16h4v49h-4zM52 16h4v49h-4zM16 69h34v4H16z"/><path fill="#415b51" d="M15 15h36v51H15z"/><path fill="#adbc91" d="M17 17h32v3H17zM17 20h3v43h-3z"/><path fill="#1e3530" d="M22 23h24v24H22z"/><path fill="#7cb4a1" d="M25 26h18v3H25zM25 30h3v12h-3z"/><path fill="#dccc8b" d="M31 29h6v13h-6zM27 32h14v6H27z"/><path fill="#f4e5af" d="M31 29h3v7h-3z"/><path fill="#9ab774" d="M23 50h7v3h-7zM34 50h10v3H34z"/><path fill="#c9b479" d="M28 57h12v6H28z"/><path fill="#f1d998" d="M29 57h10v2H29z"/><path fill="#687f67" d="M45 20h3v43h-3zM20 64h25v2H20z"/><path fill="#daf1bd" d="M5 27h3v7H5zM58 27h3v7h-3zM30 2h6v3h-6z"/></svg>';
export function homeAutoTapMarkup(){
  return `<article class="potion-card auto-tap-card" aria-label="자동터치" data-home-auto-tap>
    <div class="potion-heading"><div class="potion-art">${icon}</div><div><h3>자동터치</h3><strong>초당 2회 · 영구 보유</strong><p>홈에서 자동으로 골드를 모아요.</p><b data-home-auto-status></b></div></div>
    <p class="potion-note">손가락 터치와 함께 사용할 수 있어요.<br>상점·전투·팝업·앱 종료 중에는 멈춥니다.</p>
    <div class="potion-actions"><button type="button" data-buy-home-auto>${fmt(HOME_AUTO_TAP.priceWon)}원</button><button type="button" data-toggle-home-auto aria-pressed="false" disabled>자동터치 켜기</button></div>
    <p class="potion-note">유료결제 테스트 · 실제 요금은 청구되지 않아요.</p></article>`;
}
export function renderHomeAutoTap(s,root,{busy=false,active=true}={}){
  const card=root.querySelector('[data-home-auto-tap]');if(!card)return;
  const owned=!!s.homeAutoTap?.owned,enabled=owned&&s.homeAutoTap.enabled;
  const text=(node,next)=>{if(node.textContent!==next)node.textContent=next;};
  text(card.querySelector('[data-home-auto-status]'),owned?'영구 보유 · '+(enabled?'켜짐':'꺼짐'):'미보유');
  const buy=card.querySelector('[data-buy-home-auto]'),toggle=card.querySelector('[data-toggle-home-auto]');
  buy.disabled=owned||busy||!active;text(buy,owned?'보유 중':fmt(HOME_AUTO_TAP.priceWon)+'원');
  toggle.disabled=!owned||busy||!active;text(toggle,enabled?'자동터치 끄기':'자동터치 켜기');
  toggle.setAttribute('aria-pressed',String(enabled));
}
export function createHomeAutoTapPurchase(session,{showPurchase,onChange=()=>{},onError=reportError}){
  let busy=false;
  async function buy(){
    if(busy||!session.active||session.state.homeAutoTap?.owned)return {ok:false,reason:'unavailable'};
    busy=true;onChange();
    try{
      const result=await showPurchase();
      if(result?.status!=='granted'||result?.source!=='test')return {ok:false,reason:'cancelled'};
      return session.change(grantTestHomeAutoTap)??{ok:false,reason:'inactive'};
    }catch(error){onError('homeAutoTap.purchase',error);return {ok:false,reason:'error'};}
    finally{busy=false;onChange();}
  }
  return {buy,toggle:()=>busy?{ok:false,reason:'busy'}:session.change(toggleHomeAutoTap),get busy(){return busy;}};
}
export function createHomeAutoTapFeedback(node){
  let animation=null;
  return {show(amount){
    node.textContent=`자동 +${fmtGold(amount)} G`;
    animation?.cancel();
    animation=node.animate?.([{opacity:0},{opacity:.85,offset:.2},{opacity:0}],{duration:420});
  },clear(){animation?.cancel();animation=null;}};
}
