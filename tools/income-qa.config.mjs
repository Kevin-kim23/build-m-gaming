// Separate QA origin; narrow/short frames exercise effect wrapping without touching player saves.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const page=`<!doctype html><html lang="ko"><meta charset="utf-8"><title>수입 효과 검증</title>
<style>body{font:14px sans-serif;background:#202824;color:white}button,select{padding:10px;margin:4px}iframe{display:block;border:0;margin:12px 0;width:360px;height:800px}pre{white-space:pre-wrap}</style>
<h1>4207 전용 수입 효과 검증</h1><p>실제 게임 저장과 분리된 테스트입니다.</p>
<select id="size" aria-label="화면 크기"><option>360x800</option><option>320x480</option><option>412x915</option><option>844x390</option></select>
<button id="fresh">초기 기록</button><button id="full">최대 효과 기록</button><button id="check">화면 검사</button>
<pre id="evidence"></pre><iframe id="game" title="검증용 게임"></iframe>
<script type="module">
import {freshState,SAVE_KEY} from '/src/state.js';import {serializeSave,MAX_GOLD} from '/src/money.js';
import {FACILITIES} from '/src/facilities.js';import {EQUIPMENT} from '/src/equipment.js';
const frame=document.querySelector('#game'),size=document.querySelector('#size');
size.onchange=()=>{const [w,h]=size.value.split('x');frame.style.width=w+'px';frame.style.height=h+'px';};
function seed(full){if(location.host!=='127.0.0.1:4207')throw Error('Wrong QA origin');
frame.onload=()=>{frame.onload=null;const s=freshState();s.sound=false;s.musicVolume=0;s.sfxVolume=0;
if(full){s.soldiers=335544320;s.sergeants=300;s.gold=MAX_GOLD-1n;s.ncoSchoolLevel=5;s.officerSchoolLevel=5;s.advancedSchoolLevel=5;
s.facilities=FACILITIES.map(f=>f.id);s.facilityLevels=Object.fromEntries(s.facilities.map(id=>[id,20]));
s.personalLevels=Object.fromEntries(Object.keys(s.personalLevels).map(id=>[id,10]));
s.equipment=Object.fromEntries(Object.keys(EQUIPMENT).map(id=>[id,{level:20,count:1,deployed:true}]));
s.campaignCleared=80;s.campaignStars=Array(80).fill(3);}
localStorage.setItem(SAVE_KEY,serializeSave(s));localStorage.setItem(SAVE_KEY+'-backup',serializeSave(s));
localStorage.setItem('budae-kiugi-ui-guide-off','1');frame.src='/';};frame.src='about:blank';}
document.querySelector('#fresh').onclick=()=>seed(false);document.querySelector('#full').onclick=()=>seed(true);
document.querySelector('#check').onclick=()=>{const d=frame.contentDocument,rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
const nodes=[...d.querySelectorAll('.hud .rank,.gold-counter,#sound,.income-rate,.income-effects>span,.income-skill:not([hidden])')];
document.querySelector('#evidence').textContent=JSON.stringify({width:frame.clientWidth,hud:rect(d.querySelector('.hud')),field:rect(d.querySelector('.field-region')),overflow:nodes.filter(n=>{const r=rect(n);return r.x<0||r.right>frame.clientWidth;}).map(n=>n.textContent),income:d.querySelector('.income-lines').innerText,nodes:nodes.map(n=>({text:n.innerText,...rect(n)}))},null,2);};
</script></html>`;
export default{root,define:{__APP_VERSION__:JSON.stringify(version)},server:{host:'127.0.0.1',port:4207,strictPort:true},plugins:[{name:'income-qa',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url!=='/__income-check')return next();res.setHeader('Content-Type','text/html; charset=utf-8');res.end(page);});}}]};
