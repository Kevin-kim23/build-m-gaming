import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ageBand,acceptAccess,accessAccepted,adsAllowed,createAccessStore,parseAccess,ACCESS_KEY,AGE_RECHECK_MS,AD_NOTICE_REVISION} from '../src/access-rules.js';
import {createPotionAd,configureAdAccess} from '../src/potion-ad.js';
import {SAVE_KEY,freshState} from '../src/state.js';
import {serializeSave} from '../src/money.js';
import {parseSave} from '../src/save.js';
import {privacyPolicyMarkdown,POLICY_REVISION} from '../src/privacy-policy.js';
const T=Date.now();
const accepted=(age=14)=>acceptAccess({age,terms:true,privacy:true},T);
const consent=(age=14)=>({...accepted(age),adsConsent:true,adNoticeRevision:AD_NOTICE_REVISION});
test('age boundaries and required acknowledgement fail closed without retaining exact age',()=>{
  for(const v of ['',null,undefined,'14.5','1e2','-1',121,' 14','abc'])assert.equal(ageBand(v),null);
  assert.equal(ageBand(13),'under14');assert.equal(ageBand(14),'teen');assert.equal(ageBand(18),'teen');assert.equal(ageBand(19),'adult');
  assert.equal(acceptAccess({age:13,terms:true,privacy:true},T),null);
  assert.equal(acceptAccess({age:19,terms:false,privacy:true},T),null);
  assert.equal(acceptAccess({age:19,terms:true,privacy:false},T),null);
  const v=accepted(17);assert.equal(v.ageBand,'teen');assert.equal('age' in v,false);assert.equal('birthDate' in v,false);
  assert.equal(accessAccepted(v,T),true);assert.equal(adsAllowed(v,T),false);assert.equal(v.policyRevision,POLICY_REVISION);
  assert.equal(accessAccepted(v,T+AGE_RECHECK_MS),false);assert.equal(accessAccepted(v,T-1),false);
  assert.equal(accessAccepted({...v,termsRevision:0},T),false);
});
test('preferences upgrade old players without rewriting the army save, consent revokes and malformed records deny',()=>{
  const original=serializeSave({...freshState(T),gold:1000000000000000000n,soldiers:41});
  const data=new Map([[SAVE_KEY,original]]),writes=[];
  const storage={getItem:k=>data.get(k),setItem:(k,v)=>{writes.push(k);data.set(k,v);}};
  const store=createAccessStore({storage,now:()=>T});
  assert.equal(store.accepted,false);assert.equal(store.setAds(true),false);
  assert.equal(store.accept({age:18,terms:true,privacy:true}),true);
  assert.equal(store.adsAllowed,false);assert.equal(store.setAds(true),true);assert.equal(store.adsAllowed,true);
  const restored=createAccessStore({storage,now:()=>T});assert.equal(restored.adsAllowed,true);
  assert.equal(restored.setAds(false),true);assert.equal(restored.adsAllowed,false);
  assert.equal(data.get(SAVE_KEY),original);assert.equal(parseSave(original,T).gold,1000000000000000000n);
  assert.ok(writes.every(k=>k===ACCESS_KEY));
  for(const raw of ['bad','{}','null','{"schema":2}',JSON.stringify({...consent(),ageBand:'unknown'})]){
    store.receive(raw);assert.equal(store.adsAllowed,false);
  }
  assert.equal(parseAccess(JSON.stringify({...consent(),age:18})).age,undefined);
});
test('storage failures revoke in memory and cannot silently accept',()=>{
  let fail=false;const errors=[];
  const store=createAccessStore({storage:{getItem:()=>JSON.stringify(consent()),setItem:()=>{if(fail)throw Error('quota');}},now:()=>T,onError:(...args)=>errors.push(args)});
  assert.equal(store.adsAllowed,true);fail=true;
  assert.equal(store.setAds(false),false);assert.equal(store.adsAllowed,false);
  assert.equal(store.accept({age:19,terms:true,privacy:true}),false);assert.equal(store.accepted,false);assert.equal(errors.length,2);
});

test('the previous policy acknowledgement requires review without changing game progress',()=>{
  const original=serializeSave({...freshState(T),gold:1000000000000000000n,soldiers:41});
  const oldRecord={...consent(),policyRevision:5};
  const data=new Map([[SAVE_KEY,original],[ACCESS_KEY,JSON.stringify(oldRecord)]]);
  const store=createAccessStore({storage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},now:()=>T});
  assert.equal(store.accepted,false);assert.equal(store.adsAllowed,false);
  assert.equal(store.setAds(true),false);
  assert.equal(store.accept({age:14,terms:true,privacy:true}),true);
  assert.equal(store.adsAllowed,false);
  assert.equal(store.setAds(true),true);assert.equal(store.adsAllowed,true);
  assert.equal(data.get(SAVE_KEY),original);
});
test('no native calls before separate consent, malformed/stale/underage choice blocks requests',async()=>{
  let calls=0;
  const plugin={configureAccess:async()=>{calls++;return {status:'ready'};},showRewarded:async()=>{calls++;return {status:'rewarded'};}};
  for(const record of [null,accepted(),{...consent(),ageBand:'under14'},{...consent(),adNoticeRevision:0},{...consent(),ageCheckedAt:T-AGE_RECHECK_MS}]){
    const show=createPotionAd({native:()=>true,plugin,requireConsent:async()=>record});
    assert.equal((await show({itemId:'red'})).status,'cancelled');
  }
  assert.equal(calls,0);
  let configured;
  for(const age of [14,18,19]){
    const show=createPotionAd({native:()=>true,plugin:{...plugin,configureAccess:async v=>{configured=v;return {status:'ready'};}},requireConsent:async()=>consent(age)});
    assert.equal((await show({itemId:'red'})).status,'rewarded');assert.equal(configured.ageBand,age<19?'teen':'adult');assert.equal(configured.revision,1,'native bridge protocol must not change with consent notice revision');
  }
  await configureAdAccess(null,{configureAccess:async v=>{assert.equal(v.allowed,false);assert.equal(v.ageBand,'unknown');}},()=>true);
});
test('native release boundary denies missing consent and applies both UMP and ad restrictions before initialization',()=>{
  const java=readFileSync(new URL('../android/app/src/main/java/com/dongramco/budaekiugi/PotionAdsPlugin.java',import.meta.url),'utf8');
  assert.match(java,/accessAllowed = false/);assert.match(java,/if \(!accessAllowed \|\| pending/);
  assert.match(java,/setTagForUnderAgeOfConsent\(teen\)/);
  assert.match(java,/PublisherPrivacyPersonalizationState.DISABLED/);assert.match(java,/MAX_AD_CONTENT_RATING_G/);
  assert.match(java,/extras.putString\("npa", "1"\)/);
  assert.ok(java.indexOf('applyAdRestrictions();')<java.indexOf('MobileAds.initialize'));
  const policy=privacyPolicyMarkdown();assert.match(policy,/만 14세/);assert.match(policy,/생년월일/);assert.match(policy,/철회/);
});
