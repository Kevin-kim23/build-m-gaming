import { AUDIO_IDS } from '../src/audio-catalog.js';
import { verifyAudioAssets } from './audio-assets.mjs';

const {bytes, failures} = await verifyAudioAssets(new URL('../', import.meta.url));
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Effects verified: ${AUDIO_IDS.size} files, ${(bytes / 1024 / 1024).toFixed(2)} MiB. No background music. Listening and device testing remain separate.`);
}
