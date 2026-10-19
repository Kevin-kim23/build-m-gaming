import {freshState,SAVE_KEY} from '../src/state.js';
import {serializeSave,MAX_GOLD} from '../src/money.js';
import {parseSave} from '../src/save.js';
import {recruitOffer} from '../src/game.js';
import {ACCESS_KEY,ACCESS_SCHEMA,TERMS_REVISION,ACCESS_POLICY_REVISION} from '../src/access-rules.js';
if(location.origin!=='http://127.0.0.1:4233')throw Error('Isolated panel QA origin required');
const frame=document.querySelector('iframe'),result=document.querySelector('#result');
let lastAction=null;
frame.addEventListener('load',()=>{
  frame.contentDocument?.addEventListener('click',event=>{
    const button=event.target.closest('button'),panel=dialog();
    if(!button||!panel?.contains(button))return;
    const before=panel.scrollTop;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      lastAction={label:button.getAttribute('aria-label')??button.textContent,before,after:panel.scrollTop};measure();
    }));
  },true);
});
document.querySelector('#reopen').onclick=()=>frame.src='/';
document.querySelectorAll('[data-size]').forEach(button=>button.onclick=()=>{
  const [width,height]=button.dataset.size.split(',');frame.style.width=width+'px';frame.style.height=height+'px';
});
const dialog=()=>frame.contentDocument?.querySelector('#modal');
const measure=()=>{
  const panel=dialog();if(!panel)return;
  const head=panel.querySelector('.panel-sticky-head'),wallet=panel.querySelector('.shop-wallet');
  const rect=node=>node?Object.fromEntries(['top','bottom','width','height'].map(key=>[key,Math.round(node.getBoundingClientRect()[key]*100)/100])):null;
  result.textContent=JSON.stringify({title:panel.querySelector('h2')?.textContent,scrollTop:panel.scrollTop,viewport:rect(panel),head:rect(head),wallet:rect(wallet),overflow:panel.scrollWidth>panel.clientWidth,gold:wallet?.textContent.trim(),progress:panel.querySelector('[data-recruit-promotion]')?.textContent.trim(),bulk:[...panel.querySelectorAll('[data-buy-bulk]')].slice(0,4).map(b=>({id:b.dataset.buyBulk,disabled:b.disabled,color:frame.contentWindow.getComputedStyle(b).backgroundColor})),lastAction},null,2);
};
document.querySelector('#measure').onclick=measure;
document.querySelectorAll('[data-scroll]').forEach(button=>button.onclick=()=>{if(dialog())dialog().scrollTop+=Number(button.dataset.scroll);measure();});
document.querySelector('#top').onclick=()=>{if(dialog())dialog().scrollTop=0;measure();};
document.querySelectorAll('[data-fixture]').forEach(button=>button.onclick=async()=>{
  const buttons=[...document.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
  await new Promise(resolve=>{frame.addEventListener('load',resolve,{once:true});frame.src='about:blank';});
  const now=Date.now(),s=freshState(now),kind=button.dataset.fixture;
  s.soldiers=kind==='first'?3:kind==='guide'?20:6000;s.gold=kind==='poor'?0:kind==='guide'?600000:MAX_GOLD;
  s.sound=false;s.musicVolume=0;s.sfxVolume=0;
  if(['colonel','poor','boundary'].includes(kind)){
    s.ncoSchoolLevel=4;
    s.equipment.artillery={level:3,count:1,deployed:true};s.equipment.tank={level:1,count:1,deployed:true};
    s.facilities=['kitchen','futsal'];s.facilityLevels={kitchen:1,futsal:1};
  }
  if(kind==='boundary')s.gold=recruitOffer(s,'administrator',100).cost;
  const serialized=serializeSave(s);
  if(!parseSave(serialized,now))throw Error('Invalid synthetic fixture');
  localStorage.setItem(SAVE_KEY,serialized);
  localStorage.setItem('budae-kiugi-ui-guide-off',kind==='guide'?'0':'1');
  localStorage.setItem(ACCESS_KEY,JSON.stringify({schema:ACCESS_SCHEMA,ageBand:'adult',ageCheckedAt:now,termsRevision:TERMS_REVISION,policyRevision:ACCESS_POLICY_REVISION,acceptedAt:now,adsConsent:false,adNoticeRevision:0}));
  result.textContent='합성 기록 준비 완료';frame.src='/';buttons.forEach(b=>b.disabled=false);
});
