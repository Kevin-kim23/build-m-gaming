import {POTIONS,isPotion} from './potions.js';
// Explicit prototype adapter for web and APK. Replace this adapter with the SDK's
// reward-earned callback before real ads launch; closing an ad is not a reward.
export function createPotionTestAd(root=document) {
  let dialog=null,pending=null;
  function finish(status) {
    const resolve=pending;pending=null;
    resolve?.({status,test:true});
  }
  return ({itemId})=>{
    if(!isPotion(itemId) || pending)return Promise.resolve({status:'unavailable'});
    if(!dialog){
      dialog=root.createElement('dialog');dialog.id='potion-ad-modal';
      dialog.setAttribute('aria-labelledby','potion-ad-title');
      dialog.innerHTML='<h2 id="potion-ad-title">광고 테스트</h2><p>광고는 본 걸로 칩니다.<br>나중엔 광고가 나와요.</p><strong data-potion-ad-reward></strong><button type="button" data-potion-ad-confirm>확인 · 1개 받기</button>';
      dialog.querySelector('[data-potion-ad-confirm]').addEventListener('click',()=>{finish('rewarded');dialog.close();});
      dialog.addEventListener('close',()=>{if(!dialog.open)finish('cancelled');});
      root.body.append(dialog);
    }
    dialog.querySelector('[data-potion-ad-reward]').textContent=POTIONS[itemId].name+' 1개';
    return new Promise(resolve=>{pending=resolve;try{dialog.showModal();}catch(error){pending=null;throw error;}});
  };
}
