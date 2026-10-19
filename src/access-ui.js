import {ACCESS_KEY,createAccessStore,ageBand} from './access-rules.js';
import {privacyPolicyMarkup} from './privacy-policy.js';
import {serviceTermsMarkup,AD_DISCLOSURE} from './service-terms.js';
import {configureAdAccess,prepareAdPrivacy} from './potion-ad.js';
import {startConsentMarkup,adConsentMarkup,AGE_DETAILS} from './access-markup.js';
import {reportError} from './diagnostics.js';
import './access-ui.css';

export function createAccessUI({root=document,storage=localStorage,onExit=()=>{},onError=reportError}={}){
  const store=createAccessStore({storage,onError});
  let gate,adDialog,reader,gateResolve,adResolve;
  function make(id,title){
    const node=root.createElement('dialog');node.id=id;node.className='access-dialog';
    node.setAttribute('aria-labelledby',title);root.body.append(node);return node;
  }
  function read(content){
    reader??=make('access-reader','access-reader-title');
    reader.innerHTML=`<div class="access-head"><small>${content.kicker??'안내'}</small><h2 id="access-reader-title">${content.title}</h2></div><div class="access-body">${content.body}</div><div class="access-footer"><button class="access-primary" data-access-reader-close>돌아가기</button></div>`;
    reader.querySelector('[data-access-reader-close]').onclick=()=>reader.close();
    if(!reader.open)reader.showModal();reader.scrollTop=0;
  }
  function error(node,message){node.querySelector('[data-access-error]').textContent=message;}
  async function syncNative(){
    try{return await configureAdAccess(store.adsAllowed?store.record:null);}
    catch(e){onError('access.native',e);return {status:'unavailable'};}
  }
  function bindDocs(node){
    node.querySelector('[data-access-terms]')?.addEventListener('click',()=>read(serviceTermsMarkup()));
    node.querySelector('[data-access-policy]')?.addEventListener('click',()=>read(privacyPolicyMarkup()));
    node.querySelector('[data-access-age-details]')?.addEventListener('click',()=>read({title:'연령·기기 기록 안내',body:AGE_DETAILS}));
    node.querySelector('[data-access-ad-details]')?.addEventListener('click',()=>read({title:'광고 정보 처리 상세 안내',body:AD_DISCLOSURE}));
  }
  function showGate(){
    if(gateResolve)return;
    gate??=make('access-gate','access-title');
    gate.oncancel=event=>event.preventDefault();
    gate.innerHTML=startConsentMarkup();
    bindDocs(gate);
    gate.querySelector('[data-access-form]').oninput=()=>error(gate,'');
    gate.querySelector('[data-access-exit]').onclick=()=>onExit();
    gate.querySelector('[data-access-form]').onsubmit=event=>{
      event.preventDefault();
      const age=gate.querySelector('[name=age]').value,band=ageBand(age);
      if(!band)return error(gate,'만 나이를 0~120 사이의 정수로 입력해 주세요.');
      if(band==='under14')return error(gate,'만 14세 미만은 이번 테스트를 이용할 수 없습니다. 광고는 요청하지 않습니다.');
      const terms=gate.querySelector('[name=terms]').checked,privacy=gate.querySelector('[name=privacy]').checked;
      if(!terms||!privacy)return error(gate,'이용약관 동의와 개인정보 안내 확인이 필요합니다. 광고 동의는 선택입니다.');
      if(!store.accept({age,terms,privacy}))return error(gate,'선택을 저장하지 못했습니다. 저장 공간을 확인하고 다시 시도해 주세요.');
      gate.querySelector('[name=age]').value='';
      gate.close();const resolve=gateResolve;gateResolve=null;resolve?.(true);
    };
    if(!gate.open)gate.showModal();
  }
  async function ensureStart(){
    if(store.accepted){
      await syncNative();
      if(store.adsAllowed)prepareAdPrivacy().catch(e=>onError('ads.prepare',e));
      return true;
    }
    await syncNative();
    if(gateResolve)return false;
    showGate();
    return new Promise(resolve=>{gateResolve=resolve;});
  }
  function finishAd(value){const resolve=adResolve;adResolve=null;resolve?.(value);}
  function chooseAds(){
    if(!store.accepted)return Promise.resolve(null);
    if(adResolve)return Promise.resolve(null);
    if(!adDialog){
      adDialog=make('ad-choice-modal','ad-choice-title');
      adDialog.addEventListener('cancel',()=>finishAd(null));
      adDialog.addEventListener('close',()=>{if(!adDialog.open)finishAd(null);});
    }
    adDialog.innerHTML=adConsentMarkup();
    bindDocs(adDialog);
    const check=adDialog.querySelector('[data-ad-agree]'),enable=adDialog.querySelector('[data-ad-enable]');
    check.onchange=()=>{enable.disabled=!check.checked;};
    enable.onclick=async()=>{
      if(!check.checked||enable.disabled)return;
      enable.disabled=true;
      if(!store.setAds(true)){enable.disabled=false;return error(adDialog,'선택을 저장하지 못했습니다. 광고는 요청하지 않습니다.');}
      const result=await syncNative();
      if(result.status==='unavailable'){
        store.setAds(false);enable.disabled=false;return error(adDialog,'광고 설정을 적용하지 못했습니다. 다시 시도하거나 광고 없이 진행하세요.');
      }
      finishAd(store.record);adDialog.close();
    };
    adDialog.querySelector('[data-ad-disable]').onclick=async()=>{
      const saved=store.setAds(false);await syncNative();
      if(!saved){error(adDialog,'이번 실행에서는 광고를 껐지만 기기에 저장하지 못했습니다. 저장 공간을 확인해 주세요.');return;}
      finishAd(null);adDialog.close();
    };
    adDialog.querySelector('[data-ad-choice-cancel]').onclick=()=>{finishAd(null);adDialog.close();};
    adDialog.showModal();adDialog.scrollTop=0;
    return new Promise(resolve=>{adResolve=resolve;});
  }
  window.addEventListener('storage',event=>{
    if(event.key===ACCESS_KEY||event.key===null){store.receive(event.newValue);syncNative();}
  });
  return {ensureStart,chooseAds,store,
    async ensureAds(){
      if(!store.accepted)return null;
      if(store.adsAllowed)return store.record;
      return chooseAds();
    },
    showTerms:()=>read(serviceTermsMarkup()),
  };
}
