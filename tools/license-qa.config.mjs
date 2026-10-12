import {fileURLToPath} from 'node:url';
const page=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>라이선스·복귀 보상 검증</title><body><p>4197 검증 전용 · 실제 게임 저장과 분리</p><button id="info">게임 정보</button><button id="offline">복귀 보상</button><button id="review-save" hidden></button><div id="save-notice" hidden><span data-save-notice-title></span></div><script type="module">
import '/src/style.css';import '/src/detail.css';import '/src/touch.css';import '/src/offline-reward.css';
import {createInfoPanel} from '/src/info-ui.js';import {createOfflineRewardUI} from '/src/offline-reward-ui.js';
import {createGameSession} from '/src/session.js';import {freshState,SAVE_KEY} from '/src/state.js';import {serializeSave} from '/src/money.js';
const now=Date.now(),data=new Map([[SAVE_KEY,serializeSave({...freshState(now-3600000),soldiers:3})]]);
const session=createGameSession({storage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},now:()=>now,setTimer:()=>1,clearTimer:()=>{}});session.start();
const info=createInfoPanel(session),offline=createOfflineRewardUI(session,{showAd:async()=>({status:'unavailable'})});
document.querySelector('#info').onclick=info.show;document.querySelector('#offline').onclick=offline.sync;info.show();
</script></body></html>`;
export default {root:fileURLToPath(new URL('../',import.meta.url)),define:{__APP_VERSION__:JSON.stringify('QA')},server:{host:'127.0.0.1',port:4197,strictPort:true},plugins:[{name:'license-qa',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url!=='/__licenses')return next();res.setHeader('Content-Type','text/html; charset=utf-8');res.end(page);});}}]};
