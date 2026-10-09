import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createOfflineNativeAd} from '../src/potion-ad.js';
import {acceptAccess,AD_NOTICE_REVISION} from '../src/access-rules.js';
import {createGameSession} from '../src/session.js';
import {freshState,SAVE_KEY} from '../src/state.js';
import {serializeSave} from '../src/money.js';
import {createOfflineRewardController} from '../src/offline-reward-controller.js';

const T=1800000000000;
const consent=()=>({...acceptAccess({age:25,terms:true,privacy:true}),adsConsent:true,adNoticeRevision:AD_NOTICE_REVISION});
test('offline ad uses consent and native earned reward, waits for resume, persists double only once',async()=>{
  const data=new Map([[SAVE_KEY,serializeSave({...freshState(T-3600000),soldiers:3})]]);
  const session=createGameSession({storage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},now:()=>T,setTimer:()=>1,clearTimer:()=>{}});
  session.start();let calls=0;
  const showAd=createOfflineNativeAd({native:()=>true,requireConsent:async()=>consent(),isActive:()=>session.active,
    plugin:{configureAccess:async()=>({status:'ready'}),showRewarded:async request=>{
      calls++;assert.deepEqual(request,{itemId:'offline-income'});session.pause();return {status:'rewarded'};
    }},delay:async()=>session.start()});
  const controller=createOfflineRewardController(session,{showAd});
  assert.equal((await controller.double()).amount,21600);
  assert.equal(session.state.gold,21600);assert.equal(session.state.offlineReward,null);
  assert.equal((await controller.double()).ok,false);assert.equal(calls,1);session.pause();
});
test('offline native adapter blocks consent refusal, web and non-earned results',async()=>{
  let calls=0;const plugin={configureAccess:async()=>({status:'ready'}),showRewarded:async()=>{calls++;return {status:'cancelled'};}};
  assert.notEqual((await createOfflineNativeAd({native:()=>false,plugin,requireConsent:async()=>consent()})()).status,'rewarded');
  assert.equal((await createOfflineNativeAd({native:()=>true,plugin,requireConsent:async()=>null})()).status,'cancelled');
  assert.equal(calls,0);
  assert.equal((await createOfflineNativeAd({native:()=>true,plugin,requireConsent:async()=>consent()})()).status,'cancelled');
});

// Catch the original integration regression: UI silently fell back to the dev-only adapter.
test('production entrypoint and Android bridge both accept the offline placement',()=>{
  const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
  assert.match(read('src/main.js'),/createOfflineRewardUI\(session,\{showAd:createOfflineNativeAd\(/);
  assert.match(read('android/app/src/main/java/com/dongramco/budaekiugi/PotionAdsPlugin.java'),/item\.equals\("offline-income"\)/);
});
