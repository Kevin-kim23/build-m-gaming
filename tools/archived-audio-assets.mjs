import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { AUDIO_IDS } from '../src/audio-catalog.js';

// Historical sample-bundle checker; current synthesis-only releases use audio-assets.mjs.
export async function verifyAudioAssets(root) {
  const failures = [];
  let manifest, bytes = 0;
  try {
    manifest = JSON.parse(await readFile(new URL('public/audio/manifest.json', root), 'utf8'));
    if (!Array.isArray(manifest.assets)) throw new Error('Missing assets list');
  } catch (error) {
    return {bytes, failures:[`Audio manifest cannot be read: ${error.message}. Restore the current private effects bundle.`]};
  }
  const records = new Map();
  for (const item of manifest.assets) {
    if (!item || !AUDIO_IDS.has(item.id) || item.type !== 'sfx') {
      failures.push(`${item?.id ?? 'unknown'}: unsupported asset; use the current effects-only bundle`);
      continue;
    }
    if (records.has(item.id)) failures.push(`${item.id}: duplicate manifest record`);
    records.set(item.id, item);
  }
  const allowedFiles = new Set(['manifest.json']);
  for (const id of AUDIO_IDS) {
    allowedFiles.add(`sfx/${id}.mp3`);
    const item = records.get(id);
    if (!item) { failures.push(`${id}: missing manifest record`); continue; }
    const expected = `public/audio/sfx/${id}.mp3`;
    if (item.path !== expected) { failures.push(`${id}: invalid path`); continue; }
    try {
      const file = await readFile(new URL(expected, root));
      bytes += file.length;
      if (createHash('sha256').update(file).digest('hex') !== item.sha256) failures.push(`${id}: checksum differs`);
      if (file.length < 500) failures.push(`${id}: empty or truncated`);
    } catch (error) { failures.push(`${id}: restore effect file (${error.code})`); }
  }
  // Old ZIPs can leave music behind even with a new manifest; Vite copies all public files.
  async function checkFolder(relative = '') {
    for (const entry of await readdir(new URL(`public/audio/${relative}`, root), {withFileTypes:true})) {
      const path = relative + entry.name;
      if (entry.isDirectory() && path === 'sfx') await checkFolder('sfx/');
      else if (!entry.isFile() || !allowedFiles.has(path)) failures.push(`${path}: unexpected audio file or folder; remove it before packaging`);
    }
  }
  try { await checkFolder(); }
  catch (error) { failures.push(`Cannot inspect audio files: ${error.message}`); }
  return {bytes, failures};
}
