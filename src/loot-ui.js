import { OPERATIVES, SUPPLY_CAP, supplyStatus, recruitOperative, claimSupply, toggleDuty } from './loot.js';
import { fmt } from './format.js';
import { operativeIcon, lootIcon } from './operative-art.js';

export function supplyTime(ms) {
  const minutes=Math.max(1,Math.ceil(ms/60000)),h=Math.floor(minutes/60),m=minutes%60;
  return h?`${h}시간${m?` ${m}분`:''}`:`${m}분`;
}
export function lootShopMarkup() {
  return `<dialog id="loot-shop" aria-labelledby="loot-title">
    <header class="loot-head"><div><small>전투로 얻는 특별한 동료</small><h2 id="loot-title">전리품 상점</h2></div><button type="button" data-loot-close aria-label="전리품 상점 닫기">×</button></header>
    <div class="loot-wallet">${lootIcon()}<span>보유 전리품</span><strong data-loot-balance>0</strong></div>
    <div class="loot-scroll"><p class="loot-intro">전투에서 전리품을 모아 원하는 대원을 영입하세요.<br>종류별 1명 · 영구 보유 · 골드나 현금은 사용하지 않아요.</p>
    ${OPERATIVES.map(o=>`<article class="operative-card" data-operative="${o.id}" style="--operative-color:${o.color}">
      <div class="operative-portrait">${operativeIcon(o.id)}</div><div class="operative-info"><h3>${o.name}<small data-crew-owned hidden>보유</small></h3><p>${o.effect}</p>
      <details><summary>${o.name} 상세보기</summary><p>${o.detail}${o.period?` 영입한 시각부터 주기적으로 생성되고, 종료 중에도 시간이 흐르며 최대 ${SUPPLY_CAP}회분을 보관해요. 받으면 아이템에 추가돼요.`:''}</p></details></div>
      <div class="operative-actions"><small data-crew-status></small><button type="button" data-crew-action="${o.id}">전리품 ${fmt(o.price)} · 영입</button></div></article>`).join('')}
      <p class="loot-notice">첫 승리·수도에서 더 많은 전리품을 얻어요. 재전투 보상은 한국시간 하루 합산 10회예요. 골드와 전리품은 서로 교환하지 않아요.</p>
    </div><footer class="loot-footer"><span>보급은 대원의 ‘받기’를 눌러 수령하세요.</span><button type="button" data-loot-close>홈으로</button></footer></dialog>`;
}
export function createLootShop(session,{root=document,now=Date.now,onSuccess=()=>{},notify=()=>{}}={}) {
  root.body.insertAdjacentHTML('beforeend',lootShopMarkup());
  const dialog=root.querySelector('#loot-shop'),trigger=root.querySelector('#open-loot');
  const cards=OPERATIVES.map(o=>{const node=dialog.querySelector(`[data-operative="${o.id}"]`);return {o,node,button:node.querySelector('[data-crew-action]'),status:node.querySelector('[data-crew-status]'),owned:node.querySelector('[data-crew-owned]')};});
  const text=(node,value)=>{if(node.textContent!==value)node.textContent=value;};
  function sync() {
    const state=session.state,balance=state.loot?.balance??0;
    const ready=OPERATIVES.reduce((n,o)=>n+supplyStatus(state,o.id,now()).ready,0);
    const label=trigger?.querySelector('[data-home-loot]');
    if(label)text(label,ready?`${fmt(balance)} · 보급 ${ready}개`:`${fmt(balance)} 보유`);
    if(trigger){trigger.disabled=!session.active;trigger.classList.toggle('supplies-ready',ready>0);}
    if(!dialog.open)return;
    text(dialog.querySelector('[data-loot-balance]'),fmt(balance));
    for(const {o,button,status,owned} of cards){
      const p=state.loot?.operatives?.[o.id],s=supplyStatus(state,o.id,now());
      owned.hidden=!p;
      if(!p){text(status,balance<o.price?`전리품 ${fmt(o.price-balance)} 더 필요`:'지금 영입할 수 있어요');text(button,`전리품 ${fmt(o.price)} · 영입`);button.disabled=!session.active||balance<o.price;}
      else if(o.period){text(status,s.ready===SUPPLY_CAP?'보급함 가득 · 먼저 받아 주세요':`보관 ${s.ready}/${SUPPLY_CAP} · 다음 ${supplyTime(s.remainingMs)}`);text(button,s.ready?`보급 ${s.ready}개 받기`:'보급 준비 중');button.disabled=!session.active||!s.ready;}
      else if(o.id==='duty'){text(status,'유료 자동터치와 별도로 +1회/초');text(button,p.enabled?'당직병 켜짐 · 끄기':'당직병 꺼짐 · 켜기');button.disabled=!session.active;button.setAttribute('aria-pressed',String(p.enabled));}
      else {text(status,'오프라인 수입 보관 시간 확장 중');text(button,'12시간 적용 중');button.disabled=true;}
    }
  }
  dialog.addEventListener('click',event=>{
    const close=event.target.closest?.('[data-loot-close]');if(close){dialog.close();return;}
    const id=event.target.closest?.('[data-crew-action]')?.dataset.crewAction;
    if(!id||!session.active)return;
    const owned=!!session.state.loot?.operatives?.[id];
    const result=session.change(s=>!owned?recruitOperative(s,id,now()):id==='duty'?toggleDuty(s):claimSupply(s,id,now()));
    if(result?.ok){onSuccess();notify(result.amount?`보급 ${result.amount}개를 아이템에 넣었어요.`:!owned?'새 대원을 영입했어요.':'당직병 설정을 바꿨어요.');}
    else notify(result?.reason==='limit'?'아이템 보관 한도예요. 사용 후 다시 받아 주세요.':'현재 상태를 확인하고 다시 눌러 주세요.');
    sync();
  });
  dialog.addEventListener('close',()=>{if(!dialog.open)trigger?.focus({preventScroll:true});});
  return {sync,open(){if(!session.active)return;if(!dialog.open)dialog.showModal();sync();}};
}
