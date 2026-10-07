// Launch fixtures only on a separate origin; never write to the user's ordinary game storage.
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
const root = fileURLToPath(new URL('../', import.meta.url));
const {version} = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const page = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>시작 화면 검증</title>
<style>body{margin:20px;background:#101e25;color:#fff3d2;font:14px system-ui}h1{font-size:22px}button,a{display:inline-block;margin:4px;padding:10px;border:1px solid #798775;border-radius:6px;background:#334a45;color:#fff3d2}main{display:flex;gap:20px;align-items:start;flex-wrap:wrap}iframe{width:320px;height:740px;border:1px solid #97a587}pre{white-space:pre-wrap;max-width:440px;line-height:1.6}label{margin:8px}select{padding:8px}</style>
<h1>로고 → 타이틀 → 게임 검증</h1><p>127.0.0.1:4205 전용 기록입니다. 실제 게임 기록과 분리됩니다.</p>
<div><button data-fixture="first">최초 설치</button><button data-fixture="fresh">새 기록 · 소리 끔</button><button data-fixture="return-on">2시간 복귀 · 소리 켬</button><button data-fixture="return-off">2시간 복귀 · 소리 끔</button><button data-fixture="marshal">특전원수 · 두 번째 국가</button><button id="reload">같은 기록 재접속</button></div>
<label>검증 화면 <select id="size"><option value="320x740">320 × 740</option><option value="390x844">390 × 844</option><option value="740x320">740 × 320 가로</option></select></label>
<main><iframe id="game" title="검증용 게임" src="about:blank" allow="autoplay"></iframe><div><h2>현재 상태</h2><pre id="evidence">위에서 검증 기록을 선택하세요.</pre><p>타이틀 전에는 저장 변경·게임 조작·복귀 팝업이 없어야 합니다. 타이틀을 누른 뒤 복귀 보상이 열립니다. 시작 터치는 골드를 주지 않습니다.</p><a href="/" target="_blank">별도 창으로 게임 열기</a></div></main>
<script type="module">
import {freshState,SAVE_KEY,LEGACY_KEY} from '/src/state.js';
import {serializeSave} from '/src/money.js';
import {GALACTIC_COMMAND_SIZE} from '/src/formations.js';
if(location.hostname!=='127.0.0.1'||location.port!=='4205')throw Error('Opening QA origin required');
const frame=document.querySelector('#game'),evidence=document.querySelector('#evidence');let original=null,fixture='';
function seed(kind){fixture=kind;frame.src='about:blank';frame.addEventListener('load',()=>{
 if(kind==='first'){for(const key of [SAVE_KEY,SAVE_KEY+'-backup',LEGACY_KEY,LEGACY_KEY+'-backup'])localStorage.removeItem(key);original=null;frame.src='/';return;}
 const t=Date.now(),s=freshState(t-(kind.startsWith('return')?7200000:0));
 s.gold=777;s.sound=kind!=='fresh'&&kind!=='return-off';s.soldiers=kind.startsWith('return')?3:0;
 if(kind==='marshal'){s.soldiers=GALACTIC_COMMAND_SIZE-3000;s.sergeants=300;s.gold=10000000000;s.ncoSchoolLevel=s.officerSchoolLevel=s.advancedSchoolLevel=5;s.campaignCleared=20;s.campaignStars.fill(3,0,20);s.equipment.artillery={level:20,count:1,deployed:true};}
 original=serializeSave(s);localStorage.setItem(SAVE_KEY,original);localStorage.setItem(SAVE_KEY+'-backup',original);frame.src='/';
},{once:true});}
document.querySelectorAll('[data-fixture]').forEach(button=>button.addEventListener('click',()=>seed(button.dataset.fixture)));
document.querySelector('#reload').onclick=()=>{frame.contentWindow.location.reload();};
document.querySelector('#size').onchange=event=>{const [w,h]=event.target.value.split('x');frame.style.width=w+'px';frame.style.height=h+'px';};
setInterval(()=>{const d=frame.contentDocument,opening=d?.querySelector('#opening');if(!opening)return;
 const video=d.querySelector('#opening-video'),saved=localStorage.getItem(SAVE_KEY),parsed=saved?JSON.parse(saved):null;
 const details={fixture,opening:opening.dataset.stage,appInert:d.querySelector('#app').inert,
 videoMuted:video.muted,videoPaused:video.paused,videoTime:Number(video.currentTime.toFixed(2)),videoDuration:Number.isFinite(video.duration)?video.duration:null,
 visibleDialogs:[...d.querySelectorAll('dialog[open]')].map(node=>node.id),
 displayedGold:d.querySelector('#gold')?.textContent,guideVisible:!d.querySelector('#coach')?.hidden,
 saveChanged:saved!==original,savedGold:parsed?.gold,savedTaps:parsed?.taps,savedSound:parsed?.sound,
 pendingReward:parsed?.offlineReward?{amount:parsed.offlineReward.amount,durationMs:parsed.offlineReward.durationMs}:null,
 viewport:[d.documentElement.clientWidth,d.documentElement.clientHeight],pageWidth:d.documentElement.scrollWidth};
 const text=JSON.stringify(details,null,2);if(evidence.textContent!==text)evidence.textContent=text;
},250);
</script></html>`;
export default {root,define:{__APP_VERSION__:JSON.stringify(version)},server:{host:'127.0.0.1',port:4205,strictPort:true},
  plugins:[{name:'opening-qa',configureServer(server){server.middlewares.use((req,res,next)=>{
    if(req.url!=='/__opening-check')return next();
    res.setHeader('Content-Type','text/html; charset=utf-8');res.end(page);
  });}}]};
