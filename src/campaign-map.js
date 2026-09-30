import { campaignBonusPercent, REGION_INCOME_PERCENT } from './campaign-rewards.js';
import { countryBriefMarkup, updateCountryBrief } from './campaign-brief.js';
import { COUNTRIES,CONTINENT,countryProgress,campaignStages } from './campaign.js';
import { countryRegions,polygonPath,clampCamera,countryCamera,campaignHomeCamera } from './campaign-geometry.js';
import { mapDefs,oceanArt,countryLand,nationalLand,settlement } from './campaign-art.js';
import { battleAccess } from './battle.js';
import { armyPower } from './units.js';
import { fmt } from './format.js';


export function campaignMarkup(state,countryId=null,selectedId=null){
  const country=COUNTRIES.find(c=>c.id===countryId),cleared=state.campaignCleared??0;
  const selected=campaignStages.find(s=>s.id===selectedId&&s.countryId===countryId);
  const access=battleAccess(state);
  const countryButtons=COUNTRIES.map(c=>{
    const p=countryProgress(state,c.id);
    return `<button data-country="${c.id}" class="nation-tab ${countryId===c.id?'active':''}" ${!p.unlocked?'disabled':''} aria-label="${c.name}${p.unlocked?' 지도 열기':' · 이전 국가 점령 필요'}"><span>${p.complete?'✓':p.unlocked?'0'+(c.index+1):'🔒'}</span>${c.name.split(' ')[0]}</button>`;
  }).join('');
  return `<header class="battle-header"><div><small>CONQUEST · ${country?'REGIONAL MAP':'WORLD MAP'}</small><h2 id="battle-title">${country?country.name:CONTINENT.name+' 대륙'}</h2></div><button data-battle-close aria-label="전투 메뉴 닫기">×</button></header>
  <nav class="nation-tabs" aria-label="대륙의 국가">${countryButtons}</nav>
  <div class="atlas-toolbar"><button data-world ${country?'':'hidden'}>‹ 대륙으로</button><span>${country?country.terrain:'남쪽 해안에서 시작하는 대륙 정복'}</span><b>${country?countryProgress(state,country.id).cleared+'/20':Math.floor(cleared/20)+'/4'} 점령 · 수입 +${campaignBonusPercent(state)}%</b></div>
  <div class="atlas-window"><svg id="campaign-svg" role="group" aria-label="${country?country.name+'의 20개 지역 지도':CONTINENT.name+' 대륙 지도'}" xmlns="http://www.w3.org/2000/svg">${mapDefs()}${oceanArt()}
  ${COUNTRIES.map(c=>{
    const p=countryProgress(state,c.id),dim=country?c.id!==country.id:!p.unlocked;
    return `<g class="country-terrain ${dim?'dimmed':''}">${countryLand(c)}${dim?`<path d="${polygonPath(c.polygon)}" fill="#0b202bbb"/>`:''}</g>`;
  }).join('')}
  ${country?nationalLand(country,cleared,selected?.id):COUNTRIES.map(c=>{
    const p=countryProgress(state,c.id),[x,y]=c.label;
    return `<g data-country="${c.id}" class="country-hit ${p.unlocked?'available':'locked'}" role="button" tabindex="${p.unlocked?0:-1}" aria-disabled="${!p.unlocked}" aria-label="${c.name}${p.unlocked?' 지도 열기':' 잠금'}"><path d="${polygonPath(c.polygon)}" class="country-outline"/>${settlement(x,y-70,true)}<text class="country-label" x="${x}" y="${y}">${c.name}</text></g>`;
  }).join('')}
  ${country?countryRegions(country.id).map(r=>{
    const stage=campaignStages[r.id-1],done=r.id<=cleared,next=r.id===cleared+1,[x,y]=r.point;
    return `<g class="region-hit ${done?'occupied':next?'frontier':'locked'} ${r.id===selected?.id?'selected':''}" data-region="${r.id}" role="button" tabindex="0" aria-label="${String(r.number).padStart(2,'0')} ${stage.name} · ${done?'점령 완료':next?'진격 가능':'미점령'} · 권장 전력 ${fmt(stage.recommendedPower)}">
    <circle class="region-touch" cx="${x}" cy="${y}" r="36"/>${stage.capital?settlement(x,y-15,true):''}<circle class="region-badge" cx="${x}" cy="${y}" r="21"/><text class="region-number" x="${x}" y="${y+7}">${done?'✓':String(r.number).padStart(2,'0')}</text><text class="region-label" x="${x}" y="${y+44}">${stage.name}</text></g>`;
  }).join(''):''}</svg>
  <div class="atlas-compass" aria-hidden="true">N<span>↑</span></div></div>
  <div class="atlas-controls" aria-label="지도 조작">
    <div class="atlas-pan" role="group" aria-label="지도 이동"><button data-pan="left" aria-label="지도 서쪽으로 이동">←</button><button data-pan="up" aria-label="지도 북쪽으로 이동">↑</button><button data-locate aria-label="현재 진격 지역으로 이동">◎</button><button data-pan="down" aria-label="지도 남쪽으로 이동">↓</button><button data-pan="right" aria-label="지도 동쪽으로 이동">→</button></div>
    <div class="atlas-zoom"><button data-zoom="in" aria-label="지도 확대">＋</button><button data-zoom="out" aria-label="지도 축소">−</button></div>
  </div><div class="atlas-coordinate" aria-live="polite" id="map-position"></div>
  ${country?`<section class="region-brief" aria-label="선택한 지역"><div><small>${selected?.capital?'최종 수도전':'REGION '+String(selected?.region??1).padStart(2,'0')}</small><h3>${selected?.name??'지역을 선택하세요'}</h3><p>권장 전력 <strong>${fmt(selected?.recommendedPower??0)}</strong> · 내 전력 ${fmt(armyPower(state))}</p></div><button class="battle-primary" data-stage="${selected?.id??country.firstStage}" ${!access.unlocked||!selected||selected.id>cleared+1?'disabled':''}>${!access.unlocked?'중령부터 출전':selected?.id<=cleared?'다시 도전':selected?.id===cleared+1?'진격 준비 →':'이전 지역 점령 필요'}</button><p class="region-reward">${selected?.id<=cleared?"점령 보너스 획득 완료":"최초 점령 보상"} · 초당 수입 +${REGION_INCOME_PERCENT}%</p><p class="region-strategy">${selected?.capital?(selected.id===80?'마지막 수도 점령으로 대륙 정복이 완료됩니다. ':'수도를 점령하면 다음 국가가 열립니다. '):''}병종별 10명 · 장비 자동 공격 · 병력 소모 없음</p></section>`:
  countryBriefMarkup()}
  <p class="battle-session-note" data-battle-session></p>`;
}

// Camera animation is short-lived. Idle maps have no animation loop or storage writes.
export function createCampaignMap(dialog,getState){
  let countryId=null,selectedId=null,camera=null,animation=0;
  const aspect=()=>{const r=dialog.querySelector('.atlas-window').getBoundingClientRect();return r.width/Math.max(1,r.height);};
  function stop(){cancelAnimationFrame(animation);animation=0;}
  function paint(next){
    camera=clampCamera(next);
    dialog.querySelector('#campaign-svg')?.setAttribute('viewBox',`${camera.x} ${camera.y} ${camera.width} ${camera.height}`);
    const position=dialog.querySelector('#map-position'),label=(camera.y+camera.height/2<800?'북부':camera.y+camera.height/2<1650?'중부':'남부')+' · 화살표로 이동';if(position&&position.textContent!==label)position.textContent=label;
    if(!countryId){
      const center=camera.y+camera.height/2;
      const focus=COUNTRIES.reduce((nearest,c)=>Math.abs(c.label[1]-center)<Math.abs(nearest.label[1]-center)?c:nearest);
      updateCountryBrief(dialog,getState(),focus);
      const scale=camera.width/Math.max(1,dialog.querySelector('.atlas-window').clientWidth);
      dialog.querySelector('#campaign-svg').style.setProperty('--country-label-size',Math.max(37,scale*17)+'px');
    }
    const limits={up:camera.y<=-99,down:camera.y+camera.height>=2579,left:camera.x<=-319,right:camera.x+camera.width>=1319};
    dialog.querySelectorAll('[data-pan]').forEach(b=>{b.disabled=limits[b.dataset.pan];});
  }
  function move(target,animate=true){
    stop();target=clampCamera(target);
    if(!camera||!animate||matchMedia('(prefers-reduced-motion: reduce)').matches){paint(target);return;}
    const start={...camera},began=performance.now();
    function frame(now){const t=Math.min(1,(now-began)/420),ease=1-(1-t)**3;paint(Object.fromEntries(Object.keys(target).map(k=>[k,start[k]+(target[k]-start[k])*ease])));if(t<1)animation=requestAnimationFrame(frame);else animation=0;}
    animation=requestAnimationFrame(frame);
  }
  function homeCamera(){
    return campaignHomeCamera(getState().campaignCleared??0,aspect());
  }
  function nationalCamera(country){
    const full=countryCamera(country,aspect());
    const width=Math.min(720,full.width),height=width/aspect();
    const point=countryRegions(country.id).find(r=>r.id===selectedId)?.point??country.label;
    return clampCamera({width,height,x:full.x+(full.width-width)/2,y:point[1]-height*.65});
  }
  function render(){dialog.innerHTML=campaignMarkup(getState(),countryId,selectedId);dialog.classList.add('in-campaign');dialog.classList.remove('in-battle');}
  function show(id=null){
    stop();countryId=id;
    if(id&&!countryProgress(getState(),id).unlocked)countryId=null;
    if(countryId){const c=COUNTRIES.find(c=>c.id===id);selectedId=Math.min(c.lastStage,Math.max(c.firstStage,(getState().campaignCleared??0)+1));}
    render();camera=null;move(countryId?nationalCamera(COUNTRIES.find(c=>c.id===countryId)):homeCamera(),false);
  }
  function handle(target){
    if(target.hasAttribute('data-country')){
      const id=target.dataset.country;if(!countryProgress(getState(),id).unlocked)return true;
      const c=COUNTRIES.find(c=>c.id===id);countryId=id;selectedId=Math.min(c.lastStage,Math.max(c.firstStage,(getState().campaignCleared??0)+1));render();paint(camera??homeCamera());move(nationalCamera(c));return true;
    }
    if(target.hasAttribute('data-world')){countryId=null;render();paint(camera);move(homeCamera());return true;}
    if(target.hasAttribute('data-region')){stop();selectedId=Number(target.dataset.region);render();paint(camera);dialog.querySelector(`g[data-region="${selectedId}"]`)?.focus({preventScroll:true});return true;}
    if(target.hasAttribute('data-pan')){
      const d=target.dataset.pan,stepX=camera.width*.35,stepY=camera.height*.4;
      move({...camera,x:camera.x+(d==='right'?stepX:d==='left'?-stepX:0),y:camera.y+(d==='down'?stepY:d==='up'?-stepY:0)});return true;
    }
    if(target.hasAttribute('data-zoom')){const factor=target.dataset.zoom==='in'?1/1.35:1.35;move({...camera,width:camera.width*factor,height:camera.height*factor,x:camera.x+camera.width*(1-factor)/2,y:camera.y+camera.height*(1-factor)/2});return true;}
    if(target.hasAttribute('data-locate')){const p=countryId?countryRegions(countryId).find(r=>r.id===selectedId)?.point:null;move(p?{...camera,x:p[0]-camera.width/2,y:p[1]-camera.height/2}:homeCamera());return true;}
    return false;
  }
  return {show,handle,stop,refresh:()=>{render();paint(camera);},get countryId(){return countryId;}};
}
