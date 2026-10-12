import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattleAudioEvents } from '../src/battle-audio-events.js';
import { createGameAudio } from '../src/audio.js';

test('a new deployment at an already painted instant is heard exactly once, including time zero',()=>{
  const tracker=createBattleAudioEvents(),first={at:0,kind:'spawn'},sameTime={at:0,kind:'strike'};
  assert.deepEqual(tracker.take([]),[]);
  assert.deepEqual(tracker.take([first]),[first]);
  assert.deepEqual(tracker.take([first,sameTime]),[sameTime]);
  assert.deepEqual(tracker.take([first,sameTime]),[]);
  tracker.reset();assert.deepEqual(tracker.take([first]),[first]);
});
test('synthesized effects stop on mute/background and resume only for new actions',()=>{
  let starts=0,stops=0;
  const context={currentTime:0,state:'running',destination:{},resume:async()=>{},
    createGain:()=>({connect(){},disconnect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}}),
    createOscillator:()=>({connect(){},disconnect(){},frequency:{setValueAtTime(){}},start(){starts++;},stop(){stops++;}})};
  const audio=createGameAudio(()=>context);
  audio.configure({enabled:true,active:true});audio.tap(true);assert.equal(starts,1);
  audio.configure({enabled:false,active:true});assert.ok(stops>=2);
  audio.tap(true);assert.equal(starts,1,'muted even if caller passes true');
  audio.configure({enabled:true,active:false});audio.battle('shot',true);assert.equal(starts,1);
  audio.configure({enabled:true,active:true});audio.unlock();audio.prepareBattle();assert.equal(starts,1);
  audio.tap(true);assert.equal(starts,2);
  audio.stop();audio.battle('draw',true);assert.equal(starts,5);
  audio.stop();
});
