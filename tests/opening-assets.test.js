import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { OPENING_ASSETS, verifyOpeningAssets, matchesOpeningAsset } from '../tools/opening-assets.mjs';
import { verifyAudioAssets } from '../tools/audio-assets.mjs';

test('release contains exact approved logo and title artwork without additional audio', async () => {
  const root = new URL('../', import.meta.url);
  assert.equal(OPENING_ASSETS.length, 3);
  assert.deepEqual((await verifyOpeningAssets(root)).failures, []);
  assert.deepEqual((await verifyAudioAssets(root)).failures, []);
  const image = await readFile(new URL('public/opening/title-screen.webp', root));
  assert.equal(image.toString('ascii', 8, 12), 'WEBP');
  const video = await readFile(new URL('public/opening/studio-logo.mp4', root));
  assert.equal(video.toString('ascii', 4, 8), 'ftyp');
  assert.equal(matchesOpeningAsset('public/opening/studio-logo.mp4', video.subarray(1)), false);
});

test('release preparation fails when opening files were not copied to another computer', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'budae-missing-opening-'));
  t.after(() => rm(directory, {recursive:true, force:true}));
  const result = await verifyOpeningAssets(pathToFileURL(directory + '/'));
  assert.equal(result.failures.length, OPENING_ASSETS.length);
  assert.ok(result.failures.every(error => error.includes('unavailable')));
});
