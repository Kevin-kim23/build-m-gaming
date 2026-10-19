import {freshState,SAVE_KEY} from '../src/state.js';
import {serializeSave} from '../src/money.js';
import {OPERATIVES,recruitOperative} from '../src/loot.js';
import {ACCESS_KEY,ACCESS_SCHEMA,TERMS_REVISION,ACCESS_POLICY_REVISION} from '../src/access-rules.js';
if(location.origin!=='http://127.0.0.1:4233')throw Error('Isolated loot QA origin required');
const frame=document.querySelector('iframe');
const reopen=document.createElement('button');reopen.textContent='현재 기록 다시 열기';document.querySelector('nav').append(reopen);
reopen.onclick=()=>{frame.src='/';};
for(const [label,width,height] of [['320×568',320,568],['390×780',390,780],['430×900',430,900]]){
 const button=document.createElement('button');button.textContent=label;document.querySelector('nav').append(button);
 button.onclick=()=>{frame.style.width=`${width}px`;frame.style.height=`${height}px`;frame.style.maxHeight='none';};
}
for(const amount of [105,0,1000000000]){
 const button=document.createElement('button');button.textContent=`승리 표시 ${amount}`;document.querySelector('nav').append(button);
 button.onclick=()=>{frame.src=`/tools/loot-result-qa.html?amount=${amount}`;};
}
document.querySelectorAll('[data-width]').forEach(b=>b.onclick=()=>frame.style.width=`min(${b.dataset.width}px,100%)`);
document.querySelectorAll('[data-fixture]').forEach(b=>b.onclick=async()=>{
 // Let the previous game finish saving before replacing synthetic QA data.
 const buttons=[...document.querySelectorAll('button')];buttons.forEach(button=>button.disabled=true);
 await new Promise(resolve=>{frame.addEventListener('load',resolve,{once:true});frame.src='about:blank';});
 const now=Date.now(),s=freshState(now);s.gold=50000;s.soldiers=2000;s.ncoSchoolLevel=1;s.sound=false;s.sfxVolume=0;s.musicVolume=0;
 s.campaignCleared=20;s.campaignStars.fill(3,0,20);s.equipment.artillery={level:3,count:1,deployed:true};
 if(b.dataset.fixture==='legacy'){s.version=42;delete s.loot;}
 else {s.loot.balance=20000;for(const o of OPERATIVES)recruitOperative(s,o.id,now);for(const p of Object.values(s.loot.operatives)){p.hiredAt-=10*86400000;p.settledAt=p.hiredAt;}}
 localStorage.setItem(SAVE_KEY,serializeSave(s));
 localStorage.setItem(ACCESS_KEY,JSON.stringify({schema:ACCESS_SCHEMA,ageBand:'adult',ageCheckedAt:now,termsRevision:TERMS_REVISION,policyRevision:ACCESS_POLICY_REVISION,acceptedAt:now,adsConsent:false,adNoticeRevision:0}));
 frame.src='/';
 buttons.forEach(button=>button.disabled=false);
});
