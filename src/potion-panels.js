import {POTIONS,potionStatus,POTION_COUNT_LIMIT} from './potions.js';
import {potionIcon} from './potion-art.js';
import {fmt} from './format.js';
export function potionTimeLabel(ms) {
  const seconds=Math.ceil(ms/1000),minutes=Math.floor(seconds/60);
  return minutes>=60?`${Math.floor(minutes/60)}시간 ${minutes%60}분`:`${minutes}:${String(seconds%60).padStart(2,'0')}`;
}
export function potionsMarkup() {
  return `<div class="potion-list">${Object.values(POTIONS).map(p=>`<article class="potion-card" data-potion="${p.id}" aria-label="${p.name}">
    <div class="potion-heading"><div class="potion-art">${potionIcon(p.id)}</div><div><h3>${p.name}</h3><strong>${p.effect}</strong><p>${p.durationLabel} 지속</p><b data-potion-count></b></div></div>
    <p class="potion-duration" data-potion-time></p>
    <div class="potion-actions">${p.ad?`<button type="button" data-potion-ad="${p.id}" aria-label="${p.name} 광고보기">광고 보고 1개 받기</button>`:`<span class="potion-note">스타터팩 · 특수공작원 보급</span>`}<button type="button" data-potion-use="${p.id}" aria-label="${p.name} 사용">부스터 사용</button></div>
    <p class="potion-ad-loading" data-potion-loading role="status" aria-live="polite" hidden><span class="potion-ad-spinner" aria-hidden="true"></span><span>광고가 곧 재생되어요!</span></p>
  </article>`).join('')}</div><p class="potion-note">보상 조건 완료 시 선택한 부스터 1개 · Google AdMob 보상형 광고<br>Android 앱에서 이용할 수 있으며 인터넷 연결이 필요합니다.<br>같은 부스터는 시간만 연장됩니다. 서로 다른 효과는 곱해집니다. 맥스 부스터는 광고로 얻을 수 없습니다.<br>게임을 꺼도 시간이 흐릅니다. 터치 부스터는 장군검과 함께 쓰면 4배입니다.</p>`;
}
export function renderPotions(state,root,{busy=false,busyItem=null,active=true,now=Date.now()}={}) {
  const text=(node,value)=>{if(node && node.textContent!==value)node.textContent=value;};
  for(const p of Object.values(POTIONS)){
    const card=root.querySelector(`[data-potion="${p.id}"]`);if(!card)continue;
    const status=potionStatus(state,p.id,now);
    const loading=card.querySelector('[data-potion-loading]'),hidden=!(busy&&busyItem===p.id);
    if(loading && loading.hidden!==hidden)loading.hidden=hidden;
    text(card.querySelector('[data-potion-count]'),`보유 ${fmt(status.count)}개`);
    text(card.querySelector('[data-potion-time]'),status.active?`사용 중 · ${potionTimeLabel(status.remainingMs)} 남음`:'사용 대기');
    const ad=card.querySelector('[data-potion-ad]');if(ad)ad.disabled=busy||!active||status.count>=POTION_COUNT_LIMIT;
    card.querySelector('[data-potion-use]').disabled=busy||!active||!status.canUse;
  }
}
