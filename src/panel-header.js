import {fmt,fmtGold} from './format.js';
import {LAST_RANK,RANKS,rankForArmy,promotionProgress} from './ranks.js';
import {promotionTone} from './home-view.js';

function progressView(state) {
  const rank=rankForArmy(state),progress=promotionProgress(state);
  const percent=progress.ratio>=1?100:Math.floor(progress.ratio*100);
  return {
    rank:rank===LAST_RANK?`${RANKS[rank]} 진급 완료`:`${RANKS[rank+1]} 진급까지`,
    remaining:progress.remaining?`전력 ${fmt(progress.remaining)} 남음`:progress.text,
    percent,width:`${Number((progress.ratio*100).toFixed(4))}%`,tone:promotionTone(percent),
  };
}

function recruitProgressMarkup(state) {
  const view=progressView(state);
  return `<section class="recruit-promotion" data-recruit-promotion aria-label="진급 진행">
    <div class="recruit-promotion-line"><span data-recruit-rank>${view.rank}</span><strong data-recruit-remaining>${view.remaining}</strong></div>
    <div class="recruit-promotion-track" role="progressbar" aria-label="다음 계급 필요 전력 달성률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${view.percent}"><i data-recruit-fill data-tone="${view.tone}" style="width:${view.width}"></i><span data-recruit-percent>${view.percent}%</span></div>
  </section>`;
}

// One sticky unit keeps the balance visible without changing the dialog's
// scroll container (purchases, guides and focus restoration depend on it).
export function panelHeaderMarkup(state,{title,subtitle,closeId,walletId,coin='',recruit=false}) {
  return `<header class="panel-sticky-head">
    <div class="shop-header"><div><small>${subtitle}</small><h2 id="modal-title">${title}</h2></div><button id="${closeId}" aria-label="${title} 닫기">×</button></div>
    ${recruit?recruitProgressMarkup(state):''}
    ${walletId?`<div class="shop-wallet"><span>보유 골드</span><strong>${coin}<b id="${walletId}">${fmtGold(state.gold)}</b><small>G</small></strong></div>`:''}
  </header>`;
}

export function renderRecruitPromotion(state,root) {
  const panel=root.querySelector('[data-recruit-promotion]');
  if(!panel)return;
  const view=progressView(state);
  for(const [selector,value] of [['[data-recruit-rank]',view.rank],['[data-recruit-remaining]',view.remaining],['[data-recruit-percent]',`${view.percent}%`]]) {
    const node=panel.querySelector(selector);
    if(node.textContent!==value)node.textContent=value;
  }
  const track=panel.querySelector('[role="progressbar"]'),fill=panel.querySelector('[data-recruit-fill]');
  if(track.getAttribute('aria-valuenow')!==String(view.percent))track.setAttribute('aria-valuenow',String(view.percent));
  if(fill.style.width!==view.width)fill.style.width=view.width;
  if(fill.dataset.tone!==view.tone)fill.dataset.tone=view.tone;
}
