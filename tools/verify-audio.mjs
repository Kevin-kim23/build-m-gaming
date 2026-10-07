import { verifyMusicAssets } from './music-assets.mjs';
import { verifyAudioAssets } from './audio-assets.mjs';
import { verifyOpeningAssets } from './opening-assets.mjs';

const root = new URL('../', import.meta.url);
const results = await Promise.all([verifyAudioAssets(root), verifyOpeningAssets(root), verifyMusicAssets(root)]);
const failures = results.flatMap(result => result.failures);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Gameplay synthesis, four approved music tracks and opening media verified. No extra recordings or private archives. Listening and device testing remain separate.');
}
