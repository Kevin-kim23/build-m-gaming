// Isolated development fixtures. Never write the player's 4196 record.
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
const root=fileURLToPath(new URL('../',import.meta.url));
const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const page=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>개인 장비 검증</title><style>body{background:#172126;color:#eee;font:14px sans-serif;margin:16px}button,a{display:inline-block;padding:12px;margin:4px}a{color:#cfe9c7}.gallery{display:grid;grid-template-columns:repeat(10,minmax(84px,1fr));gap:8px;overflow:auto}figure{margin:0;background:#253036;padding:6px;text-align:center}svg{width:72px;height:112px}</style>
<h1>4199 전용 개인 장비 검증</h1><p>실제 4196 기록과 분리된 개발용 기록입니다.</p>
<button data-case="legacy">이전 형식 29 · Lv.10</button><button data-case="one">전체 Lv.1</button><button data-case="nine">전체 Lv.19</button><button data-case="max">전체 Lv.20</button><button data-case="poor">골드 부족</button><button data-case="locked">대령 잠금</button>
<button data-case="v19">형식 19 유료 Lv.7</button><button data-case="general">대장 신규 장비</button><button data-case="marshal">준원수 신규 장비</button><button data-case="weapons">사단기20 · 군사29강</button>
<p id="result" role="status"></p><a href="/">게임 확인</a><div id="gallery"></div>
<script type="module">
import {freshState,SAVE_KEY} from '/src/state.js';
import {serializeSave} from '/src/money.js';
import {PERSONAL_EQUIPMENT} from '/src/personal-catalog.js';
import {personalIcon} from '/src/personal-art.js';
import {EQUIPMENT} from '/src/equipment.js';
import {drawEquipment} from '/src/equipment-art.js';
import {unitSprite} from '/src/unit-sprites.js';
import {reconcileAchievements} from '/src/achievements.js';
document.querySelectorAll('[data-case]').forEach(button=>button.onclick=()=>{
  if(location.hostname!=='127.0.0.1'||location.port!=='4199')throw Error('Separate QA origin required');
  const s={...freshState(),soldiers:335541320,sergeants:300,gold:500_000_000_000_000_000n,ncoSchoolLevel:5,officerSchoolLevel:5,advancedSchoolLevel:5,sound:false,musicVolume:0,sfxVolume:0};
  const mode=button.dataset.case,level=mode==='max'||mode==='weapons'?20:mode==='nine'||mode==='poor'?19:mode==='legacy'?10:1;
  s.personalLevels=Object.fromEntries(Object.keys(PERSONAL_EQUIPMENT).map(id=>[id,level]));
  Object.keys(EQUIPMENT).forEach((id,i)=>s.equipment[id]={level:20,count:1,deployed:i<4});
  if(mode==='legacy')s.version=29;
  if(mode==='v19'){
    s.version=19;for(const id of Object.keys(s.personalLevels))s.personalLevels[id]=7;
    delete s.personalLevels.marshalGlaive;delete s.equipment.railgunTank;delete s.equipment.icbm;
  }
  if(mode==='general'||mode==='marshal'){
    s.soldiers=(mode==='general'?327680:1310720)-3000;s.equipment=freshState().equipment;
  }
  if(mode==='weapons'){
    s.equipment=freshState().equipment;
    for(const id of Object.keys(EQUIPMENT))s.equipment[id]={level:29,count:1,deployed:true};
  }
  if(mode==='poor'){s.gold=0;for(const id of Object.keys(s.equipment))s.equipment[id]=null;}
  if(mode==='locked'){s.soldiers=3000;s.sergeants=300;s.gold=1_000_000_000;s.equipment=freshState().equipment;}
  reconcileAchievements(s);
  localStorage.setItem('budae-kiugi-ui-guide-off','1');
  localStorage.removeItem(SAVE_KEY+'-backup');localStorage.setItem(SAVE_KEY,serializeSave(s));
  document.querySelector('#result').textContent=button.textContent+' 준비 완료';
});
document.querySelector('#gallery').innerHTML=Object.values(PERSONAL_EQUIPMENT).map(item=>'<h2>'+item.name+'</h2><div class="gallery">'+Array.from({length:item.maxLevel},(_,i)=>'<figure>'+personalIcon(item.icon,i+1)+'<figcaption>Lv.'+(i+1)+'</figcaption></figure>').join('')+'</div>').join('');
for(const id of Object.keys(EQUIPMENT)){
  const row=document.createElement('div');row.className='gallery';row.style.gridTemplateColumns='repeat(5, minmax(160px, 1fr))';
  const heading=document.createElement('h2');heading.textContent=EQUIPMENT[id].name;document.querySelector('#gallery').append(heading,row);
  for(const level of [0,10,20,25,30]){
    const card=document.createElement('figure'),canvas=document.createElement('canvas'),caption=document.createElement('figcaption');
    canvas.width=330;canvas.height=186;canvas.style.width='160px';canvas.style.height='90px';canvas.style.imageRendering='pixelated';
    const overhead=unitSprite(id,'player',level).cloneNode();overhead.width=168;overhead.height=204;
    overhead.getContext('2d').drawImage(unitSprite(id,'player',level),0,0);overhead.style.width='56px';overhead.style.height='68px';
    caption.textContent=level+'강';card.append(canvas,overhead,caption);row.append(card);drawEquipment(canvas,level,id);
  }
}
</script></html>`;
export default {root,define:{__APP_VERSION__:JSON.stringify(version)},server:{host:'127.0.0.1',port:4199,strictPort:true},
  plugins:[{name:'personal-qa-only',configureServer(server){server.middlewares.use((req,res,next)=>{
    if(req.url!=='/__personal-check')return next();res.setHeader('Content-Type','text/html; charset=utf-8');res.end(page);
  });}}]};
