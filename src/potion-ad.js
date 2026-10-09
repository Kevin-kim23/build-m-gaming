import {Capacitor,registerPlugin} from '@capacitor/core';
import {isPotion} from './potions.js';
import {adsAllowed} from './access-rules.js';
const ads=registerPlugin('PotionAds');
// Native bridge contract is independent of the consent document revision.
const AD_ACCESS_PROTOCOL_REVISION=1;
export async function configureAdAccess(record,plugin=ads,native=()=>Capacitor.getPlatform()==='android'){
  if(!native())return {status:'unsupported'};
  return plugin.configureAccess({allowed:adsAllowed(record),ageBand:record?.ageBand??'unknown',revision:AD_ACCESS_PROTOCOL_REVISION});
}
export async function prepareAdPrivacy(){
  if(Capacitor.getPlatform()!=='android')return {status:'unsupported'};
  return ads.preparePrivacy();
}
// A fullscreen Android ad pauses the session; wait for its save lock on return.
export function createPotionAd({native=()=>Capacitor.getPlatform()==='android',plugin=ads,
  requireConsent=async()=>null,isActive=()=>true,delay=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}) {
  let busy=false;
  return async ({itemId})=>{
    if(!native()||busy||!isPotion(itemId))return {status:'unavailable'};
    busy=true;
    try {
      const record=await requireConsent();
      if(!adsAllowed(record))return {status:'cancelled'};
      const configured=await configureAdAccess(record,plugin,native);
      if(configured?.status!=='ready')return {status:'unavailable'};
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
