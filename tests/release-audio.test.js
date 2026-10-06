import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createGameAudio } from '../src/audio.js';
import { verifyAudioAssets } from '../tools/audio-assets.mjs';

test('browser audio uses synthesis without requesting or decoding external files', async t => {
  const previous = globalThis.window;
  globalThis.window = {};
  t.after(() => { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; });
  let requests = 0, starts = 0;
  const context = { currentTime:0, state:'running', destination:{}, resume:async()=>{},
    createGain:()=>({connect(){},disconnect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}}),
    createOscillator:()=>({connect(){},disconnect(){},frequency:{setValueAtTime(){}},start(){starts++;},stop(){}}) };
  const audio = createGameAudio(()=>context, {effects:{fetchAudio:async()=>{requests++;return {ok:false,status:404};}}});
  audio.configure({enabled:true,active:true});
  audio.unlock(); audio.prepareBattle(); audio.tap(true);
  await Promise.resolve();
  assert.equal(requests,0);
  assert.ok(starts > 0);
  audio.stop();
});

test('synthesis release needs no private audio but rejects accidentally bundled recordings',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'budae-synth-release-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const root=pathToFileURL(directory+'/');
  await mkdir(new URL('public/',root));
  assert.deepEqual((await verifyAudioAssets(root)).failures,[]);
  await mkdir(new URL('public/old/',root));
  await writeFile(new URL('public/old/forgotten.MP3',root),'unused private sample');
  assert.match((await verifyAudioAssets(root)).failures.join('\n'),/forgotten.MP3/);
});
