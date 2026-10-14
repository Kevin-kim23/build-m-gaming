import {grantTestHomeAutoTap,toggleHomeAutoTap} from './home-auto-tap-rules.js';
import {grantTestStarterPack} from './starter-pack.js';
import {reportError} from './diagnostics.js';

export const STORE_TEST_GRANT=import.meta.env?.DEV===true;
// One pending purchase for both products, including the home quick action.
export function createStorePurchase(session,{showPurchase,allowTestGrant=STORE_TEST_GRANT,onChange=()=>{},onError=reportError}){
  let busy=false;
  async function buy(id){
    const grant=id==='auto'?grantTestHomeAutoTap:id==='starter'?grantTestStarterPack:null;
    const owned=id==='auto'?session.state.homeAutoTap?.owned:session.state.starterPack?.claimed;
    if(!grant||!allowTestGrant||busy||!session.active||owned)return {ok:false,reason:'unavailable'};
    busy=true;onChange();
    try{
      const result=await showPurchase(id);
      if(result?.status!=='granted'||result?.source!=='test')return {ok:false,reason:'cancelled'};
      if(!session.active)return {ok:false,reason:'inactive'};
      return session.change(grant)??{ok:false,reason:'inactive'};
    }catch(error){onError('store.purchase',error);return {ok:false,reason:'error'};}
    finally{busy=false;onChange();}
  }
  return {buy,toggle:()=>busy?{ok:false,reason:'busy'}:session.change(toggleHomeAutoTap),get busy(){return busy;}};
}
