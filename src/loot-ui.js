import { OPERATIVES, SUPPLY_CAP, supplyStatus, recruitOperative, claimSupply, toggleDuty } from './loot.js';
import { POTIONS, POTION_COUNT_LIMIT } from './potions.js';
import { fmt } from './format.js';
import { operativeIcon, lootIcon } from './operative-art.js';
import { potionIcon } from './potion-art.js';

export function supplyTime(ms) {
  const minutes=Math.max(1,Math.ceil(ms/60000)),h=Math.floor(minutes/60),m=minutes%60;
  return h?`${h}시간${m?` ${m}분`:''}`:`${m}분`;
}
export function supplyCountdown(ms) {
  const minutes=Math.max(1,Math.ceil(ms/60000));
  return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
}
const role=o=>o.period?'정기 보급':o.id==='duty'?'자동 지원':'수입 보관';
function operativeCardMarkup(o) {
  const potion=POTIONS[o.potion];
  return `<article class="operative-card" data-operative="${o.id}" style="--operative-color:${o.color}">
    <div class="operative-profile">
      <div class="operative-portrait">${operativeIcon(o.id)}</div>
      <div class="operative-info"><span class="operative-role">${role(o)}</span>
        <h3>${o.name}</h3><div class="operative-meta"><span data-crew-owned hidden>영입 완료</span><span class="operative-timer" data-crew-timer hidden></span></div>
        <p class="operative-effect">${o.effect}</p>
      </div>
    </div>
    ${potion?`<div class="operative-supply-preview"><span class="operative-supply-icon" aria-hidden="true">${potionIcon(o.potion)}</span><div><strong>${potion.name} ×1</strong><span>${potion.effect} · ${potion.durationLabel}</span></div><small data-crew-welcome>첫 영입 즉시 지급</small></div>`:''}
    <details class="operative-detail"><summary aria-label="${o.name} 상세보기">능력 자세히</summary><p>${o.detail}${o.period?` 첫 영입 시 1개를 아이템에 즉시 지급해요. 아이템이 가득 차면 보급함에 보관해요. 이후 영입한 시각부터 주기적으로 생성되고, 종료 중에도 시간이 흐르며 최대 ${SUPPLY_CAP}회분을 보관해요. 받으면 아이템에 추가돼요.`:''}</p></details>
    <div class="operative-actions"><div class="operative-action-info"><span data-crew-price-label>영입 비용</span><strong data-crew-price>${fmt(o.price)}개</strong><small data-crew-status></small></div>
      <button type="button" data-crew-action="${o.id}">영입하기</button></div>
  </article>`;
}
export function lootShopMarkup() {
  return `<dialog id="loot-shop" aria-labelledby="loot-title">
    <header class="loot-head"><div><small>승리의 보상, 부대의 새로운 힘</small><h2 id="loot-title">전리품 상점</h2></div><button type="button" data-loot-close aria-label="전리품 상점 닫기">×</button></header>
    <div class="loot-wallet"><span class="loot-wallet-icon" aria-hidden="true">${lootIcon()}</span><div class="loot-wallet-caption"><span>보유 전리품</span><small>전투 승리로 획득</small></div><strong><span data-loot-balance>0</span><small>개</small></strong></div>
    <div class="loot-scroll"><div class="loot-collection"><div><h3>특별 대원</h3><p>한 번의 영입으로 계속 함께하는 동료</p></div><strong data-loot-collection>0 / ${OPERATIVES.length}</strong></div>
      <div class="loot-principles"><span>영구 보유</span><span>종류별 1명</span><span>전리품 전용</span></div>
      ${OPERATIVES.map(operativeCardMarkup).join('')}
      <details class="loot-notice"><summary>전리품·보급 안내</summary><p>첫 승리·수도에서 더 많은 전리품을 얻어요. 재전투 보상은 한국시간 하루 합산 10회예요. 골드나 현금은 사용하지 않으며 골드와 전리품은 서로 교환하지 않아요. 보급은 대원의 ‘받기’를 눌러 수령하세요.</p></details>
    </div><footer class="loot-footer"><span data-loot-summary>대원을 영입하고 특별한 지원을 받아 보세요.</span><button type="button" data-loot-close>닫기</button></footer></dialog>`;
}

// The view model never changes inventory or clocks. Rendering can update text in
// place without rebuilding cards, losing expanded details, or moving the scroll.
export function operativeCardView(state,o,clock,active=true) {
  const p=state.loot?.operatives?.[o.id],balance=state.loot?.balance??0;
  if(!p)return {owned:false,phase:balance>=o.price?'available':'locked',label:'영입 비용',price:`${fmt(o.price)}개`,
    status:balance<o.price?`전리품 ${fmt(o.price-balance)}개 부족`:'전리품으로 영구 영입',action:'영입하기',disabled:!active||balance<o.price};
  if(o.period){
    const s=supplyStatus(state,o.id,clock),full=(state.potions?.[o.potion]?.count??0)>=POTION_COUNT_LIMIT;
    const capped=s.ready===SUPPLY_CAP;
    return {owned:true,phase:s.ready?'ready':'waiting',label:'보급함',price:`${s.ready} / ${SUPPLY_CAP}개`,
      status:full&&s.ready?'아이템에서 부스터를 사용해 주세요':capped?'보급함이 가득 찼어요':s.ready?'보급을 아이템으로 받을 수 있어요':'다음 보급을 준비하고 있어요',
      action:full&&s.ready?'아이템 가득':s.ready?`${s.ready}개 받기`:'보급 준비 중',disabled:!active||!s.ready||full,
      timer:capped?'보급함 가득':`다음 ${supplyCountdown(s.remainingMs)}`,timerLabel:capped?'보급함 가득':`다음 보급까지 ${supplyTime(s.remainingMs)}`,ready:s.ready};
  }
  if(o.id==='duty')return {owned:true,phase:p.enabled?'active':'paused',label:'홈 자동 지원',price:p.enabled?'사용 중':'일시 정지',
    status:'유료 자동터치와 별도로 +1회/초',action:p.enabled?'끄기':'켜기',disabled:!active,pressed:p.enabled};
  return {owned:true,phase:'applied',label:'오프라인 수입 보관',price:'최대 12시간',status:'기존 8시간에서 4시간 추가',action:'적용 중',disabled:true};
}

export function createLootShop(session,{root=document,now=Date.now,onSuccess=()=>{},notify=()=>{}}={}) {
  root.body.insertAdjacentHTML('beforeend',lootShopMarkup());
  const dialog=root.querySelector('#loot-shop'),trigger=root.querySelector('#open-loot');
  const balanceNode=dialog.querySelector('[data-loot-balance]'),collection=dialog.querySelector('[data-loot-collection]'),summary=dialog.querySelector('[data-loot-summary]');
  const cards=OPERATIVES.map(o=>{const node=dialog.querySelector(`[data-operative="${o.id}"]`),find=key=>node.querySelector(`[data-crew-${key}]`);return {o,node,button:find('action'),status:find('status'),owned:find('owned'),timer:find('timer'),welcome:find('welcome'),label:find('price-label'),price:find('price')};});
  const text=(node,value)=>{if(node.textContent!==value)node.textContent=value;};
  function sync() {
    const state=session.state,clock=now();
    const ready=OPERATIVES.reduce((sum,o)=>sum+supplyStatus(state,o.id,clock).ready,0);
    if(trigger){trigger.disabled=!session.active;trigger.classList.toggle('supplies-ready',ready>0);trigger.setAttribute('aria-description',ready?'받을 보급이 있어요':'');}
    if(!dialog.open)return;
    text(balanceNode,fmt(state.loot?.balance??0));
    text(collection,`${OPERATIVES.filter(o=>state.loot?.operatives?.[o.id]).length} / ${OPERATIVES.length}`);
    text(summary,ready?`받을 보급 ${ready}개 · 대원의 받기를 눌러 주세요.`:'보급을 받으면 아이템에 추가됩니다.');
    for(const {o,node,button,status,owned,timer,welcome,label,price} of cards){
      const v=operativeCardView(state,o,clock,session.active);
      if(node.dataset.phase!==v.phase)node.dataset.phase=v.phase;
      owned.hidden=!v.owned;timer.hidden=!v.timer;if(welcome)welcome.hidden=v.owned;
      if(v.timer){text(timer,v.timer);timer.setAttribute('aria-label',v.timerLabel);timer.title=v.timerLabel;}
      text(label,v.label);text(price,v.price);text(status,v.status);text(button,v.action);button.disabled=v.disabled;
      button.setAttribute('aria-label',`${o.name} ${v.action}${!v.owned?` · 전리품 ${fmt(o.price)}개`:''}`);
      if(v.pressed!==undefined)button.setAttribute('aria-pressed',String(v.pressed));else button.removeAttribute('aria-pressed');
    }
  }
  dialog.addEventListener('click',event=>{
    const close=event.target.closest?.('[data-loot-close]');if(close){dialog.close();return;}
    const id=event.target.closest?.('[data-crew-action]')?.dataset.crewAction;
    if(!id||!session.active)return;
    const owned=!!session.state.loot?.operatives?.[id];
    const result=session.change(s=>!owned?recruitOperative(s,id,now()):id==='duty'?toggleDuty(s):claimSupply(s,id,now()));
    if(result?.ok){onSuccess();notify(!owned?(result.amount?'영입 완료! 첫 보급 1개를 아이템에 넣었어요.':result.pendingSupply?'영입 완료! 첫 보급은 보급함에 보관했어요.':'새 대원을 영입했어요.'):result.amount?`보급 ${result.amount}개를 아이템에 넣었어요.`:'당직병 설정을 바꿨어요.');}
    else notify(result?.reason==='limit'?'아이템 보관 한도예요. 사용 후 다시 받아 주세요.':'현재 상태를 확인하고 다시 눌러 주세요.');
    sync();
  });
  dialog.addEventListener('close',()=>{if(!dialog.open)trigger?.focus({preventScroll:true});});
  return {sync,open(){if(!session.active)return;if(!dialog.open)dialog.showModal();sync();}};
}
