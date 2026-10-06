import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { AUDIO_IDS } from '../src/audio-catalog.js';
import { verifyAudioAssets } from '../tools/archived-audio-assets.mjs';

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'budae-audio-check-'));
  t.after(() => rm(directory, {recursive:true, force:true}));
  const root = pathToFileURL(directory + '/');
  await mkdir(new URL('public/audio/sfx/', root), {recursive:true});
  const content = Buffer.alloc(600, 1), hash = createHash('sha256').update(content).digest('hex');
  const manifest = {assets:[...AUDIO_IDS].map(id=>({id,type:'sfx',path:`public/audio/sfx/${id}.mp3`,sha256:hash}))};
  for (const item of manifest.assets) await writeFile(new URL(item.path, root), content);
  const save = () => writeFile(new URL('public/audio/manifest.json', root), JSON.stringify(manifest));
  await save();
  return {root,manifest,save,check:()=>verifyAudioAssets(root)};
}

test('release audio accepts the complete effects-only bundle',async t=>{
  const f=await fixture(t),result=await f.check();
  assert.deepEqual(result.failures,[]);assert.equal(result.bytes,AUDIO_IDS.size*600);
});
test('release audio rejects a restored old music manifest',async t=>{
  const f=await fixture(t);f.manifest.assets.push({id:'home',type:'music',path:'public/audio/music/home.mp3'});await f.save();
  assert.match((await f.check()).failures.join('\n'),/home: unsupported asset/);
});
test('release audio rejects leftover music files even when the manifest is current',async t=>{
  const f=await fixture(t);await mkdir(new URL('public/audio/music/',f.root));
  await writeFile(new URL('public/audio/music/home.mp3',f.root),'old recording');
  assert.match((await f.check()).failures.join('\n'),/music: unexpected audio/);
});
test('release audio rejects missing or changed effects',async t=>{
  const f=await fixture(t);
  await rm(new URL('public/audio/sfx/tap.mp3',f.root));
  await writeFile(new URL('public/audio/sfx/click.mp3',f.root),Buffer.alloc(600,2));
  const errors=(await f.check()).failures.join('\n');
  assert.match(errors,/tap: restore effect/);assert.match(errors,/click: checksum differs/);
});
test('release audio rejects duplicate records and unexpected files',async t=>{
  const f=await fixture(t);f.manifest.assets.push({...f.manifest.assets[0]});await f.save();
  await writeFile(new URL('public/audio/sfx/unused.mp3',f.root),'unused');
  const errors=(await f.check()).failures.join('\n');
  assert.match(errors,/duplicate manifest record/);assert.match(errors,/sfx\/unused.mp3: unexpected audio/);
});
