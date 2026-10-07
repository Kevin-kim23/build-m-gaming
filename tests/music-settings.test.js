import test from 'node:test';
import assert from 'node:assert/strict';
import { createMusicPlayer } from '../src/music.js';
import { freshState } from '../src/state.js';
import { parseSave, inspectSave } from '../src/save.js';
import { serializeSave } from '../src/money.js';

function fixture(playError) {
  const handlers = {}, errors = [];
  let count = 0;
  const media = { paused: true, currentTime: 0, volume: 1, starts: 0,
    addEventListener(name, callback) { handlers[name] = callback; },
    load() { this.paused = true; }, pause() { this.paused = true; },
    play() { this.starts++; if (playError) return Promise.reject(playError); this.paused = false; return Promise.resolve(); },
  };
  const player = createMusicPlayer({createAudio: () => {count++; return media;}, onError: (...error) => errors.push(error)});
  return {media, player, errors, handlers, count: () => count};
}
const settled = () => Promise.resolve();

test('home plays 1, 2, 1 using one player, not one player per tick', async () => {
  const f = fixture(); f.player.configure({scene:'home', active:true, volume:0.4}); await settled();
  assert.match(f.media.src, /home-1/); assert.equal(f.media.volume, 0.4);
  for(let i=0;i<20;i++) f.player.configure({active:true,volume:0.4});
  assert.equal(f.media.starts,1);
  f.handlers.ended(); await settled(); assert.match(f.media.src,/home-2/);
  f.handlers.ended(); await settled(); assert.match(f.media.src,/home-1/);
  assert.equal(f.count(),1); assert.deepEqual(f.errors,[]);
});
test('title and battle loop, home position survives battle and app pause', async () => {
  const f=fixture(); f.player.configure({scene:'title',active:true}); await settled();
  f.handlers.ended(); await settled(); assert.match(f.media.src,/title/);
  f.player.configure({scene:'home'}); await settled(); f.media.currentTime=42;
  f.player.configure({scene:'battle'}); await settled(); assert.match(f.media.src,/battle/);
  f.handlers.ended(); await settled(); assert.match(f.media.src,/battle/);
  f.player.configure({active:false}); assert.equal(f.media.paused,true);
  f.player.configure({scene:'home',active:true}); await settled(); assert.equal(f.media.currentTime,42);
  assert.equal(f.media.paused,false);
});
test('zero volume pauses music, unmuting resumes without replacing track', async () => {
  const f=fixture();f.player.configure({scene:'home',active:true});await settled();
  f.media.currentTime=15;f.player.configure({volume:0});assert.equal(f.media.paused,true);
  f.player.configure({volume:0.2});await settled();assert.equal(f.media.currentTime,15);assert.equal(f.media.volume,0.2);
  f.player.configure({active:false});f.player.unlock();assert.equal(f.media.paused,true);
});
test('autoplay blocking waits for gesture instead of retrying every tick', async () => {
  const f=fixture({name:'NotAllowedError'});f.player.configure({scene:'title',active:true});await settled();
  for(let i=0;i<10;i++)f.player.configure({active:true});
  assert.equal(f.media.starts,1);assert.deepEqual(f.errors,[]);
  f.player.unlock();await settled();assert.equal(f.media.starts,2);
});
test('failed tracks do not repeatedly retry or prevent gameplay', async () => {
  const f=fixture(new Error('decode failure'));f.player.configure({scene:'home',active:true});await settled();
  f.player.unlock();f.player.configure({active:true});assert.equal(f.media.starts,1);assert.equal(f.errors.length,1);
});
test('schema28 migration preserves old mute, gold, troops and independent schema29 volumes', () => {
  for(const sound of [false,true]) {
    const state={...freshState(100),version:28,sound,gold:1000000000000000000n,soldiers:100};
    delete state.sfxVolume;delete state.musicVolume;
    const migrated=parseSave(serializeSave(state),100);
    assert.equal(migrated.version,29);assert.equal(migrated.sound,sound);
    assert.equal(migrated.sfxVolume,sound?0.7:0);assert.equal(migrated.musicVolume,sound?0.45:0);
    assert.equal(migrated.gold,state.gold);assert.equal(migrated.soldiers,100);
    migrated.sfxVolume=0;migrated.sound=false;migrated.musicVolume=0.83;
    const saved=parseSave(serializeSave(migrated),100);
    assert.equal(saved.musicVolume,0.83);assert.equal(saved.sfxVolume,0);
  }
});
test('volume save validation rejects out-of-range and malformed settings', () => {
  for(const key of ['musicVolume','sfxVolume'])for(const value of [-0.1,1.1,'0.5',null]) {
    const result=inspectSave(serializeSave({...freshState(100),[key]:value}));
    assert.equal(result.state,null);assert.equal(result.issue.field,key);
  }
});
