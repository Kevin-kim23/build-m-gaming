import {Capacitor,registerPlugin} from '@capacitor/core';
import {reportError} from './diagnostics.js';
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
  onChange=()=>{},onError=reportError,delay=ms=>new Promise(r=>setTimeout(r,ms))}={}){
  let busy=false,info={configured:false,price:null},pendingReconcile=null;
  const notify=()=>onChange();
  async function apply(result){
    if(result?.status!=='synced'||result.verified!==true||typeof result.owned!=='boolean')
      return {ok:false,reason:['pending','cancelled'].includes(result?.status)?result.status:'unavailable'};
    pendingReconcile=result.owned;
    for(let i=0;!session.active&&i<50;i++)await delay(100);
    if(!session.active)return {ok:false,reason:'resume-required'};
    const change=session.change(s=>reconcilePlayAutoTap(s,pendingReconcile));
    if(change?.ok)pendingReconcile=null;
    return change??{ok:false,reason:'inactive'};
  }
  async function run(action){
    if(!native()||busy)return {ok:false,reason:'unavailable'};
    busy=true;notify();
    try{
      if(action==='prepare'){
        const result=await bridge.getProduct();
        info={configured:result?.configured===true,price:result?.status==='ready'&&typeof result.price==='string'?result.price:null};
        if(!info.configured)return {ok:false,reason:'unavailable'};
      }
      if(!info.configured)return {ok:false,reason:'unavailable'};
      if(action==='buy'&&(!session.active||session.state.homeAutoTap?.owned||!info.price))return {ok:false,reason:'unavailable'};
      const result=await (action==='buy'?bridge.purchase():bridge.restore());
      const changed=await apply(result);
      if(action==='buy'&&changed.ok&&result.owned!==true)return {ok:false,reason:'unavailable'};
      return changed;
    }catch{
      // Never pass SDK exceptions (which may contain identifiers) to diagnostics.
      onError('billing.operation',new Error('Play billing unavailable'));
      return {ok:false,reason:'unavailable'};
    }finally{busy=false;notify();}
  }
  return {prepare:()=>run('prepare'),buy:()=>run('buy'),restore:()=>run('restore'),
    get busy(){return busy;},get info(){return {...info};}};
}
