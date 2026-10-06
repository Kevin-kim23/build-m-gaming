import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceCandidates, matchesProcessedSource } from '../tools/audio-source.mjs';
import { audioUrl } from '../src/audio-catalog.js';

test('replacement music selects its new recording, excluding the previous edition', () => {
  const item = {id:'home',sourceId:'home-bright-1',edition:'bright-1'};
  const old = {id:'home',sha256:'old',generationId:'old-id'};
  const next = {id:'home-bright-1',sha256:'new',generationId:'new-id'};
  const candidates = sourceCandidates(item,[old,next,{id:'home-bright-10',sha256:'other'}]);
  assert.deepEqual(candidates,[next]);
  const cached = {processingVersion:2,sourceHash:'old',generationId:'old-id'};
  assert.equal(matchesProcessedSource(item,cached,2,candidates),false);
  const updated = {...cached,edition:'bright-1',sourceHash:'new',generationId:'new-id'};
  assert.equal(matchesProcessedSource(item,updated,2,candidates),true);
});

test('unchanged effects keep their processed files when only music changes', () => {
  const item = {id:'tap'};
  const chosen = {id:'tap-v2',sha256:'sample',generationId:'generation'};
  const candidates = sourceCandidates(item,[chosen,{id:'tap-v5',sha256:'not-a-variant'}]);
  assert.deepEqual(candidates,[chosen]);
  assert.equal(matchesProcessedSource(item,{processingVersion:4,sourceHash:'sample',generationId:'generation'},4,candidates),true);
  assert.equal(matchesProcessedSource(item,{processingVersion:3,sourceHash:'sample',generationId:'generation'},4,candidates),false);
});

test('regeneration under the same edition also invalidates processed audio', () => {
  const item = {id:'home',edition:'bright-1'};
  const cached = {processingVersion:2,edition:'bright-1',sourceHash:'old',generationId:'old-id'};
  assert.equal(matchesProcessedSource(item,cached,2,[{id:'home',sha256:'new',generationId:'new-id'}]),false);
});

test('new music bypasses the old music URL cache while effects keep their URLs', () => {
  assert.equal(audioUrl('home'),'./audio/music/home.mp3?v=bright-1');
  assert.equal(audioUrl('norgard-capital'),'./audio/music/norgard-capital.mp3?v=bright-1');
  assert.equal(audioUrl('tank-action'),'./audio/sfx/tank-action.mp3');
});
