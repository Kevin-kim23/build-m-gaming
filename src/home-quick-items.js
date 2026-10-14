import {POTIONS,potionStatus} from './potions.js';
import {potionIcon} from './potion-art.js';
import {potionTimeLabel} from './potion-panels.js';
import {homeAutoTapEnabled} from './home-auto-tap-rules.js';
import {homeAutoTapIcon} from './home-auto-tap-ui.js';

export function homeItemsMarkup() {
  const potions=Object.values(POTIONS).map(p=>`<button type="button" class="home-skill home-item" data-home-item="${p.id}">
    <span class="home-item-art" aria-hidden="true">${potionIcon(p.id)}</span><span>${p.name}</span><small data-item-status></small><small data-item-time hidden></small></button>`).join('');
  return potions+`<button type="button" class="home-skill home-item" data-home-item="auto">
    <span class="home-item-art" aria-hidden="true">${homeAutoTapIcon}</span><span>자동터치</span><small data-item-status></small></button>`;
}

// The same status describes the visible block and its action. No extra clock or save writes.
export function homeItemStatus(state,id,now=Date.now()) {
  if(id==='auto') {
    const owned=!!state.homeAutoTap?.owned,active=homeAutoTapEnabled(state);
    return {active,action:owned?'toggle':'offer',label:active?'ON':owned?'OFF':'구매 안내',
      aria:owned?`자동터치 ${active?'끄기':'켜기'}`:'자동터치 구매 안내'};
  }
  const p=potionStatus(state,id,now);
  return {active:p.active,time:p.active?potionTimeLabel(p.remainingMs):'',action:p.count?'use':'offer',
    label:p.count?`×${p.count}`:'광고 보기',
    aria:`${p.definition.name} · ${p.active?'사용 중 '+potionTimeLabel(p.remainingMs)+' 남음 · ':''}보유 ${p.count}개 · ${p.count?'사용':'광고 획득 안내'}`};
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
      button.disabled=!writable();button.classList.toggle('skill-active',status.active);
      if(button.getAttribute('aria-label')!==status.aria)button.setAttribute('aria-label',status.aria);
      if(button.dataset.homeItem==='auto')button.setAttribute('aria-pressed',String(status.active));
      const label=button.querySelector('[data-item-status]');
      if(label.textContent!==status.label)label.textContent=status.label;
      const time=button.querySelector('[data-item-time]');
      if(time){time.hidden=!status.time;if(time.textContent!==status.time)time.textContent=status.time;}
    }
  }};
}
