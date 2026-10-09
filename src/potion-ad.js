import {Capacitor,registerPlugin} from '@capacitor/core';
import {isPotion} from './potions.js';
const ads=registerPlugin('PotionAds');
// A fullscreen Android ad pauses the session; wait for its save lock on return.
export function createPotionAd({native=()=>Capacitor.getPlatform()==='android',plugin=ads,
  isActive=()=>true,delay=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}) {
  let busy=false;
  return async ({itemId})=>{
    if(!native()||busy||!isPotion(itemId))return {status:'unavailable'};
    busy=true;
    try {
      const result=await plugin.showRewarded({itemId});
      if(result?.status!=='rewarded')return {status:result?.status==='cancelled'?'cancelled':'unavailable'};
      for(let i=0;!isActive()&&i<100;i++)await delay(100);
      return {status:isActive()?'rewarded':'unavailable'};
    } finally {busy=false;}
  };
}
export async function showAdPrivacyOptions(){
  if(Capacitor.getPlatform()!=='android')return {status:'unsupported'};
  return ads.showPrivacyOptions();
}
