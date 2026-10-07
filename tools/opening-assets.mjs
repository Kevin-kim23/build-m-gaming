import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Reviewable, fixed assets. This manifest contains no remote URLs or private credentials.
export const OPENING_ASSETS = JSON.parse(readFileSync(new URL('../docs/opening-assets.json', import.meta.url))).assets;
export function matchesOpeningAsset(relative, bytes) {
  const entry = OPENING_ASSETS.find(asset => asset.path === relative);
  return !!entry && bytes.length === entry.bytes && createHash('sha256').update(bytes).digest('hex') === entry.sha256;
}
export async function verifyOpeningAssets(root) {
  const failures = [];
  for (const asset of OPENING_ASSETS) {
    try {
      if (!matchesOpeningAsset(asset.path, await readFile(new URL(asset.path, root))))
        failures.push(asset.path + ': opening asset checksum differs; review replacement before release');
    } catch (error) { failures.push(asset.path + ': opening asset unavailable (' + error.code + ')'); }
  }
  return {failures};
}
