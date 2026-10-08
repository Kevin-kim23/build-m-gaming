import {isPotion,grantPotion,potionStatus,POTION_COUNT_LIMIT} from './potions.js';
import {usePotion} from './game.js';
import {reportError} from './diagnostics.js';

export function createPotionController(session,{showAd,onChange=()=>{},onError=reportError,now=Date.now}) {
  let busy=false;
  async function watch(id) {
    if(busy||!session.active||!isPotion(id))return {ok:false,reason:'unavailable'};
    if(potionStatus(session.state,id,now()).count>=POTION_COUNT_LIMIT)return {ok:false,reason:'limit'};
    busy=true;onChange();
    try {
      const result=await showAd({placement:'shop-potion',itemId:id});
      if(result?.status!=='rewarded')return {ok:false,reason:result?.status==='cancelled'?'cancelled':'unavailable'};
      return session.change(s=>grantPotion(s,id))??{ok:false,reason:'inactive'};
    } catch(error) {
      onError('potion.ad',error);return {ok:false,reason:'ad-error'};
    } finally {busy=false;onChange();}
  }
  function use(id) {
    if(busy)return {ok:false,reason:'busy'};
    return session.change(s=>usePotion(s,now(),id))??{ok:false,reason:'inactive'};
  }
  return {watch,use,get busy(){return busy;}};
}
