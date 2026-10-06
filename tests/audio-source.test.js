import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceCandidates, matchesProcessedSource } from '../tools/audio-source.mjs';

test('effect source selection includes supported variants without selecting another sound', () => {
  const chosen = {id:'tap-v2',sha256:'sample',generationId:'generation'};
  assert.deepEqual(sourceCandidates({id:'tap'},[chosen,{id:'tap-v5'},{id:'click'}]),[chosen]);
});

test('processed effects are reused only when the original and processor still match', () => {
  const item = {id:'tap'}, cached = {processingVersion:4,sourceHash:'sample',generationId:'generation'};
  const chosen = {id:'tap',sha256:'sample',generationId:'generation'};
  assert.equal(matchesProcessedSource(item,cached,4,[chosen]),true);
  assert.equal(matchesProcessedSource(item,cached,5,[chosen]),false);
  assert.equal(matchesProcessedSource(item,cached,4,[{...chosen,sha256:'new'}]),false);
  assert.equal(matchesProcessedSource(item,cached,4,[{...chosen,generationId:'new'}]),false);
});
