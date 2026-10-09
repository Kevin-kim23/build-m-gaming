import {grantTestHomeAutoTap,toggleHomeAutoTap} from './home-auto-tap-rules.js';
import {fmtGold} from './format.js';
import {reportError} from './diagnostics.js';

const icon=`<svg viewBox="0 0 66 80" role="img" aria-label="자동터치 커서 · AUTO" shape-rendering="crispEdges">
  <path fill="#0c1917" d="M14 5h5l36 30v5H40l8 16-14 7-9-18-11 11z"/>
  <path fill="#9b8958" d="M17 8l34 29H36l9 18-9 4-10-20-9 10z"/>
  <path fill="#e9dfb4" d="M17 8l31 26H32l10 20-5 2-11-22-9 10z"/>
  <path fill="#fff5d6" d="M17 8l26 22H24v7l-7 7z"/>
  <path fill="#b7c9aa" d="M8 6h3v7H8zM2 16h7v3H2zM27 3h3v7h-3z"/>
  <path fill="#586e57" d="M9 64h48v13H9z"/>
  <path fill="#172b23" d="M10 65h46v11H10z"/>
  <text x="33" y="74" text-anchor="middle" font-family="monospace" font-size="12" font-weight="700" letter-spacing="2" fill="#f4dfa0" shape-rendering="auto">AUTO</text>
</svg>`;
export function homeAutoTapMarkup(){
  return `<article class="potion-card auto-tap-card" aria-label="자동터치" data-home-auto-tap>
    <div class="potion-heading"><div class="potion-art">${icon}</div><div><h3>자동터치</h3><strong>초당 2회 · 영구 보유</strong><p>홈에서 자동으로 골드를 모아요.</p><b data-home-auto-status></b></div></div>
    <p class="potion-note">손가락 터치와 함께 사용할 수 있어요.<br>상점·전투·팝업·앱 종료 중에는 멈춥니다.</p>
    <div class="potion-actions"><button type="button" data-buy-home-auto>무료 테스트 받기</button><button type="button" data-toggle-home-auto aria-pressed="false" disabled>자동터치 켜기</button></div>
    <p class="potion-note">현재 무료 테스트 · 실제 구매와 구매 복원 기능은 아직 제공하지 않아요.</p></article>`;
}
export function renderHomeAutoTap(s,root,{busy=false,active=true}={}){
  const card=root.querySelector('[data-home-auto-tap]');if(!card)return;
  const owned=!!s.homeAutoTap?.owned,enabled=owned&&s.homeAutoTap.enabled;
  const text=(node,next)=>{if(node.textContent!==next)node.textContent=next;};
  text(card.querySelector('[data-home-auto-status]'),owned?'영구 보유 · '+(enabled?'켜짐':'꺼짐'):'미보유');
  const buy=card.querySelector('[data-buy-home-auto]'),toggle=card.querySelector('[data-toggle-home-auto]');
  buy.disabled=owned||busy||!active;text(buy,owned?'보유 중':'무료 테스트 받기');
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
