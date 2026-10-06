import { readdir } from 'node:fs/promises';

// Synthesis-only releases must not accidentally include old licensed recordings.
export async function verifyAudioAssets(root) {
  const failures = [];
  async function visit(relative = '') {
    for (const entry of await readdir(new URL('public/' + relative, root), {withFileTypes:true})) {
      const name = relative + entry.name;
      if (entry.isSymbolicLink()) failures.push(name + ': symlinks are not allowed in release assets');
      else if (entry.isDirectory()) await visit(name + '/');
      else if (/\.(mp3|wav|ogg|m4a|aac|flac|opus|aiff|wma|zip)$/i.test(entry.name))
        failures.push(name + ': remove recorded audio/archive from this synthesis-only release');
    }
  }
  try { await visit(); }
  catch (error) { failures.push('Cannot inspect public assets: ' + error.message); }
  return {bytes:0,failures};
}
