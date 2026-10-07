// Isolated development origin; fixtures never touch the player's 4196 save.
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
const root=fileURLToPath(new URL('../',import.meta.url));
const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const page=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>원수급 장비 검증</title><style>body{margin:20px;background:#14231f;color:#f5ead2;font:14px sans-serif}button,a{padding:12px;margin:4px;display:inline-block;color:inherit;background:#33483c}section{display:flex;gap:16px;flex-wrap:wrap}figure{margin:0;padding:16px;background:#293a32;text-align:center}figure svg{width:112px;height:150px}canvas{image-rendering:pixelated;width:220px;height:124px}figcaption{margin-top:8px}</style>
<h1>원수급 신규 장비 검증</h1><p>4203 전용 테스트 기록. 실제 플레이 기록과 분리.</p>
<button data-rank="준원수">준원수 잠금 확인</button><button data-rank="소원수">소원수 구매 확인</button><button data-rank="중원수">중원수 구매 확인</button><button data-rank="대원수">대원수 구매 확인</button><button id="max">전체 20강 확인</button><p id="result" role="status"></p><a href="/">게임 열기</a>
<h2>군사 장비 · 기본 / 20강</h2><section id="military"></section><h2>개인 장비 · Lv.1 / Lv.10</h2><section id="personal"></section>
<script type="module">
import {freshState,SAVE_KEY} from '/src/state.js';import {serializeSave,MAX_GOLD} from '/src/money.js';
import {RANKS,RANK_REQUIREMENTS} from '/src/ranks.js';import {EQUIPMENT} from '/src/equipment.js';import {FACILITIES} from '/src/facilities.js';
import {drawEquipment} from '/src/equipment-art.js';import {personalIcon} from '/src/personal-art.js';import {PERSONAL_EQUIPMENT} from '/src/personal-catalog.js';
const ids=['carrier','flyingFortress','orbitalAssault'];
function seed(rank,max=false){
 if(location.hostname!=='127.0.0.1'||location.port!=='4203')throw Error('QA origin required');
 const s=freshState();s.gold=MAX_GOLD;s.sergeants=300;s.soldiers=RANK_REQUIREMENTS[RANKS.indexOf(rank)]-3000;
 s.ncoSchoolLevel=s.officerSchoolLevel=s.advancedSchoolLevel=5;s.campaignCleared=80;
 s.facilities=FACILITIES.map(f=>f.id);s.facilityLevels=Object.fromEntries(s.facilities.map(id=>[id,20]));
 s.personalLevels.divisionFlag=10;
 if(max){for(const id of Object.keys(EQUIPMENT))s.equipment[id]={level:20,count:1,deployed:true};for(const id of Object.keys(s.personalLevels))s.personalLevels[id]=10;}
 const raw=serializeSave(s);localStorage.setItem(SAVE_KEY,raw);localStorage.setItem(SAVE_KEY+'-backup',raw);document.querySelector('#result').textContent=rank+' 검증 기록 준비 완료';
}
document.querySelectorAll('[data-rank]').forEach(b=>b.onclick=()=>seed(b.dataset.rank));document.querySelector('#max').onclick=()=>seed('대원수',true);
for(const id of ids)for(const level of [0,20]){const f=document.createElement('figure'),c=document.createElement('canvas');drawEquipment(c,level,id);f.append(c);const label=document.createElement('figcaption');label.textContent=EQUIPMENT[id].name+' '+level+'강';f.append(label);document.querySelector('#military').append(f);}
document.querySelector('#personal').innerHTML=['admiralsCompass','strategicTablet','supremeSeal'].flatMap(id=>[1,10].map(level=>'<figure>'+personalIcon(PERSONAL_EQUIPMENT[id].icon,level)+'<figcaption>'+PERSONAL_EQUIPMENT[id].name+' Lv.'+level+'</figcaption></figure>')).join('');
</script></html>`;
export default {root,define:{__APP_VERSION__:JSON.stringify(version)},server:{host:'127.0.0.1',port:4203,strictPort:true},plugins:[{name:'late-equipment-qa',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url!=='/__late-check')return next();res.setHeader('Content-Type','text/html; charset=utf-8');res.end(page);});}}]};
