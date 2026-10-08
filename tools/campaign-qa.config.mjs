// Separate QA origin. Fixture buttons never write to the player's 4196 origin.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {referenceArmy} from './campaign-sim.mjs';
import {STAGES} from '../src/battle.js';
import {serializeSave} from '../src/money.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const fixtures=Object.fromEntries([['locked',1],['first',1],['capital',20],['final',80]].map(([key,id])=>{
  const s=referenceArmy(STAGES[id-1]);s.sound=false;s.sfxVolume=0;s.musicVolume=0;
  if(key==='locked')s.equipment.artillery=null;
  return [key,serializeSave(s)];
}));
const page=`<!doctype html><html lang="ko"><meta charset="utf-8"><title>대위~특전원수 전투 검증</title>
<style>body{font:14px sans-serif;background:#202824;color:white}button,select{padding:10px;margin:4px}iframe{display:block;border:0;margin:12px 0;width:360px;height:800px}pre{white-space:pre-wrap}</style>
<h1>4208 전용 전투 검증</h1><p>실제 게임 저장과 분리된 테스트입니다.</p>
<select id="size" aria-label="화면 크기"><option>360x800</option><option>320x568</option><option>412x915</option><option>844x390</option></select>
<button data-fixture="locked">대위 장비 없음</button><button data-fixture="first">대위 첫 전투</button>
<button data-fixture="capital">대령 첫 수도</button><button data-fixture="final">특전원수 마지막 수도</button><button id="check">화면 검사</button>
<pre id="evidence"></pre><iframe id="game" title="검증용 게임"></iframe>
<script type="module">
import {SAVE_KEY} from '/src/state.js';
const fixtures=${JSON.stringify(fixtures)},frame=document.querySelector('#game'),size=document.querySelector('#size');
size.onchange=()=>{const [w,h]=size.value.split('x');frame.style.width=w+'px';frame.style.height=h+'px';};
for(const button of document.querySelectorAll('[data-fixture]'))button.onclick=()=>{
  if(location.host!=='127.0.0.1:4208')throw Error('Wrong QA origin');
  document.querySelector('#evidence').textContent='';
  frame.onload=()=>{frame.onload=null;const s=JSON.parse(fixtures[button.dataset.fixture]);s.lastAccrual=Date.now();
    const data=JSON.stringify(s);localStorage.setItem(SAVE_KEY,data);localStorage.setItem(SAVE_KEY+'-backup',data);
    localStorage.setItem('budae-kiugi-ui-guide-off','1');frame.src='/';};frame.src='about:blank';
};
document.querySelector('#check').onclick=()=>{const d=frame.contentDocument,box=d.querySelector('#battle-modal');
 const nodes=[...d.querySelectorAll('#battle-modal button,.brief-line,.region-reward')].filter(n=>n.getClientRects().length);
 document.querySelector('#evidence').textContent=JSON.stringify({width:frame.clientWidth,
  overflow:nodes.filter(n=>{const r=n.getBoundingClientRect();return r.x<0||r.right>frame.clientWidth;}).map(n=>n.textContent),
  text:box?.innerText,save:JSON.parse(localStorage.getItem(SAVE_KEY))?.campaignCleared},null,2);};
</script></html>`;
export default{root,define:{__APP_VERSION__:JSON.stringify(version)},server:{host:'127.0.0.1',port:4208,strictPort:true},plugins:[{name:'campaign-qa',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url!=='/__campaign-check')return next();res.setHeader('Content-Type','text/html; charset=utf-8');res.end(page);});}}]};
