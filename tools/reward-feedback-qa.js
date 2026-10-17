// In-memory UI fixture. No persistence, ad SDK, remote account or purchase bridge.
import '../src/style.css';
import '../src/field-world.css';
import '../src/hud.css';
import '../src/home-actions.css';
import '../src/battle.css';
import '../src/game-frame.css';
import '../src/home-menu.css';
import '../src/ui-theme.css';
import '../src/tap-feedback.css';
import '../src/offline-reward.css';
import '../src/touch.css';
import {homeMarkup,insignia} from '../src/home-view.js';
import {freshState} from '../src/state.js';
import {fmtGold} from '../src/format.js';
import {MAX_GOLD,addMoney,minMoney} from '../src/money.js';
import {createOfflineRewardUI} from '../src/offline-reward-ui.js';
import {claimOfflineReward} from '../src/offline-reward.js';
import {tapFeedback} from '../src/tap-feedback.js';
if(location.origin!=='http://127.0.0.1:4227')throw Error('QA origin only');
const q=s=>document.querySelector(s),state={...freshState(),gold:123456,soldiers:10};
q('#app').innerHTML=homeMarkup(state);
// Keep fixture controls in view so opening the modal does not scroll the home HUD away.
const controls=q('#qa-controls');controls.style.cssText='position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:min(100%,430px);box-sizing:border-box;z-index:10';
const style=document.createElement('style');style.textContent=`#app{height:844px;max-height:100dvh}.game{height:100%;width:100%;max-width:430px;margin:auto}#qa-controls{padding:12px;max-width:430px;margin:auto;background:#17262e;color:#f1efe5;font:12px/1.5 system-ui}#qa-controls button,#qa-controls select{min-height:44px;padding:6px 10px;margin:3px;border:1px solid #49616b;background:#304a56;color:#f1efe5}#tap-zone{height:100%}#field{background:linear-gradient(#61716a55,#1b2b3355)}.qa-hint{position:absolute;inset:40% 0 auto;text-align:center;color:#f1efe5;pointer-events:none;font:700 16px system-ui}`;document.head.append(style);
q('#rank-name').textContent='이등병';q('.rank-mark').innerHTML=insignia(0);
q('#passive-rate').textContent='100 G';q('#tap-rate').textContent='1,250 G';q('#next-rank').textContent='일등병 진급까지';q('#rank-progress').textContent='전력 10 남음';
q('#open-battle').hidden=false;
const hint=document.createElement('span');hint.className='qa-hint';hint.textContent='여기를 눌러 터치 반응 확인';q('.field-region').append(hint);
const gold=q('#gold');
function wallet(){gold.textContent=fmtGold(state.gold);gold.classList.toggle('large-balance',state.gold>=1000000);}
wallet();let id=1,ui;
const session={active:true,state,claimOffline(rewardId,multiplier){const result=claimOfflineReward(state,rewardId,multiplier);wallet();q('#qa-result').textContent=result.ok?'가짜 기록 지급 완료 · '+fmtGold(result.amount)+' G':'미지급';return result;}};
ui=createOfflineRewardUI(session,{showAd:async()=>({status:q('#qa-ad').value})});
function reward(gold=123456,amount=360000){state.gold=gold;state.offlineReward={id:id++,durationMs:3600000,amount};wallet();ui.sync();}
function tap(event={detail:0}){state.gold=minMoney(MAX_GOLD,addMoney(state.gold,1250));wallet();tapFeedback(q('.field-region'),gold,event,1250);}
q('#tap-zone').addEventListener('click',tap);
q('#qa-reward').onclick=()=>reward();q('#qa-capped').onclick=()=>reward(MAX_GOLD-150n,100);q('#qa-full').onclick=()=>reward(MAX_GOLD,100);
q('#qa-long').onclick=()=>{state.gold=MAX_GOLD-900000n;q('#rank-name').textContent='은하단 준장';wallet();};
q('#qa-burst').onclick=()=>{let n=0;const timer=setInterval(()=>{tap();if(++n===10)clearInterval(timer);},100);};
q('#qa-hold').onclick=()=>{tap();const a=gold.getAnimations().at(-1);if(a){a.pause();a.currentTime=0;}};
// Controls unrelated to the fixture intentionally do nothing.
