// Standalone presentation only: no session, save storage, recruitment or rewards.
import '../src/style.css';
import '../src/general-promotion.css';
import './promotion-gallery.css';
import { RANKS, RANK_DEFINITIONS } from '../src/ranks.js';
import { insignia } from '../src/home-view.js';
import { promotionProfile, showPromotion, hidePromotion } from '../src/promotion.js';

const groups = [
  {id:'simple',name:'병 계급',summary:'이등병~병장 · 날개 없이 계급장과 진급 문구만 차분하게 나타났다가 사라집니다.'},
  {id:'standard',name:'부사관·준위·위관',summary:'하사~대위 · 기존 금빛 날개와 원형 빛, 작은 입자. 계급에 따라 계급장·크기·입자 수가 커집니다.'},
  {id:'field',name:'영관',summary:'소령~대령 · 겹친 금속 깃털이 펼쳐지고 빛이 날개를 지나갑니다. 소령 9장, 중령 10장, 대령 11장의 깃털과 궤도 효과입니다.'},
  {id:'general',name:'장성·준원수',summary:'준장~준원수 · 녹색 중심 휘장에 입체 금빛 날개·별·양쪽 예포. 별과 장식, 예포 횟수·재생 시간이 계급마다 늘어납니다.'},
  {id:'marshal',name:'원수·사령관',summary:'소원수~부사령관 · 같은 녹색 중심 휘장에 백색 별 1~5개. 금빛 날개·양쪽 예포는 유지하고 장식·예포·시간이 계속 늘어납니다.'},
  {id:'galaxy',name:'은하 장성',summary:'은하 준장~은하 원수 · 자수정색 중심 휘장과 구릿빛 별 1~5개. 날개·별 발광·양쪽 예포를 함께 보여줍니다.'},
  {id:'constellation',name:'은하단 장성',summary:'은하단 준장~은하단 원수 · 검은 흑요석색 중심 휘장과 루비빛 별 1~5개. 가장 많은 예포와 가장 긴 연출입니다.'},
];
function groupFor(rank) {
  const profile=promotionProfile(rank);
  if (profile.style!=='general') return profile.style;
  return profile.generalTier>=16?'constellation':profile.generalTier>=11?'galaxy':profile.generalTier>=6?'marshal':'general';
}
function description(rank) {
  const profile=promotionProfile(rank);
  return `${RANKS[rank]} · ${(profile.duration/1000).toFixed(1)}초${profile.generalTier?` · 양쪽 각 ${profile.salvos}회 예포`:profile.style==='simple'?' · 계급장만 표시':` · 빛 입자 ${profile.sparks}개`}`;
}

const select=document.querySelector('#gallery-rank'), status=document.querySelector('#gallery-status');
select.innerHTML=groups.map(group=>`<optgroup label="${group.name}">${RANKS.map((name,rank)=>groupFor(rank)===group.id?`<option value="${rank}">${name}</option>`:'').join('')}</optgroup>`).join('');
document.querySelector('#gallery-groups').innerHTML=groups.map(group=>`<section class="gallery-group" aria-labelledby="group-${group.id}">
  <div class="gallery-group-heading"><h2 id="group-${group.id}">${group.name}</h2><p>${group.summary}</p></div>
  <div class="gallery-ranks">${RANKS.map((name,rank)=>groupFor(rank)!==group.id?'':`<button type="button" class="gallery-rank" data-preview-rank="${rank}" aria-label="${name} 진급 연출 재생">
    <span class="gallery-rank-badge" aria-hidden="true">${insignia(rank)}</span><strong>${name}</strong>
    <small>${(promotionProfile(rank).duration/1000).toFixed(1)}초${RANK_DEFINITIONS[rank].kind==='general'?` · 예포 ${promotionProfile(rank).salvos}회씩`:rank===0?' · 시작 계급':''}</small>
  </button>`).join('')}</div></section>`).join('');

let playingRank=0, sequence=false, sequenceTimer;
function selectedChanged() {
  document.querySelector('#gallery-selected').textContent=description(Number(select.value));
}
function play(rank, all=false) {
  clearTimeout(sequenceTimer);
  sequence=all;
  playingRank=rank;
  select.value=String(rank);
  selectedChanged();
  status.textContent=`${all?'전체 순서대로 보는 중 · ':''}${description(rank)}`;
  showPromotion(rank,insignia);
  if (all) document.querySelector('.promotion-layer').insertAdjacentHTML('beforeend',
    `<div class="gallery-playing"><span>${rank+1} / ${RANKS.length} · 터치하면 다음 계급</span><button type="button" data-gallery-stop>전체 재생 멈추기</button></div>`);
}
select.addEventListener('change',selectedChanged);
document.querySelector('#gallery-play').addEventListener('click',()=>play(Number(select.value)));
document.querySelector('#gallery-play-all').addEventListener('click',()=>play(0,true));
document.querySelector('#gallery-groups').addEventListener('click',event=>{
  const button=event.target.closest('[data-preview-rank]');
  if (button) play(Number(button.dataset.previewRank));
});
document.querySelector('#gallery-reduced').addEventListener('change',event=>{
  document.body.classList.toggle('gallery-reduced',event.target.checked);
});
document.addEventListener('click',event=>{
  if (event.target.closest('[data-gallery-stop]')) sequence=false;
},true);
document.addEventListener('keydown',event=>{
  if (event.key==='Escape') sequence=false;
},true);
document.addEventListener('keyup',event=>{
  if ((event.key==='Enter'||event.key===' ') && event.target.closest('[data-gallery-stop]')) sequence=false;
},true);
document.addEventListener('close',event=>{
  if (!event.target.matches('.promotion-layer')) return;
  if (!sequence || playingRank===RANKS.length-1) {
    sequence=false;
    status.textContent=`${RANKS[playingRank]} 연출이 끝났어요. 다시 재생하거나 다른 계급을 골라보세요.`;
    return;
  }
  // A small gap lets the closing pointer/keyboard gesture finish before the
  // next actual promotion dialog is shown. No progression or rewards are run.
  sequenceTimer=setTimeout(()=>play(playingRank+1,true),350);
},true);
document.addEventListener('visibilitychange',()=>{
  if (!document.hidden) return;
  sequence=false;
  clearTimeout(sequenceTimer);
  hidePromotion();
});
window.addEventListener('pagehide',()=>{sequence=false;clearTimeout(sequenceTimer);hidePromotion();});
selectedChanged();
