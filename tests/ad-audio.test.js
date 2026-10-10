import test from 'node:test';
import assert from 'node:assert/strict';
import {createPotionAd,createOfflineNativeAd} from '../src/potion-ad.js';
import {acceptAccess,AD_NOTICE_REVISION} from '../src/access-rules.js';
import {createMusicPlayer} from '../src/music.js';
import {createGameAudio} from '../src/audio.js';
import {readFileSync} from 'node:fs';

const consent=()=>({...acceptAccess({age:25,terms:true,privacy:true}),adsConsent:true,adNoticeRevision:AD_NOTICE_REVISION});
function musicFixture(){
  const media={paused:true,currentTime:32,starts:0,addEventListener(){},load(){},pause(){this.paused=true;},
    play(){this.paused=false;this.starts++;return Promise.resolve();}};
  const music=createMusicPlayer({createAudio:()=>media});
  music.configure({scene:'home',active:true,volume:0.4});
  return {media,music};
}
for(const [name,create,request] of [['potion',createPotionAd,{itemId:'red'}],['offline',createOfflineNativeAd,undefined]]){
  test(`${name} silences audio before native ad and releases it on every terminal result`,async()=>{
    for(const status of ['rewarded','cancelled','unavailable','throw']){
      const {media,music}=musicFixture();await Promise.resolve();let releases=0,holds=0;
      const show=create({native:()=>true,requireConsent:async()=>consent(),
        suspendAudio:async()=>{holds++;music.configure({active:false});return ()=>{releases++;music.configure({active:true});};},
        plugin:{configureAccess:async()=>({status:'ready'}),showRewarded:async()=>{
          assert.equal(media.paused,true,'music must stop before requesting the fullscreen ad');
          if(status==='throw')throw new Error('native failure');return {status};
        }}});
      if(status==='throw')await assert.rejects(show(request),/native failure/);else assert.equal((await show(request)).status,status);
      assert.equal(holds,1);assert.equal(releases,1);assert.equal(media.paused,false);
    }
  });
}
test('ad music hold resists ticks, unlocks and scene changes, preserves mute/background and nested holds',async()=>{
  const {media,music}=musicFixture();await Promise.resolve();media.currentTime=37;
  const release=music.suspend(),nested=music.suspend();
  for(let i=0;i<5;i++){music.configure({active:true,volume:0.4});music.unlock();}
  assert.equal(media.paused,true);assert.equal(media.starts,1);
  release();release();assert.equal(media.paused,true);
  nested();await Promise.resolve();assert.equal(media.paused,false);assert.equal(media.currentTime,37);
  const background=music.suspend();music.configure({active:false});background();assert.equal(media.paused,true);
  music.configure({active:true});await Promise.resolve();
  const muted=music.suspend();music.configure({volume:0,scene:'battle'});muted();assert.equal(media.paused,true);
});
test('game audio suspends its context and blocks effects/unlock through ad-time app resume',async()=>{
  let resumes=0,suspends=0,starts=0;
  const context={currentTime:0,state:'running',destination:{},resume:async()=>{resumes++;},suspend:async()=>{suspends++;},
    createGain:()=>({connect(){},disconnect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}}),
    createOscillator:()=>({connect(){},disconnect(){},frequency:{setValueAtTime(){}},start(){starts++;},stop(){}})};
  const {music,media}=musicFixture();await Promise.resolve();
  const audio=createGameAudio(()=>context,{music});audio.unlock();audio.tap(true);
  const release=await audio.suspendForAd(),before=resumes;
  audio.configure({enabled:true,active:true});music.configure({active:true});audio.unlock();audio.tap(true);music.unlock();
  assert.equal(suspends,1);assert.equal(resumes,before);assert.equal(starts,1);assert.equal(media.paused,true);
  release();audio.tap(true);assert.equal(starts,2);assert.equal(media.paused,false);
});
test('music stays held until earned ad returns to active session, with no hold on refusal',async()=>{
  const {music,media}=musicFixture();await Promise.resolve();
  const audio=createGameAudio(()=>{throw new Error('no SFX context should be created');},{music});
  let active=false,consented=true,holds=0;
  const show=createPotionAd({native:()=>true,isActive:()=>active,requireConsent:async()=>consented?consent():null,
    suspendAudio:()=>{holds++;return audio.suspendForAd();},
    plugin:{configureAccess:async()=>({status:'ready'}),showRewarded:async()=>{
      music.configure({active:true});music.unlock();assert.equal(media.paused,true);return {status:'rewarded'};
    }},delay:async()=>{assert.equal(media.paused,true);active=true;}});
  assert.equal((await show({itemId:'red'})).status,'rewarded');assert.equal(media.paused,false);
  consented=false;assert.equal((await show({itemId:'red'})).status,'cancelled');assert.equal(holds,1);
});
test('both production ad placements wire the shared audio suspension',()=>{
  const read=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
  assert.match(read('main.js'),/createOfflineNativeAd\(\{[^}]*suspendAudio:\(\)=>gameAudio\.suspendForAd\(\)/);
  assert.match(read('army-panels.js'),/createPotionAd\(\{[^}]*suspendAudio:\(\)=>audio\.suspendForAd\(\)/);
});
