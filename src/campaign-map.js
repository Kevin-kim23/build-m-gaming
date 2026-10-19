import { campaignBonusPercent } from './campaign-rewards.js';
import { COUNTRIES,CONTINENTS,continentForProgress,countryProgress,campaignStages } from './campaign.js';
import { mapDefs,oceanArt,countryLand } from './campaign-art.js';
import { battleAccess } from './battle.js';
import { stageTagsMarkup } from './quick-deck.js';
import { fmt } from './format.js';
import { battleIcon, battleStarsMarkup } from './battle-icons.js';

// Conquest road: each continent's stages climb one step at a time, 1 at the bottom, last at the top,
// over that continent's own map art (no place names). Stage ids, stars, locks and rewards are unchanged.
export const ROAD_STEP = 60, ROAD_PAD = 64;
const ZIGZAG = Object.freeze([50, 64, 70, 64, 50, 36, 30, 36]);
export const roadHeight = count => ROAD_STEP * (count - 1) + ROAD_PAD * 2;
export const roadPoint = (index, count) => ({x: ZIGZAG[index % ZIGZAG.length], y: roadHeight(count) - ROAD_PAD - index * ROAD_STEP});
const continentOf = (countryId, continentId, cleared) => {
  const country = COUNTRIES.find(c => c.id === countryId);
  return CONTINENTS.find(c => c.id === (country?.continentId ?? continentId)) ?? continentForProgress(cleared);
};
export const continentStages = continent => campaignStages.filter(s => s.continentId === continent.id);
// The stage a continent or country opens on: the next one to play, kept inside that range.
export function focusStage(cleared, first, last) { return Math.min(last, Math.max(first, cleared + 1)); }
// The continent map is drawn once as a symbol and tiled upright up the road at its natural width,
// instead of one map blown up to the road's full height.
const backdropCache = new Map();
function backdrop(continent, height) {
  if (!backdropCache.has(continent.id)) {
    const lands = COUNTRIES.filter(c => c.continentId === continent.id).map(countryLand).join('');
    backdropCache.set(continent.id, `${mapDefs(continent.id)}${oceanArt(continent.theme)}${lands}`);
  }
  const box = `0 0 ${continent.width} ${continent.height}`, id = `road-map-${continent.id}`;
  const tiles = Math.ceil(height / (280 * continent.height / continent.width)) + 1;
  return `<div class="road-backdrop" aria-hidden="true"><svg class="road-symbol" width="0" height="0"><symbol id="${id}" viewBox="${box}">${backdropCache.get(continent.id)}</symbol></svg>${
    Array.from({length: tiles}, (_, i) => `<svg class="road-tile" viewBox="${box}" preserveAspectRatio="xMidYMid slice"><use href="#${id}"/></svg>`).join('')}</div>`;
}
function roadNode(state, stage, index, count, selectedId) {
  const cleared = state.campaignCleared ?? 0, done = stage.id <= cleared, next = stage.id === cleared + 1;
  const {x, y} = roadPoint(index, count), status = done ? 'occupied' : next ? 'frontier' : 'locked';
  const label = `${stage.name} · ${done ? '점령 완료' : next ? '진격 가능' : '미점령'}${stage.capital ? ' · 수도' : ''} · 권장 전력 ${fmt(stage.recommendedPower)}`;
  return `<button type="button" class="road-stop ${status}${stage.capital ? ' capital' : ''}${stage.id === selectedId ? ' selected' : ''}" data-region="${stage.id}" style="left:${x}%;top:${y}px" aria-pressed="${stage.id === selectedId}" aria-label="${label}">
    ${stage.capital ? '<span class="road-flag" aria-hidden="true"></span>' : ''}<b>${done || next ? stage.continentStage : battleIcon('lock')}</b>${done ? `<span class="road-stars">${battleStarsMarkup(state.campaignStars?.[stage.id - 1] ?? 0)}</span>` : next ? '<span class="road-now">지금 도전</span>' : ''}</button>`;
}
// The road only picks a stage; 출격 opens the separate loadout screen (loadout-view.js).
export function campaignMarkup(state,countryId=null,selectedId=null,continentId=null){
  const cleared=state.campaignCleared??0, continent=continentOf(countryId,continentId,cleared), space=continent.theme!=='earth';
  const stages=continentStages(continent), count=stages.length;
  const selected=stages.find(s=>s.id===selectedId)??stages.find(s=>s.id===focusStage(cleared,continent.firstStage,continent.lastStage));
  const continentCleared=Math.max(0,Math.min(count,cleared-continent.firstStage+1)), access=battleAccess(state);
  const continentButtons=CONTINENTS.map(c=>`<button data-continent="${c.id}" class="continent-tab ${c.id===continent.id?'active':''}" ${cleared<c.firstStage-1?'disabled':''} aria-label="${c.name} 대륙${cleared<c.firstStage-1?' · 이전 대륙 전체 점령 후 해금':' 진격 로드 열기'}">${battleIcon(c.theme!=='earth'?'orbit':'world')}${c.name}</button>`).join('');
  const path=stages.map((_,i)=>{const p=roadPoint(i,count);return `${p.x},${p.y}`;});
  const reached=Math.max(1,Math.min(count,continentCleared+1));
  return `<header class="battle-header"><div><small>${space?'DEEP SPACE':'CONQUEST'} · 진격 로드</small><h2 id="battle-title">${continent.name} 대륙</h2></div><button data-battle-close aria-label="전투 메뉴 닫기">×</button></header><p class="battle-session-note" role="status" data-battle-session></p>
  <nav class="continent-tabs" aria-label="원정 대륙">${continentButtons}</nav>
  <div class="road-progress"><span class="road-bar" aria-hidden="true"><i style="width:${continentCleared/count*100}%"></i></span><b>${continentCleared} / ${count} 점령 · 수입 +${campaignBonusPercent(state)}%</b></div>
  <div class="road-frame" data-map-theme="${continent.theme}"><div class="road-window" tabindex="0" aria-label="${continent.name} 진격 로드: 위로 스크롤하면 다음 스테이지">
    <div class="road-canvas" style="height:${roadHeight(count)}px">
      ${backdrop(continent, roadHeight(count))}
      <svg class="road-path" viewBox="0 0 100 ${roadHeight(count)}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${path.join(' ')}"/><polyline class="reached" points="${path.slice(0,reached).join(' ')}"/></svg>
      ${stages.map((s,i)=>roadNode(state,s,i,count,selected?.id)).join('')}
    </div></div><button type="button" class="road-locate" data-locate aria-label="현재 위치로 이동">${battleIcon('locate')}</button></div>
  <section class="region-brief" aria-label="선택한 스테이지"><div class="brief-head"><div><small>${selected?.capital?'최종 수도전':'STAGE '+String(selected?.continentStage??1).padStart(2,'0')}</small><h3>${selected?.name??'스테이지를 선택하세요'}</h3></div>${selected?`<button class="info-btn" data-battle-info data-info-stage="${selected.id}" aria-label="${selected.name} 상세보기">${battleIcon('info')}</button>`:''}</div>
    ${selected&&access.unlocked&&selected.id<=cleared+1?`<div class="prep-tags">${stageTagsMarkup(selected)}</div>`:''}
    <button class="battle-primary" data-stage="${selected?.id??continent.firstStage}" ${!access.unlocked||!selected||selected.id>cleared+1?'disabled':''}>${!access.unlocked?access.requirement:selected?.id<=cleared?'다시 출격':selected?.id===cleared+1?'출격':'이전 스테이지 점령 필요'}</button>
</section>`;
}

// No animation loop and no storage writes: the road only re-renders after a tap.
export function createCampaignMap(dialog,getState){
  let countryId=null,selectedId=null,continentId=null;
  const road=()=>dialog.querySelector('.road-window');
  function centerOn(id){
    const box=road(),node=box?.querySelector(`[data-region="${id}"]`);
    if(box&&node)box.scrollTop=node.offsetTop-box.clientHeight/2;
  }
  function render(center=false){
    const keep=road()?.scrollTop;
    dialog.innerHTML=campaignMarkup(getState(),countryId,selectedId,continentId);
    dialog.classList.add('in-campaign');dialog.classList.toggle('space-campaign',continentId!=='astera');dialog.classList.remove('in-battle');
    if(center||keep===undefined)centerOn(selectedId);else road().scrollTop=keep;
  }
  function openContinent(id){
    const c=CONTINENTS.find(c=>c.id===id),cleared=getState().campaignCleared??0;
    continentId=c.id;selectedId=focusStage(cleared,c.firstStage,c.lastStage);countryId=campaignStages[selectedId-1].countryId;
  }
  // countryId keeps the old contract: after a battle the road reopens on that country's next stage.
  // stageId (optional) reopens on that exact stage, e.g. when leaving the loadout screen with ←.
  function show(id=null,stageId=null){
    const cleared=getState().campaignCleared??0,country=COUNTRIES.find(c=>c.id===id),stage=campaignStages[stageId-1];
    if(stage&&stage.id<=cleared+1){selectedId=stage.id;countryId=stage.countryId;continentId=stage.continentId;}
    else if(country&&countryProgress(getState(),id).unlocked){countryId=id;continentId=country.continentId;selectedId=focusStage(cleared,country.firstStage,country.lastStage);}
    else openContinent(continentId??continentForProgress(cleared).id);
    render(true);
  }
  function handle(target){
    if(target.hasAttribute('data-continent')){
      const c=CONTINENTS.find(c=>c.id===target.dataset.continent);if(!c||(getState().campaignCleared??0)<c.firstStage-1)return true;
      openContinent(c.id);render(true);return true;
    }
    if(target.hasAttribute('data-region')){
      const stage=campaignStages[Number(target.dataset.region)-1];if(!stage)return true;
      selectedId=stage.id;countryId=stage.countryId;render();
      dialog.querySelector(`[data-region="${selectedId}"]`)?.focus({preventScroll:true});return true;
    }
    if(target.hasAttribute('data-locate')){
      const c=CONTINENTS.find(c=>c.id===continentId),cleared=getState().campaignCleared??0;
      if(c){selectedId=focusStage(cleared,c.firstStage,c.lastStage);countryId=campaignStages[selectedId-1].countryId;render(true);}
      return true;
    }
    return false;
  }
  return {show,handle,stop(){},refresh:()=>render(),get countryId(){return countryId;}};
}
