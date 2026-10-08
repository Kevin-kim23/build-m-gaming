// All seeded records are confined to 4206. Never opens or writes the player's normal origin.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const page=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>가이드 검증</title>
<style>body{font:14px sans-serif;background:#202824;color:white}button,select{padding:10px;margin:4px}iframe{display:block;border:0;margin:12px 0;width:360px;height:800px}pre{white-space:pre-wrap}</style>
<h1>4206 전용 가이드 검증</h1><p>실제 게임 기록과 분리된 테스트입니다.</p>
<select id="size" aria-label="화면 크기"><option>360x800</option><option>320x480</option><option>412x915</option><option>844x390</option></select>
<button data-case="first">첫 모집</button><button data-case="wait">학교 59만</button><button data-case="school">학교 60만</button><button data-case="expand">학교 증설</button><button data-case="facility">시설 건설</button><button data-case="equipment">장비 구매</button><button data-case="done">완료한 기존 기록</button><button id="reload">재접속</button><button id="check">검사</button>
<pre id="evidence"></pre><iframe id="game" title="검증용 게임"></iframe>
<script type="module">
import {freshState,SAVE_KEY} from '/src/state.js';import {recruitOffer} from '/src/game.js';import {serializeSave} from '/src/money.js';
const frame=document.querySelector('#game'),size=document.querySelector('#size');
size.onchange=()=>{const [w,h]=size.value.split('x');frame.style.width=w+'px';frame.style.height=h+'px';};
function seed(kind){if(location.host!=='127.0.0.1:4206')throw Error('Wrong QA origin');
frame.onload=()=>{frame.onload=null;const s=freshState();s.sound=false;s.musicVolume=0;s.sfxVolume=0;s.soldiers=20;s.gold=600000;
if(kind==='first'){s.soldiers=0;s.gold=recruitOffer(s,'soldier').cost;}if(kind==='wait')s.gold=590000;
if(['expand','facility','equipment','done'].includes(kind)){s.ncoSchoolLevel=2;s.sergeants=1;s.soldiers=80;s.gold=500000;}
if(kind==='expand'){s.ncoSchoolLevel=1;s.soldiers=20;s.gold=30000000;}
if(['equipment','done'].includes(kind)){s.soldiers=400;s.facilities=['kitchen'];s.facilityLevels={kitchen:2};s.gold=10000000;}
if(kind==='done'){s.ncoSchoolLevel=5;s.equipment.tank={count:1,level:5,deployed:true};}
localStorage.setItem(SAVE_KEY,serializeSave(s));localStorage.setItem(SAVE_KEY+'-backup',serializeSave(s));localStorage.setItem('budae-kiugi-ui-guide-off','0');frame.src='/';};frame.src='about:blank';}
for(const button of document.querySelectorAll('[data-case]'))button.onclick=()=>seed(button.dataset.case);
document.querySelector('#reload').onclick=()=>frame.contentWindow.location.reload();
document.querySelector('#check').onclick=()=>{const d=frame.contentDocument,visible=d.querySelector('#guide-spotlight:popover-open'),target=d.querySelector('[aria-describedby~="guide-dialogue-text"]'),bubble=visible?.querySelector('.guide-dialogue'),rect=n=>{if(!n)return null;const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
const b=rect(bubble),t=rect(target);document.querySelector('#evidence').textContent=JSON.stringify({coach:d.querySelector('#coach')?.textContent,spotlight:!!visible,target:target?.outerHTML,bubble:b,targetRect:t,overlap:!!b&&!!t&&b.x<t.right&&b.right>t.x&&b.y<t.bottom&&b.bottom>t.y,dialogs:[...d.querySelectorAll('dialog[open]')].map(n=>n.id),gold:d.querySelector('#gold')?.textContent},null,2);};
</script></html>`;
export default{root,define:{__APP_VERSION__:JSON.stringify(version)},server:{host:'127.0.0.1',port:4206,strictPort:true},plugins:[{name:'guide-qa',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url!=='/__guide-check')return next();res.setHeader('Content-Type','text/html; charset=utf-8');res.end(page);});}}]};
