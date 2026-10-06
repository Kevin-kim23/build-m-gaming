import test from 'node:test';
import assert from 'node:assert/strict';
import { SFX_IDS, AUDIO_IDS, audioUrl, battleSound } from '../src/audio-catalog.js';
import { AUDIO_PLAN } from '../tools/audio-plan.mjs';
import { EQUIPMENT } from '../src/equipment.js';
import { createBattleAudioEvents } from '../src/battle-audio-events.js';
import { createSoundPlayer } from '../src/sound-player.js';
import { createGameAudio } from '../src/audio.js';

test('every equipment has its own action and deployment sounds; production and runtime agree',()=>{
  assert.equal(SFX_IDS.length,40);
  assert.equal(AUDIO_IDS.size,40);
  assert.deepEqual(new Set(AUDIO_PLAN.map(a=>a.id)),AUDIO_IDS);
  for(const id of Object.keys(EQUIPMENT)) {
    assert.ok(SFX_IDS.includes(battleSound('shot',id)));
    assert.ok(SFX_IDS.includes(battleSound('deploy',id)));
  }
  assert.equal(battleSound('heal','transport'),'transport-action');
  assert.equal(battleSound('strike','icbm'),'icbm-action');
  assert.equal(audioUrl('../bad'),null);
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
  return {context,fetchAudio,player:createSoundPlayer({getContext:()=>context,fetchAudio,now:()=>time,onError:(...e)=>errors.push(e),maxVoices:3}),
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

test('sound assets contain effects only and retired background tracks cannot be resolved',()=>{
  assert.ok(AUDIO_PLAN.every(item=>item.type==='sfx'));
  for(const id of AUDIO_IDS) assert.equal(audioUrl(id),`./audio/sfx/${id}.mp3`);
  for(const id of ['home','map','serdin-early','norgard-capital']) assert.equal(audioUrl(id),null);
});

test('game effects survive pause/resume, mute and backgrounding without late or repeated loading',async()=>{
  const f=soundFixture(),requests=[];
  const audio=createGameAudio(()=>f.context,{generated:true,effects:{
    fetchAudio:url=>{requests.push(url);return f.fetchAudio();}, now:()=>1000,
  }});
  const ready=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
  audio.configure({enabled:true,active:true});audio.unlock();audio.prepareBattle();await ready();
  assert.equal(requests.length,40);assert.ok(requests.every(url=>url.startsWith('./audio/sfx/')));
  audio.tap(true);audio.battle('shot',true,'tank');assert.equal(f.nodes.length,2);
  audio.stop();assert.ok(f.nodes.every(node=>node.stopped&&node.disconnected));
  audio.battle('shot',true,'tank');assert.equal(f.nodes.length,3,'new action after resume plays');
  audio.configure({enabled:false,active:true});audio.tap(false);audio.unlock();
  assert.equal(f.nodes.length,3);assert.ok(f.nodes.every(node=>node.disconnected));
  audio.configure({enabled:true,active:false});audio.battle('shot',true,'tank');audio.unlock();
  assert.equal(f.nodes.length,3);
  audio.configure({enabled:true,active:true});audio.unlock();audio.prepareBattle();audio.tap(true);
  assert.equal(f.nodes.length,4);assert.equal(requests.length,40,'cached effects reused after resume');
  audio.stop();
});
