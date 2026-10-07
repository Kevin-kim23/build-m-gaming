import { matchesMusicAsset } from './music-assets.mjs';
import { readdir, readFile } from 'node:fs/promises';
import { matchesOpeningAsset } from './opening-assets.mjs';

// Gameplay uses synthesis. The one explicitly requested studio video is hash-checked.
export async function verifyAudioAssets(root) {
  const failures = [];
  async function visit(relative = '') {
    for (const entry of await readdir(new URL('public/' + relative, root), {withFileTypes:true})) {
      const name = relative + entry.name;
      if (entry.isSymbolicLink()) failures.push(name + ': symlinks are not allowed in release assets');
      else if (entry.isDirectory()) await visit(name + '/');
      else if (/\.(mp3|wav|ogg|m4a|aac|flac|opus|aiff|wma|zip)$/i.test(entry.name)) {
        if (!matchesMusicAsset('public/' + name, await readFile(new URL('public/' + name, root))))
          failures.push(name + ': unapproved audio/archive or music checksum differs');
      }
      else if (/\.(mp4|m4v|webm|mov|avi|mkv)$/i.test(entry.name)) {
        if (name !== 'opening/studio-logo.mp4') failures.push(name + ': unreviewed video/audio container');
        else if (!matchesOpeningAsset('public/' + name, await readFile(new URL('public/' + name, root))))
          failures.push(name + ': approved studio video checksum differs');
      }
    }
  }
  try { await visit(); }
  catch (error) { failures.push('Cannot inspect public assets: ' + error.message); }
  return {bytes:0,failures};
}
