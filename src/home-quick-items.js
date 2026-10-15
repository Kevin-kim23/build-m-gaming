import {POTIONS,potionStatus} from './potions.js';
import {potionIcon} from './potion-art.js';
import {potionTimeLabel} from './potion-panels.js';
import {HOME_AUTO_TAP,homeAutoTapEnabled} from './home-auto-tap-rules.js';
import {homeAutoTapIcon} from './home-auto-tap-ui.js';

export function homeItemsMarkup() {
  const potions=Object.values(POTIONS).map(p=>`<button type="button" class="home-skill home-item" data-home-item="${p.id}"${p.id==='max'?' hidden':''}>
    <span class="home-item-art" aria-hidden="true">${potionIcon(p.id)}</span><span class="home-item-name">${p.shortName}</span><small data-item-status></small><small data-item-time hidden></small></button>`).join('');
  return potions+`<button type="button" class="home-skill home-item" data-home-item="auto">
    <span class="home-item-art home-auto-art" aria-hidden="true">${homeAutoTapIcon}<b>${HOME_AUTO_TAP.tapsPerSecond}회/초</b></span><span class="home-item-name">AUTO</span><small data-item-status></small></button>`;
}

// Fit the small home controls without hiding digits behind an ellipsis. Exact
// inventory and duration remain in the accessible label and the hover tooltip.
function compactCount(count) {
  for(const [amount,unit] of [[1e12,'조'],[1e8,'억'],[1e4,'만']]) {
    if(count<amount)continue;
    const value=count/amount,rounded=Math.floor(value*(value<100?10:1))/(value<100?10:1);
    return `×${rounded}${unit}`;
  }
  return `×${count}`;
}
function compactTime(ms) {
  const seconds=Math.ceil(ms/1000),hours=Math.floor(seconds/3600);
  if(hours>=100)return `${Math.floor(hours/24)}일+`;
  if(hours)return `${hours}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  return potionTimeLabel(ms);
}

// The same status describes the visible block and its action. No extra clock or save writes.
export function homeItemStatus(state,id,now=Date.now()) {
  if(id==='auto') {
    const owned=!!state.homeAutoTap?.owned,active=homeAutoTapEnabled(state);
    return {active,action:owned?'toggle':'offer',label:active?'ON':owned?'OFF':'+',
      aria:owned?`자동터치 ${active?'끄기':'켜기'} · ${HOME_AUTO_TAP.tapsPerSecond}회/초`:`자동터치 구매 안내 · ${HOME_AUTO_TAP.tapsPerSecond}회/초`};
  }
  const p=potionStatus(state,id,now);
  return {hidden:id==='max'&&!p.count&&!p.active,active:p.active,time:p.active?compactTime(p.remainingMs):'',action:p.count?'use':'offer',
    label:p.count?compactCount(p.count):p.definition.ad?'광고':'팩',
    aria:`${p.definition.name} · ${p.active?'사용 중 '+potionTimeLabel(p.remainingMs)+' 남음 · ':''}보유 ${p.count}개 · ${p.count?'사용':p.definition.ad?'광고 획득 안내':'스타터팩 안내'}`};
}

export function createHomeItemControls(root,{state,writable,use,openOffer,onSuccess=()=>{}}) {
  const buttons=[...root.querySelectorAll('[data-home-item]')];
  for(const button of buttons)button.addEventListener('click',()=>{
    if(!writable())return;
    const id=button.dataset.homeItem,status=homeItemStatus(state(),id);
    if(status.action==='offer')openOffer(id);
    else if(use(id)?.ok)onSuccess();
  });
  return {sync(now=Date.now()){
    for(const button of buttons){
      const status=homeItemStatus(state(),button.dataset.homeItem,now);
      button.hidden=!!status.hidden;
      button.disabled=!writable();button.classList.toggle('skill-active',status.active);
      if(button.getAttribute('aria-label')!==status.aria)button.setAttribute('aria-label',status.aria);
      if(button.getAttribute('title')!==status.aria)button.setAttribute('title',status.aria);
      if(button.dataset.homeItem==='auto')button.setAttribute('aria-pressed',String(status.active));
      const label=button.querySelector('[data-item-status]');
      if(label.textContent!==status.label)label.textContent=status.label;
      const time=button.querySelector('[data-item-time]');
      if(time){time.hidden=!status.time;if(time.textContent!==status.time)time.textContent=status.time;}
    }
  }};
}
