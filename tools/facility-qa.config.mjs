// Dedicated development origin: never reads or changes the player's game save.
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
const root=fileURLToPath(new URL('../',import.meta.url));
const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const page=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>시설·진급 검증</title><style>body{margin:18px;background:#13221c;color:#f8edcf;font:14px sans-serif}button,a{padding:12px;margin:4px;display:inline-block}a{color:#edca70}.gallery{display:flex;gap:12px;flex-wrap:wrap}figure{margin:0;padding:8px;background:#293b2d;text-align:center}figure svg{width:144px;height:108px}.rank-gallery figure svg{width:88px;height:88px}body>button,#promotions button{background:#455c43;color:#fff1c9;border:1px solid #bba363;border-radius:5px}.gallery figure{flex:0 0 auto}.rank-gallery figure{width:104px}.rank-gallery .insignia.framed-rank{width:88px;height:88px;margin:0 auto 8px}html:root,html:root body{overflow:auto;height:auto;display:block}.game{position:relative}</style>
<h1>시설·진급 검증 전용</h1><p>4201 전용. 실제 게임 기록과 분리되어 있습니다.</p>
<button data-seed="1">시설 Lv.1 게임 준비</button><button data-seed="19">시설 Lv.19 게임 준비</button><button data-seed="20">시설 Lv.20 게임 준비</button><button id="near-promotion">중령 진급 직전 게임 준비</button><p id="result" role="status"></p><a href="/">게임 확인</a>
<h2>진급 연출</h2><div id="promotions"></div><button id="awards">장군검 획득 팝업</button><div id="ranks" class="gallery rank-gallery"></div><h2>풋살장 성장</h2><div id="futsal" class="gallery"></div><h2>시설 Lv.20</h2><div id="facilities" class="gallery"></div>
<script type="module">
import '/src/style.css';import '/src/hud.css';import '/src/general-promotion.css';import '/src/personal-awards.css';
import {freshState,SAVE_KEY} from '/src/state.js';import {serializeSave,MAX_GOLD} from '/src/money.js';
import {FACILITIES} from '/src/facilities.js';import {facilityIcon} from '/src/facility-art.js';import {EQUIPMENT} from '/src/equipment.js';
import {RANKS,RANK_REQUIREMENTS} from '/src/ranks.js';import {insignia} from '/src/home-view.js';
import {showPromotion} from '/src/promotion.js';import {createPersonalAwardUI} from '/src/personal-awards.js';
const awards=createPersonalAwardUI();
function seed(level,near=false){
  if(location.hostname!=='127.0.0.1'||location.port!=='4201')throw Error('QA origin required');
  const s=freshState();s.gold=MAX_GOLD;s.sergeants=near?40:300;
  s.soldiers=RANK_REQUIREMENTS[RANKS.indexOf(near?'중령':'준장')]-s.sergeants*10-(near?1:0);
  if(!near){s.facilities=FACILITIES.map(f=>f.id);s.facilityLevels=Object.fromEntries(s.facilities.map(id=>[id,level]));
    s.ncoSchoolLevel=5;s.officerSchoolLevel=1;for(const id of ['artillery','tank','selfPropelled','helicopter'])if(Object.hasOwn(EQUIPMENT,id))s.equipment[id]={level:10,count:1,deployed:true};}
  localStorage.setItem(SAVE_KEY,serializeSave(s));localStorage.setItem(SAVE_KEY+'-backup',serializeSave(s));document.querySelector('#result').textContent='검증 기록 준비 완료';
}
document.querySelectorAll('[data-seed]').forEach(b=>b.onclick=()=>seed(Number(b.dataset.seed)));
document.querySelector('#near-promotion').onclick=()=>seed(1,true);
const grades=['일병','병장','하사','대위','소령','대령','준장','준원수'];
document.querySelector('#promotions').innerHTML=grades.map(name=>'<button data-rank="'+name+'">'+name+' 연출</button>').join('');
document.querySelectorAll('[data-rank]').forEach(b=>b.onclick=()=>showPromotion(RANKS.indexOf(b.dataset.rank),insignia));
document.querySelector('#awards').onclick=()=>awards.award(RANKS.indexOf('대령'),RANKS.indexOf('준장'));
document.querySelector('#ranks').innerHTML=['준장','소장','중장','대장','준원수'].map(name=>'<figure>'+insignia(RANKS.indexOf(name))+'<figcaption>'+name+'</figcaption></figure>').join('');
document.querySelector('#futsal').innerHTML=[1,5,10,15,20].map(level=>'<figure>'+facilityIcon('futsal',level)+'<figcaption>Lv.'+level+'</figcaption></figure>').join('');
document.querySelector('#facilities').innerHTML=FACILITIES.map(f=>'<figure>'+facilityIcon(f.id,20)+'<figcaption>'+f.name+' Lv.20</figcaption></figure>').join('');
</script></html>`;
export default {root,define:{__APP_VERSION__:JSON.stringify(version)},server:{host:'127.0.0.1',port:4201,strictPort:true},
plugins:[{name:'facility-promotion-qa',configureServer(server){server.middlewares.use((req,res,next)=>{
if(req.url!=='/__facility-check')return next();res.setHeader('Content-Type','text/html; charset=utf-8');res.end(page);
});}}]};
