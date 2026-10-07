import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

export const MUSIC_ASSETS = JSON.parse(readFileSync(new URL('../docs/music-assets.json', import.meta.url))).assets;
export function matchesMusicAsset(path, bytes) {
  const asset = MUSIC_ASSETS.find(a => a.path === path);
  return !!asset && bytes.length === asset.bytes && createHash('sha256').update(bytes).digest('hex') === asset.sha256;
}
export async function verifyMusicAssets(root) {
  const failures = [];
  for (const asset of MUSIC_ASSETS) {
    try {
      if (!matchesMusicAsset(asset.path, await readFile(new URL(asset.path, root)))) failures.push(asset.path + ': music checksum differs');
    } catch (error) { failures.push(asset.path + ': restore approved private music (' + error.code + ')'); }
  }
  return { failures };
}
