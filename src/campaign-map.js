import { campaignBonusPercent, REGION_INCOME_PERCENT } from './campaign-rewards.js';
import { countryBriefMarkup, updateCountryBrief } from './campaign-brief.js';
import { COUNTRIES,CONTINENT,countryProgress,campaignStages } from './campaign.js';
import { countryRegions,polygonPath,clampCamera,countryCamera,campaignHomeCamera } from './campaign-geometry.js';
import { mapDefs,oceanArt,countryLand,nationalLand,settlement } from './campaign-art.js';
import { battleAccess, battleSlots } from './battle.js';
import { reportError } from './diagnostics.js';
import { stageTagsMarkup, quickDeckMarkup } from './quick-deck.js';
import { armyPower } from './units.js';
import { fmt } from './format.js';


export function campaignMarkup(state,countryId=null,selectedId=null,deckIds=null){
  const country=COUNTRIES.find(c=>c.id===countryId),cleared=state.campaignCleared??0;
  const nextCountry=country&&countryProgress(state,country.id).complete?COUNTRIES[country.index+1]:null;
  const previousCountry=country&&country.index>0&&cleared>=country.firstStage-1?COUNTRIES[country.index-1]:null;
  const selected=campaignStages.find(s=>s.id===selectedId&&s.countryId===countryId);
  const access=battleAccess(state);
  const countryButtons=COUNTRIES.map(c=>{
    const p=countryProgress(state,c.id);
    return `<button data-country="${c.id}" class="nation-tab ${countryId===c.id?'active':''}" ${!p.unlocked?'disabled':''} aria-label="${c.name}${p.unlocked?' 지도 열기':' · 이전 국가 점령 필요'}"><span>${p.complete?'✓':p.unlocked?'0'+(c.index+1):'🔒'}</span>${c.name.split(' ')[0]}</button>`;
  }).join('');
  return `<header class="battle-header"><div><small>CONQUEST · ${country?'REGIONAL MAP':'WORLD MAP'}</small><h2 id="battle-title">${country?country.name:CONTINENT.name+' 대륙'}</h2></div><button data-battle-close aria-label="전투 메뉴 닫기">×</button></header>
  <nav class="nation-tabs" aria-label="대륙의 국가">${countryButtons}</nav>
  <div class="atlas-toolbar"><button data-world ${country?'':'hidden'}>‹ 대륙으로</button><span>${country?country.terrain:'남쪽 해안에서 시작하는 대륙 정복'}</span><b>${country?countryProgress(state,country.id).cleared+'/20':Math.floor(cleared/20)+'/4'} 점령 · 수입 +${campaignBonusPercent(state)}%</b></div>
  ${nextCountry?`<button class="atlas-next-country" data-country="${nextCountry.id}" aria-label="${nextCountry.name}으로 바로 이동"><span aria-hidden="true">↑</span> 다음 나라 · ${nextCountry.name}</button>`:''}
  <div class="atlas-window" tabindex="0" aria-label="지도: 손가락으로 끌어 이동, 두 손가락으로 확대·축소, 키보드는 화살표와 +/-"><button class="atlas-locate" data-locate aria-label="현재 위치로 이동">◎</button><svg id="campaign-svg" role="group" aria-label="${country?country.name+'의 20개 지역 지도':CONTINENT.name+' 대륙 지도'}" xmlns="http://www.w3.org/2000/svg">${mapDefs()}${oceanArt()}
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
    <circle class="region-touch" cx="${x}" cy="${y}" r="36"/>${stage.capital?settlement(x,y-15,true):''}<circle class="region-badge" cx="${x}" cy="${y}" r="21"/><text class="region-number" x="${x}" y="${y+7}">${done?'✓':String(r.number).padStart(2,'0')}</text>${done?`<text class="region-stars" x="${x}" y="${y-27}" aria-label="최고 별 ${state.campaignStars?.[r.id-1]??0}개">${'★'.repeat(state.campaignStars?.[r.id-1]??0)}${'☆'.repeat(3-(state.campaignStars?.[r.id-1]??0))}</text>`:''}<text class="region-label" x="${x}" y="${y+44}">${stage.name}</text></g>`;
  }).join(''):''}</svg>
  <div class="atlas-compass" aria-hidden="true">N<span>↑</span></div></div>
  ${previousCountry?`<button class="atlas-previous-country" data-country="${previousCountry.id}" aria-label="${previousCountry.name}으로 바로 내려가기"><span aria-hidden="true">↓</span> 이전 나라 · ${previousCountry.name}</button>`:''}

  ${country?`<section class="region-brief" aria-label="선택한 지역"><div class="brief-head"><div><small>${selected?.capital?'최종 수도전':'REGION '+String(selected?.region??1).padStart(2,'0')}</small><h3>${selected?.name??'지역을 선택하세요'}</h3></div>${selected?`<button class="info-btn" data-battle-info data-info-stage="${selected.id}" aria-label="${selected.name} 상세보기">ⓘ</button>`:''}</div>
    <p class="brief-line">권장 전력 <strong>${fmt(selected?.recommendedPower??0)}</strong> · 내 전력 ${fmt(armyPower(state))}${selected&&selected.id<=cleared?` · 최고 <span class="best-stars">${'★'.repeat(state.campaignStars?.[selected.id-1]??0)}${'☆'.repeat(3-(state.campaignStars?.[selected.id-1]??0))}</span>`:''}</p>
    ${selected&&access.unlocked&&selected.id<=cleared+1?`<div class="prep-tags">${stageTagsMarkup(selected)}</div><div class="brief-deck-head"><span>출전 장비</span><b id="battle-slot-count">${(deckIds??[]).length} / ${battleSlots(state)}</b></div>${quickDeckMarkup(state,selected,deckIds??[])}<p role="status" class="battle-message" id="battle-message"></p>`:''}
    <button class="battle-primary" data-stage="${selected?.id??country.firstStage}" ${!access.unlocked||!selected||selected.id>cleared+1?'disabled':''}>${!access.unlocked?'중령부터 출전':selected?.id<=cleared?'다시 도전':selected?.id===cleared+1?'전투 시작':'이전 지역 점령 필요'}</button>
    ${selected&&selected.id<=cleared+1?`<p class="region-reward">${selected.id<=cleared?'점령 보너스 획득 완료':'최초 점령 보상'} · 초당 수입 +${REGION_INCOME_PERCENT}%</p>`:''}</section>`:
  countryBriefMarkup()}
  <p class="battle-session-note" data-battle-session></p>`;
}

// Camera animation is short-lived. Idle maps have no animation loop or storage writes.
export function createCampaignMap(dialog,getState,getDeck=()=>null){
  let countryId=null,selectedId=null,camera=null,animation=0,dragSuppress=false;
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
  function render(){dialog.innerHTML=campaignMarkup(getState(),countryId,selectedId,selectedId?getDeck(selectedId):null);dialog.classList.add('in-campaign');dialog.classList.remove('in-battle');}
  function show(id=null){
    stop();countryId=id;
    if(id&&!countryProgress(getState(),id).unlocked)countryId=null;
    if(countryId){const c=COUNTRIES.find(c=>c.id===id);selectedId=Math.min(c.lastStage,Math.max(c.firstStage,(getState().campaignCleared??0)+1));}
    render();camera=null;move(countryId?nationalCamera(COUNTRIES.find(c=>c.id===countryId)):homeCamera(),false);
  }
  function handle(target){
    if(dragSuppress){dragSuppress=false;return true;}   // 지도를 끈 직후 따라오는 클릭은 무시
    if(target.hasAttribute('data-country')){
      const id=target.dataset.country;if(!countryProgress(getState(),id).unlocked)return true;
      const c=COUNTRIES.find(c=>c.id===id);countryId=id;selectedId=Math.min(c.lastStage,Math.max(c.firstStage,(getState().campaignCleared??0)+1));render();paint(camera??homeCamera());move(nationalCamera(c));return true;
    }
    if(target.hasAttribute('data-world')){countryId=null;render();paint(camera);move(homeCamera());return true;}
    if(target.hasAttribute('data-region')){stop();selectedId=Number(target.dataset.region);render();paint(camera);dialog.querySelector(`g[data-region="${selectedId}"]`)?.focus({preventScroll:true});return true;}
    if(target.hasAttribute('data-locate')){const p=countryId?countryRegions(countryId).find(r=>r.id===selectedId)?.point:null;move(p?{...camera,x:p[0]-camera.width/2,y:p[1]-camera.height/2}:homeCamera());return true;}
    return false;
  }
  // 지도 조작: 손가락 한 개로 끌어 이동, 두 개로 확대·축소(핀치), 마우스 휠 확대, 키보드 화살표·+/-. 버튼은 '현재 위치' 하나만 둔다.
  const pointers=new Map();let gesture=null;
  const windowBox=()=>dialog.querySelector('.atlas-window')?.getBoundingClientRect();
  function zoomAt(factor,clientX,clientY){
    const box=windowBox();if(!camera||!box)return;
    const fx=(clientX-box.left)/box.width,fy=(clientY-box.top)/box.height,wx=camera.x+fx*camera.width,wy=camera.y+fy*camera.height;
    const width=camera.width*factor,height=camera.height*factor;
    stop();paint({width,height,x:wx-fx*width,y:wy-fy*height});
  }
  dialog.addEventListener('pointerdown',event=>{
    const win=event.target.closest?.('.atlas-window');
    if(!win||!camera||event.target.closest('button'))return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    const list=[...pointers.values()];
    gesture=list.length>=2?{mode:'pinch',dist:Math.hypot(list[0].x-list[1].x,list[0].y-list[1].y),moved:true}:{mode:'pan',moved:false,x:event.clientX,y:event.clientY};
  });
  dialog.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId)||!gesture||!camera)return;
    const previous=pointers.get(event.pointerId),box=windowBox();if(!box)return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(gesture.mode==='pinch'&&pointers.size>=2){
      const [a,b]=[...pointers.values()],dist=Math.hypot(a.x-b.x,a.y-b.y);
      if(gesture.dist>0&&dist>0){zoomAt(gesture.dist/dist,(a.x+b.x)/2,(a.y+b.y)/2);}
      gesture.dist=dist;dragSuppress=true;return;
    }
    if(gesture.mode!=='pan')return;
    if(!gesture.moved){if(Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)<8)return;gesture.moved=true;try{dialog.querySelector('.atlas-window').setPointerCapture(event.pointerId);}catch(error){reportError('map.capture',error);}}
    const scale=camera.width/Math.max(1,box.width);
    stop();paint({...camera,x:camera.x-(event.clientX-previous.x)*scale,y:camera.y-(event.clientY-previous.y)*scale});
    dragSuppress=true;
  });
  const endPointer=event=>{
    if(!pointers.delete(event.pointerId))return;
    if(gesture?.moved){dragSuppress=true;setTimeout(()=>{dragSuppress=false;},60);}
    gesture=pointers.size?{mode:'pan',moved:true,x:0,y:0}:null;
  };
  dialog.addEventListener('pointerup',endPointer);dialog.addEventListener('pointercancel',endPointer);
  dialog.addEventListener('wheel',event=>{
    if(!event.target.closest?.('.atlas-window')||!camera)return;
    event.preventDefault();zoomAt(event.deltaY>0?1.15:1/1.15,event.clientX,event.clientY);
  },{passive:false});
  dialog.addEventListener('keydown',event=>{
    if(!camera||event.target!==dialog.querySelector('.atlas-window'))return;
    const step={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
    if(step){event.preventDefault();move({...camera,x:camera.x+step[0]*camera.width*.3,y:camera.y+step[1]*camera.height*.3});}
    else if(event.key==='+'||event.key==='='||event.key==='-'){event.preventDefault();const box=windowBox();zoomAt(event.key==='-'?1.3:1/1.3,box.left+box.width/2,box.top+box.height/2);}
  });
  return {show,handle,stop,refresh:()=>{render();paint(camera);},get countryId(){return countryId;}};
}
