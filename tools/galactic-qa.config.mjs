// Dedicated QA origin. These fixtures never read the real game's save.
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
const root=fileURLToPath(new URL('../',import.meta.url));
const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const page=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>특전원수·목록 검증</title>
<style>html:root,html:root body{display:block;overflow:auto;height:auto}body{padding:20px;background:#13251f;color:#f8efd1;font:14px sans-serif}button,a{padding:12px;margin:4px;background:#3b5040;color:#fff1bd;border:1px solid #b6a66a;border-radius:6px;display:inline-block}section{display:flex;gap:18px;flex-wrap:wrap}figure{margin:0;padding:12px;background:#2b3c32;text-align:center}figure .insignia.framed-rank{width:96px;height:96px;margin:8px auto}figcaption{margin-top:10px}canvas{width:240px;height:190px;image-rendering:pixelated}.medal svg{width:96px;height:112px}</style>
<h1>특전원수 · 은하사령부 · 스테이지 목록</h1><p>4204 전용. 실제4196 게임 기록과 분리.</p><button data-stage="0">첫 지역</button><button data-stage="19">첫 수도 직전</button><button data-stage="20">두 번째 국가</button><button data-stage="79">마지막 수도</button><button data-stage="80">전체 점령</button><button id="near">특전원수 진급 직전</button><button id="ceremony">특전원수 진급식</button><p id="result" role="status"></p><a href="/">게임 열기</a><h2>원수 계급장</h2><section id="ranks"></section><h2>최상위 부대와 훈장</h2><section id="hq"></section>
<script type="module">
import '/src/style.css';import '/src/hud.css';import '/src/general-promotion.css';
import {freshState,SAVE_KEY} from '/src/state.js';import {serializeSave,MAX_GOLD} from '/src/money.js';import {RANKS} from '/src/ranks.js';
import {GALACTIC_COMMAND_SIZE,FORMATIONS} from '/src/formations.js';import {insignia} from '/src/home-view.js';import {showPromotion} from '/src/promotion.js';import {drawFormationPortrait} from '/src/art.js';import {medalSvg} from '/src/achievement-art.js';
function seed(cleared,near=false){if(location.hostname!=='127.0.0.1'||location.port!=='4204')throw Error('QA origin required');
 const s=freshState();s.soldiers=GALACTIC_COMMAND_SIZE-3000-(near?1:0);s.sergeants=300;s.gold=MAX_GOLD-1n;s.ncoSchoolLevel=s.officerSchoolLevel=s.advancedSchoolLevel=5;
 s.campaignCleared=cleared;s.campaignStars.fill(3,0,cleared);for(const id of Object.keys(s.personalLevels))s.personalLevels[id]=10;
 for(const id of ['artillery','tank','carrier','flyingFortress','orbitalAssault'])s.equipment[id]={level:20,count:1,deployed:true};
 const raw=serializeSave(s);localStorage.setItem(SAVE_KEY,raw);localStorage.setItem(SAVE_KEY+'-backup',raw);document.querySelector('#result').textContent='검증 기록 준비 완료';}
document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>seed(Number(b.dataset.stage)));document.querySelector('#near').onclick=()=>seed(0,true);document.querySelector('#ceremony').onclick=()=>showPromotion(RANKS.indexOf('특전원수'),insignia);
document.querySelector('#ranks').innerHTML=['준원수','소원수','중원수','대원수','특전원수'].map(rank=>'<figure>'+insignia(RANKS.indexOf(rank))+'<figcaption>'+rank+'</figcaption></figure>').join('');
for(const id of ['supremeCommand','galacticCommand']){const f=document.createElement('figure'),canvas=document.createElement('canvas');canvas.width=480;canvas.height=380;drawFormationPortrait(canvas,id);f.append(canvas);const caption=document.createElement('figcaption');caption.textContent=FORMATIONS.find(f=>f.id===id).name;f.append(caption);document.querySelector('#hq').append(f);}
document.querySelector('#hq').insertAdjacentHTML('beforeend','<figure class="medal">'+medalSvg('galacticCommand')+'<figcaption>은하사령관</figcaption></figure>');
</script></html>`;
export default {root,define:{__APP_VERSION__:JSON.stringify(version)},server:{host:'127.0.0.1',port:4204,strictPort:true},plugins:[{name:'galactic-qa',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url!=='/__galactic-check')return next();res.setHeader('Content-Type','text/html; charset=utf-8');res.end(page);});}}]};
