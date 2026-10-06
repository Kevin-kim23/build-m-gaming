import test from 'node:test';
import assert from 'node:assert/strict';
import { MUSIC_IDS, SFX_IDS, AUDIO_IDS, audioUrl, musicForScene, battleSound } from '../src/audio-catalog.js';
import { AUDIO_PLAN } from '../tools/audio-plan.mjs';
import { EQUIPMENT } from '../src/equipment.js';
import { createBattleAudioEvents } from '../src/battle-audio-events.js';
import { createSoundPlayer } from '../src/sound-player.js';
import { createMusicPlayer } from '../src/music-player.js';

test('every equipment has its own action and deployment sounds; production and runtime agree',()=>{
  assert.equal(MUSIC_IDS.length,18);assert.equal(SFX_IDS.length,40);
  assert.equal(AUDIO_IDS.size,58);
  assert.deepEqual(new Set(AUDIO_PLAN.map(a=>a.id)),AUDIO_IDS);
  for(const id of Object.keys(EQUIPMENT)) {
    assert.ok(SFX_IDS.includes(battleSound('shot',id)));
    assert.ok(SFX_IDS.includes(battleSound('deploy',id)));
  }
  assert.equal(battleSound('heal','transport'),'transport-action');
  assert.equal(battleSound('strike','icbm'),'icbm-action');
  assert.equal(audioUrl('../bad'),null);
});
test('all 80 regions choose the correct nation, progression and a distinct capital track',()=>{
  const nations=['serdin','veloc','istra','norgard'];
  for(let id=1;id<=80;id++) {
    const local=(id-1)%20+1,phase=local===20?'capital':local<=6?'early':local<=13?'middle':'late';
    assert.equal(musicForScene('battle',id),`${nations[Math.floor((id-1)/20)]}-${phase}`);
  }
  for(const id of [0,81,NaN,1.5,'1'])assert.equal(musicForScene('battle',id),'home');
  assert.equal(musicForScene('map'),'map');
});
test('a new deployment at an already painted instant is heard exactly once, including time zero',()=>{
  const tracker=createBattleAudioEvents(),first={at:0,kind:'spawn'},sameTime={at:0,kind:'strike'};
  assert.deepEqual(tracker.take([]),[]);
  assert.deepEqual(tracker.take([first]),[first]);
  assert.deepEqual(tracker.take([first,sameTime]),[sameTime]);
  assert.deepEqual(tracker.take([first,sameTime]),[]);
  tracker.reset();assert.deepEqual(tracker.take([first]),[first]);
});
function soundFixture({deferred=false}={}) {
  let time=1000,fetches=0,decodes=0,resolveFetch;const nodes=[],errors=[];
  const context={destination:{},decodeAudioData:async()=>{decodes++;return {duration:1};},
    createGain:()=>({gain:{value:0},connect(){},disconnect(){this.disconnected=true;}}),
    createBufferSource(){const n={playbackRate:{value:1},connect(){},start(){this.started=true;},stop(){this.stopped=true;},disconnect(){this.disconnected=true;}};nodes.push(n);return n;}};
  const response={ok:true,arrayBuffer:async()=>new ArrayBuffer(4)};
  const fetchAudio=()=>{fetches++;return deferred?new Promise(resolve=>{resolveFetch=()=>resolve(response);}):Promise.resolve(response);};
  return {player:createSoundPlayer({getContext:()=>context,fetchAudio,now:()=>time,onError:(...e)=>errors.push(e),maxVoices:3}),
    nodes,errors,resolve:()=>resolveFetch(),advance:()=>{time+=500;},counts:()=>({fetches,decodes})};
}
test('sample cache loads once, enforces voice cap and releases nodes on end and stop',async()=>{
  const f=soundFixture();await Promise.all([f.player.preload('tank-action'),f.player.preload('tank-action')]);
  assert.deepEqual(f.counts(),{fetches:1,decodes:1});
  for(let i=0;i<9;i++){f.player.play('tank-action');f.advance();}
  assert.equal(f.nodes.length,3);assert.equal(f.player.activeVoices,3);
  f.nodes[0].onended();assert.ok(f.nodes[0].disconnected);assert.equal(f.player.activeVoices,2);
  f.player.play('tank-action');assert.equal(f.player.activeVoices,3);
  f.player.stop();assert.equal(f.player.activeVoices,0);assert.ok(f.nodes.every(n=>n.disconnected));assert.deepEqual(f.errors,[]);
});
test('muting while a sample loads cannot play the old action later',async()=>{
  const f=soundFixture({deferred:true});
  assert.equal(f.player.play('tap'),'loading');
  f.player.suspend(true);f.resolve();await f.player.preload('tap');
  assert.equal(f.nodes.length,0);assert.equal(f.player.play('tap'),'ignored');
  f.player.suspend(false);assert.equal(f.player.play('tap'),'played');
  assert.deepEqual(f.counts(),{fetches:1,decodes:1});
});
test('missing samples produce one diagnostic, not a fetch on every tap',async()=>{
  let calls=0,errors=0;const player=createSoundPlayer({fetchAudio:async()=>{calls++;return {ok:false,status:404};},onError:()=>errors++});
  await player.preload('tap');await player.preload('tap');player.play('tap');
  assert.equal(calls,1);assert.equal(errors,1);
});
function musicFixture({reject=false}={}) {
  let time=0,made=0;const timers=new Map(),errors=[],plays=[];let serial=0;
  const media={paused:true,volume:1,src:'',pause(){this.paused=true;},play(){plays.push(this.src);if(reject){const e=new Error('gesture');e.name='NotAllowedError';return Promise.reject(e);}this.paused=false;return Promise.resolve();}};
  const player=createMusicPlayer({createMedia:()=>{made++;return media;},now:()=>time,setTimer:(fn,delay)=>{const key=++serial;timers.set(key,{fn,at:time+delay});return key;},clearTimer:id=>timers.delete(id),onError:(...e)=>errors.push(e)});
  return {player,media,plays,errors,timers,made:()=>made,async advance(ms){time+=ms;const due=[...timers].filter(([,t])=>t.at<=time);for(const [id,t]of due){timers.delete(id);t.fn();}await Promise.resolve();}};
}
test('BGM waits for a gesture, uses one element, switches scenes and stops when inactive',async()=>{
  const f=musicFixture();f.player.configure({enabled:true,active:true});assert.equal(f.made(),0);
  f.player.unlock();await f.advance(500);assert.equal(f.made(),1);assert.equal(f.media.paused,false);
  for(let i=0;i<100;i++){f.player.configure({enabled:true,active:true});f.player.scene('home');f.player.unlock();}
  assert.equal(f.plays.length,1);
  f.player.scene('serdin-capital');await f.advance(500);assert.equal(f.plays.at(-1),'./audio/music/serdin-capital.mp3');assert.equal(f.made(),1);
  f.player.pause(true);assert.equal(f.media.paused,true);
  f.player.pause(false);await f.advance(500);assert.equal(f.media.paused,false);
  f.player.configure({enabled:true,active:false});await f.advance(2000);assert.equal(f.media.paused,true);assert.equal(f.timers.size,0);
  f.player.configure({enabled:false,active:true});f.player.unlock();assert.equal(f.media.paused,true);
});
test('autoplay rejection is recoverable and does not create repeated errors or start while muted',async()=>{
  const f=musicFixture({reject:true});f.player.configure({enabled:true,active:true});f.player.unlock();await f.advance(1000);await Promise.resolve();
  f.player.configure({enabled:true,active:true});assert.equal(f.plays.length,1);assert.deepEqual(f.errors,[]);
  f.player.configure({enabled:false,active:true});f.player.unlock();assert.equal(f.plays.length,1);
});
test('rapid scene switches and a stop invalidate pending fades',async()=>{
  const f=musicFixture();f.player.configure({enabled:true,active:true});f.player.unlock();
  f.player.scene('serdin-early');f.player.scene('norgard-capital');f.player.configure({enabled:false,active:true});
  await f.advance(1000);assert.equal(f.media.paused,true);assert.equal(f.timers.size,0);
});

test('a missing BGM is reported once and is not retried on every home tap',async()=>{
  let plays=0;const errors=[];
  const media={paused:true,pause(){this.paused=true;},play(){plays++;return Promise.reject(new Error('missing file'));}};
  const player=createMusicPlayer({createMedia:()=>media,onError:(...error)=>errors.push(error)});
  player.configure({enabled:true,active:true});player.unlock();
  await Promise.resolve();await Promise.resolve();
  for(let i=0;i<50;i++){player.unlock();await Promise.resolve();await Promise.resolve();}
  assert.equal(plays,1);assert.equal(errors.length,1);
  player.scene('map');await Promise.resolve();await Promise.resolve();
  assert.equal(plays,2);assert.equal(errors.length,2);
});

test('returning to a failed track stops the previous scene music',async()=>{
  const media={paused:true,pause(){this.paused=true;},play(){
    if(this.src.endsWith('/home.mp3'))return Promise.reject(new Error('missing'));
    this.paused=false;return Promise.resolve();
  }};
  const player=createMusicPlayer({createMedia:()=>media,onError:()=>{}});
  player.configure({enabled:true,active:true});player.unlock();
  await Promise.resolve();await Promise.resolve();
  player.scene('map');await Promise.resolve();assert.equal(media.paused,false);
  player.scene('home');assert.equal(media.paused,true);
  player.stop();
});
