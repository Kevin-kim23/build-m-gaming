import { verifyAudioAssets } from './audio-assets.mjs';

const {failures} = await verifyAudioAssets(new URL('../', import.meta.url));
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Synthesis-only audio verified: no recorded audio or private archive bundled. Listening and device testing remain separate.');
}
