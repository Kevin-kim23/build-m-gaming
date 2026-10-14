import {Capacitor,registerPlugin} from '@capacitor/core';
import {reportError} from './diagnostics.js';
import {grantStarterPack,STARTER_PACK} from './starter-pack.js';
import {POTION_COUNT_LIMIT} from './potions.js';
const plugin=registerPlugin('PlayBilling');

// Tokens, signatures and purchase JSON stay in the native process, never in saves/logs.
export function reconcilePlayAutoTap(state,owned){
  if(typeof owned!=='boolean')return {ok:false,reason:'invalid'};
  if(state.homeAutoTap?.source==='test')return {ok:true,legacy:true};
  if(owned){
    const previous=state.homeAutoTap;
    state.homeAutoTap={owned:true,enabled:previous?.owned?previous.enabled:true,source:'play'};
  }else if(state.homeAutoTap?.source==='play')state.homeAutoTap={owned:false,enabled:false,source:null};
  return {ok:true};
}
export function createPlayBilling(session,{bridge=plugin,native=()=>Capacitor.getPlatform()==='android'&&Capacitor.isPluginAvailable('PlayBilling'),
  product='auto',lock={busy:false},onChange=()=>{},onError=reportError,delay=ms=>new Promise(r=>setTimeout(r,ms))}={}){
  let busy=false,info={configured:false,price:null},pendingReconcile=null;
  const notify=()=>onChange();
  async function apply(result){
    if(result?.status!=='synced'||result.verified!==true||typeof result.owned!=='boolean')
      return {ok:false,reason:['pending','cancelled'].includes(result?.status)?result.status:'unavailable'};
    pendingReconcile=result.owned;
    for(let i=0;!session.active&&i<50;i++)await delay(100);
    if(!session.active)return {ok:false,reason:'resume-required'};
    if(product==='starter'){
      if(!result.owned)return {ok:true}; // Never retract already spent consumable rewards.
      if(session.state.starterPack.source==='test')return {ok:false,reason:'legacy'};
      if(!session.state.starterPack.claimed){
        if(result.delivered===true)return {ok:false,reason:'recovery-required'};
        const grant=session.change(s=>grantStarterPack(s,'play'));
        if(!grant?.ok)return grant??{ok:false,reason:'inactive'};
      }
      // Persist all rewards and the one-time marker before telling Play delivery succeeded.
      if(session.flush?.()!==true)return {ok:false,reason:'save-failed'};
      const delivered=await bridge.completeDelivery({product});
      return delivered?.status==='synced'&&delivered.verified===true&&delivered.owned===true
        ?{ok:true}:{ok:false,reason:'unavailable'};
    }
    const change=session.change(s=>reconcilePlayAutoTap(s,pendingReconcile));
    if(change?.ok)pendingReconcile=null;
    return change??{ok:false,reason:'inactive'};
  }
  async function run(action){
    if(!['auto','starter'].includes(product)||!native()||lock.busy)return {ok:false,reason:'unavailable'};
    busy=true;lock.busy=true;notify();
    try{
      if(action==='prepare'){
        const result=await bridge.getProduct({product});
        info={configured:result?.configured===true,price:result?.status==='ready'&&typeof result.price==='string'?result.price:null};
        if(!info.configured)return {ok:false,reason:'unavailable'};
      }
      if(!info.configured)return {ok:false,reason:'unavailable'};
      const owned=product==='auto'?session.state.homeAutoTap?.owned:session.state.starterPack?.claimed;
      if(action==='buy'&&(!session.active||owned||!info.price))return {ok:false,reason:'unavailable'};
      if(action==='buy'&&product==='starter'&&['red','blue','max'].some(id=>session.state.potions[id].count>POTION_COUNT_LIMIT-STARTER_PACK[id]))return {ok:false,reason:'limit'};
      const result=await (action==='buy'?bridge.purchase({product}):bridge.restore({product}));
      const changed=await apply(result);
      if(action==='buy'&&changed.ok&&result.owned!==true)return {ok:false,reason:'unavailable'};
      return changed;
    }catch{
      // Never pass SDK exceptions (which may contain identifiers) to diagnostics.
      onError('billing.operation',new Error('Play billing unavailable'));
      return {ok:false,reason:'unavailable'};
    }finally{busy=false;lock.busy=false;notify();}
  }
  return {prepare:()=>run('prepare'),buy:()=>run('buy'),restore:()=>run('restore'),
    get busy(){return busy;},get info(){return {...info};}};
}
