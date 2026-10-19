// Disposable design state only. No session, persistence, rewards, network or billing.
import {battleIcon, battleStarsMarkup} from '../src/battle-icons.js';
import {drawEquipment} from '../src/equipment-art.js';
import {EQUIPMENT} from '../src/equipment.js';
import {BATTLE_RULES, UNIT_TRAITS, equipmentCombatStats} from '../src/battle-balance.js';
import {stageLoot} from '../src/loot.js';
import {lootIcon} from '../src/operative-art.js';
import {campaignStages} from '../src/campaign.js';

const stageOptions=[
  {id:'A',title:'진격 경로 지도',tag:'추천',copy:'지도 감성은 유지. 경로를 한 줄로 단순화하고, 현재 도전과 보상을 아래에 고정합니다.'},
  {id:'B',title:'작전 목록',tag:'가장 빠른 선택',copy:'권장 계급·보상·완료 여부를 한 줄에서 비교합니다. 반복 전투를 고르기 가장 쉽습니다.'},
  {id:'C',title:'20개씩 한눈에',tag:'많은 스테이지 탐색',copy:'20개 단위로 넘기는 격자판. 원하는 번호를 바로 누르며, 수도는 별도 표식으로 구분합니다.'},
];
const deckOptions=[
  {id:'A',title:'카드 덱 편성',tag:'추천',copy:'위에는 선택한 6칸, 아래에는 보유 카드. 카드를 누르면 추가·해제되어 조작이 단순합니다.'},
  {id:'B',title:'큰 카드 집중형',tag:'그림과 능력 중심',copy:'장비를 하나씩 크게 보고 편성합니다. 그림과 수치가 잘 보이지만 여러 종류 비교는 느립니다.'},
  {id:'C',title:'능력 비교 목록',tag:'실용적인 비교',copy:'그림·강화·공격력·마나를 한 줄에 정렬합니다. 장비가 많을수록 찾기 쉽습니다.'},
];
const ids=['artillery','tank','selfPropelled','helicopter','rocketLauncher','transport','fighter','railgunTank'];
const starters=ids.slice(0,4);
const cards=new Map(ids.map(id=>[id,{id,name:EQUIPMENT[id].name,level:8,trait:UNIT_TRAITS[id],stats:equipmentCombatStats(id,8)}]));
const selections=new Map(deckOptions.map(o=>[o.id,new Set(starters)]));
const picks=new Map(stageOptions.map(o=>[o.id,24]));
const focused=new Map(deckOptions.map(o=>[o.id,'tank']));
const artwork=(id,large=false)=>`<canvas data-gear-art="${id}" width="${large?440:220}" height="${large?248:124}" aria-hidden="true"></canvas>`;
const mana=id=>`<span class="mana-cost" aria-label="마나 ${cards.get(id).trait.cost}">${battleIcon('mana')}${cards.get(id).trait.cost}</span>`;
const reward=id=>`<span class="reward">${lootIcon()}<b>${stageLoot(id,id>23)}</b><small>${id>23?'첫 승리':'재도전'}</small></span>`;
const stageStatus=id=>id<24?'완료':id===24?'현재 도전':'잠금';
const phoneHead=(title,sub)=>`<header class="phone-head"><div><small>${sub}</small><h3>${title}</h3></div><span class="heading-symbol" aria-hidden="true">${battleIcon(title==='출전 장비'?'check':'world')}</span></header>`;
const continents=()=>'<div class="continent-switch" aria-label="대륙 예시"><b>아스테라</b><span>에테리온 · 잠금</span><span>에레보스 · 잠금</span></div>';
const stagePick=(id,cls='',selected=24)=>`<button class="stage-pick ${cls} ${id<24?'done':id===24?'current':'locked'}" data-stage-pick="${id}" ${id>24?'disabled':''} aria-label="아스테라 스테이지 ${id} · ${stageStatus(id)}" aria-pressed="${id===selected}"><span>${id}</span>${id<24?battleIcon('check'):id>24?battleIcon('lock'):''}</button>`;
function stageBody(type){
  if(type==='A')return `<div class="journey"><div class="map-caption">아스테라 <strong>23 / 80</strong><small>다음 전장까지 한 걸음</small></div><svg class="journey-path" viewBox="0 0 350 370" preserveAspectRatio="none" aria-hidden="true"><path d="M170 390C170 350 65 350 70 290S275 270 270 205S75 180 80 125S250 75 245 20" fill="none" stroke="#668a72" stroke-width="7" stroke-linecap="round" stroke-dasharray="3 13"/></svg>${[21,22,23,24,25,26].map((id,i)=>`<div class="journey-stop stop-${i}">${stagePick(id)}<small>${id===24?'현재 도전':id<24?'점령 완료':'다음 전장'}</small></div>`).join('')}<span class="map-hills" aria-hidden="true"></span><button class="locate-now" data-locate>현재 도전 ${battleIcon('locate')}</button></div>`;
  if(type==='B')return `<div class="mission-hero"><small>다음 목표</small><strong>아스테라<br>스테이지 24</strong><span>80개의 전장을 차근차근 정복하세요</span><i><b></b></i><small>진행 23 / 80</small></div><div class="list-caption">주변 스테이지 <span>보상</span></div><div class="mission-list">${[21,22,23,24,25].map(id=>`<button data-stage-pick="${id}" class="mission-row ${id===24?'selected':''}" aria-pressed="${id===24}" ${id>24?'disabled':''}><span class="stage-number">${String(id).padStart(2,'0')}</span><span><b>스테이지 ${id}</b><small>${id<24?'점령 완료 · 재도전':id===24?'현재 도전 · '+campaignStages[id-1].recommendedRank:'이전 스테이지 완료 필요'}</small></span>${id>24?battleIcon('lock'):reward(id)}</button>`).join('')}</div>`;
  return `<div class="chapter-hero" data-chapter-heading><small>아스테라 정복</small><strong>두 번째 진격</strong><span>스테이지 21–40 · 수도까지 16개</span></div><div class="chapter-tabs" aria-label="스테이지 구간"><button data-chapter="1">1–20</button><button data-chapter="21" aria-pressed="true">21–40</button><button disabled>41–60</button><button disabled>61–80</button></div><div class="stage-matrix">${Array.from({length:20},(_,i)=>stagePick(21+i,((21+i)%20===0)?'capital':'')).join('')}</div><div class="map-legend"><span>완료 · 청록</span><span>도전 · 금색</span><span>잠금 · 회색</span></div>`;
}
function stageFooter(id){return `<div class="stage-summary"><div><small>${stageStatus(id)}</small><strong>아스테라 스테이지 ${id}</strong><span>권장 ${campaignStages[id-1].recommendedRank} · 장비 +${campaignStages[id-1].recommendedLevel}</span></div>${reward(id)}</div><button class="primary" data-preview-next>출전 장비 선택 ${battleIcon('right')}</button>`;}
function optionShell(o,kind,body){return `<article class="design-option" id="${kind}-${o.id}" data-option="${kind}-${o.id}"><div class="option-heading"><span class="option-letter">${o.id}</span><div><h3>${o.title}</h3><small>${o.tag}</small></div></div><p class="option-copy">${o.copy}</p><div class="phone" data-${kind}-option="${o.id}">${body}</div></article>`;}
document.querySelector('#stage-grid').innerHTML=stageOptions.map(o=>optionShell(o,'stage',`${phoneHead('스테이지 선택','전투')}${continents()}<div class="phone-content stage-content">${stageBody(o.id)}</div><footer class="phone-footer">${stageFooter(24)}</footer>`)).join('');

function slots(type){const chosen=[...selections.get(type)];return `<div class="slots" aria-label="선택한 장비">${Array.from({length:6},(_,i)=>chosen[i]?`<button class="slot filled" data-remove="${chosen[i]}" aria-label="${cards.get(chosen[i]).name} 편성 해제">${artwork(chosen[i])}<small>${cards.get(chosen[i]).name}</small><i>${battleIcon('check')}</i></button>`:`<span class="slot empty"><b>+</b><small>빈 칸</small></span>`).join('')}</div>`;}
function deckCard(id,type){const selected=selections.get(type).has(id),c=cards.get(id);return `<button class="equipment-card ${selected?'selected':''}" data-toggle="${id}" aria-pressed="${selected}" aria-label="${c.name} ${selected?'편성 해제':'편성 추가'}">${mana(id)}${artwork(id)}<strong>${c.name}</strong><small>+${c.level} 강화</small><span class="selection-mark">${selected?battleIcon('check'):'+'}</span></button>`;}
function collectionRows(type){return ids.map(id=>{const c=cards.get(id),selected=selections.get(type).has(id);return `<button class="gear-row ${selected?'selected':''}" data-toggle="${id}" aria-pressed="${selected}"><span class="row-art">${artwork(id)}</span><span class="row-info"><strong>${c.name} <small>+${c.level}</small></strong><span>${c.trait.kind==='heal'?'회복 지원':`공격력 ${Math.round(c.stats.damage).toLocaleString('ko-KR')}`} · ${(c.stats.intervalMs/1000).toFixed(1)}초</span></span>${mana(id)}<i>${selected?battleIcon('check'):'+'}</i></button>`;}).join('');}
function focusCard(type){const id=focused.get(type),c=cards.get(id),selected=selections.get(type).has(id);return `<div class="showcase-card">${mana(id)}<small class="equipment-level">강화 +${c.level}</small>${artwork(id,true)}<strong>${c.name}</strong><span>${c.trait.kind==='heal'?'아군을 회복하는 지원 장비':'적을 향해 전진하는 자동 공격 장비'}</span><dl><div><dt>${c.trait.kind==='heal'?'최대 체력 회복':'공격력'}</dt><dd>${c.trait.kind==='heal'?Math.round(BATTLE_RULES.healPercent*100)+'%':Math.round(c.stats.damage).toLocaleString('ko-KR')}</dd></div><div><dt>${c.trait.kind==='heal'?'회복 간격':'공격 간격'}</dt><dd>${c.stats.intervalMs/1000}초</dd></div><div><dt>재출격</dt><dd>${c.trait.cooldownMs/1000}초</dd></div></dl><button class="secondary ${selected?'selected':''}" data-toggle="${id}">${selected?'편성에서 빼기':'이 장비 편성하기'}</button></div>`;}
function deckBody(type){return `<div class="deck-top"><div class="deck-caption"><b>내 출전 장비</b><span data-count>${selections.get(type).size} / 6</span></div><div data-slots>${slots(type)}</div></div><div class="phone-content deck-content">${type==='A'?`<div class="collection-title"><b>보유 장비</b><span>누르면 추가·해제</span></div><div class="equipment-grid">${ids.map(id=>deckCard(id,type)).join('')}</div>`:type==='B'?`<div data-showcase>${focusCard(type)}</div><div class="gear-carousel" aria-label="장비 살펴보기">${ids.map(id=>`<button data-focus="${id}" aria-label="${cards.get(id).name} 살펴보기" aria-pressed="${focused.get(type)===id}">${artwork(id)}<small>${cards.get(id).name}</small></button>`).join('')}</div>`:`<div class="collection-title"><b>보유 장비</b><span>능력 한눈에 비교</span></div><div class="gear-rows">${collectionRows(type)}</div>`}</div><footer class="phone-footer"><div class="deck-total">출전 준비 <strong data-average></strong></div><button class="primary" data-mock-start>이 편성으로 출전 ${battleIcon('right')}</button><p class="preview-message" role="status">시안입니다. 실제 전투는 시작하지 않아요.</p></footer>`;}
document.querySelector('#deck-grid').innerHTML=deckOptions.map(o=>optionShell(o,'deck',`${phoneHead('출전 장비','아스테라 스테이지 24')}${deckBody(o.id)}`)).join('');
function paint(root=document){root.querySelectorAll('[data-gear-art]').forEach(canvas=>drawEquipment(canvas,cards.get(canvas.dataset.gearArt).level,canvas.dataset.gearArt));}
function syncDeck(phone,type){
  const set=selections.get(type);phone.querySelector('[data-slots]').innerHTML=slots(type);phone.querySelector('[data-count]').textContent=`${set.size} / 6`;
  if(type==='A')phone.querySelector('.equipment-grid').innerHTML=ids.map(id=>deckCard(id,type)).join('');
  if(type==='B')phone.querySelector('[data-showcase]').innerHTML=focusCard(type);
  if(type==='C')phone.querySelector('.gear-rows').innerHTML=collectionRows(type);
  phone.querySelector('[data-average]').textContent=set.size?`평균 마나 ${([...set].reduce((sum,id)=>sum+cards.get(id).trait.cost,0)/set.size).toFixed(1)}`:'장비를 선택하세요';
  phone.querySelector('[data-mock-start]').disabled=!set.size;paint(phone);
}
document.querySelectorAll('[data-deck-option]').forEach(p=>syncDeck(p,p.dataset.deckOption));
document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.size){document.documentElement.style.setProperty('--phone-width',button.dataset.size+'px');document.querySelectorAll('[data-size]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));return;}
  const stagePhone=button.closest('[data-stage-option]');
  if(stagePhone){
    const type=stagePhone.dataset.stageOption;
    if(button.dataset.chapter){
      const first=Number(button.dataset.chapter),previous=picks.get(type),id=previous>=first&&previous<first+20?previous:Math.min(24,first+19);
      picks.set(type,id);
      stagePhone.querySelector('.stage-matrix').innerHTML=Array.from({length:20},(_,i)=>stagePick(first+i,((first+i)%20===0)?'capital':'',id)).join('');
      stagePhone.querySelector('[data-chapter-heading]').innerHTML='<small>아스테라 정복</small><strong>'+(first===1?'첫 번째 진격':'두 번째 진격')+'</strong><span>스테이지 '+first+'–'+(first+19)+'</span>';
      stagePhone.querySelector('.phone-footer').innerHTML=stageFooter(id);
      stagePhone.querySelectorAll('[data-chapter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    }
    const id=button.hasAttribute('data-locate')?24:Number(button.dataset.stagePick);
    if(id&&id<=24){picks.set(type,id);stagePhone.querySelectorAll('[data-stage-pick]').forEach(b=>{b.setAttribute('aria-pressed',String(Number(b.dataset.stagePick)===id));b.classList.toggle('selected',Number(b.dataset.stagePick)===id);});stagePhone.querySelector('.phone-footer').innerHTML=stageFooter(id);}
    if(button.hasAttribute('data-preview-next')){document.querySelectorAll('[data-deck-option] .phone-head small').forEach(label=>{label.textContent='아스테라 스테이지 '+picks.get(type);});document.querySelector('#deck-options').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
    return;
  }
  const phone=button.closest('[data-deck-option]');if(!phone)return;const type=phone.dataset.deckOption,set=selections.get(type);
  const toggle=button.dataset.toggle??button.dataset.remove;
  if(toggle){if(set.has(toggle)){set.delete(toggle);}else if(set.size<6){set.add(toggle);}else{phone.querySelector('.preview-message').textContent='최대 6개예요. 선택한 장비를 하나 빼주세요.';return;}phone.querySelector('.preview-message').textContent=`${cards.get(toggle).name} ${set.has(toggle)?'편성 완료':'편성 해제'}`;syncDeck(phone,type);(phone.querySelector('[data-toggle="'+toggle+'"]')??phone.querySelector('[data-mock-start]')).focus({preventScroll:true});}
  if(button.dataset.focus){focused.set(type,button.dataset.focus);phone.querySelectorAll('[data-focus]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));syncDeck(phone,type);}
  if(button.hasAttribute('data-mock-start'))phone.querySelector('.preview-message').textContent=`${set.size}개 장비 선택 완료. 실제 전투는 시작하지 않습니다.`;
});

const iconLabels={mana:"마나",lock:"잠금",pause:"일시정지",info:"상세보기",check:"선택",locate:"현재 위치",world:"대륙",orbit:"우주",up:"위로",down:"아래로",left:"이전",right:"다음"};
document.querySelector("#icon-grid").innerHTML=Object.entries(iconLabels).map(([id,name])=>`<div><span class="large-icon">${battleIcon(id)}</span><span>${battleIcon(id)}<small>${name}</small></span></div>`).join("")+`<div class="stars-review">${battleStarsMarkup(3)}${battleStarsMarkup(1)}<small>획득한 별 / 남은 별</small></div>`;
