import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {AUDIO_IDS} from '../src/audio-catalog.js';
import {MUSIC_PLAN} from './audio-plan.mjs';
const root=new URL('../',import.meta.url);
let manifest;try{manifest=JSON.parse(await readFile(new URL('public/audio/manifest.json',root),'utf8'));}catch(e){console.error('Audio manifest is missing. Restore the private audio bundle before packaging.');process.exit(1);}
const failures=[];let bytes=0;
for(const id of AUDIO_IDS){
 const item=manifest.assets.find(x=>x.id===id);
 if(!item){failures.push(`${id}: missing manifest record`);continue;}
 const music=MUSIC_PLAN.find(track=>track.id===id);
 if(music&&(item.edition??null)!==(music.edition??null)){failures.push(`${id}: outdated music edition`);continue;}
 const expected=`public/audio/${item.type==='music'?'music':'sfx'}/${id}.mp3`;
 if(item.path!==expected){failures.push(`${id}: invalid path`);continue;}
 try{const file=await readFile(new URL(expected,root));bytes+=file.length;if(createHash('sha256').update(file).digest('hex')!==item.sha256)failures.push(`${id}: checksum differs`);if(file.length<500)failures.push(`${id}: empty or truncated`);}catch(e){failures.push(`${id}: restore audio file (${e.code})`);}
}
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log(`Audio assets verified: ${AUDIO_IDS.size} files, ${(bytes/1024/1024).toFixed(2)} MiB. Checksums match; this does not replace listening or device testing.`);
