import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {AUDIO_PLAN} from './audio-plan.mjs';
import {sourceCandidates,matchesProcessedSource} from './audio-source.mjs';
const ffmpeg=process.env.FFMPEG_PATH ?? process.argv[2];
if(!ffmpeg)throw new Error('Pass the local ffmpeg executable as the first argument or set FFMPEG_PATH.');
const root=new URL('../',import.meta.url),sourceRoot=new URL('private-audio/',root),assetRoot=new URL('public/audio/',root);
const records=JSON.parse(await readFile(new URL('sources.json',sourceRoot),'utf8'));
const manifestUrl=new URL('manifest.json',assetRoot);
let previous=[];try{previous=JSON.parse(await readFile(manifestUrl,'utf8')).assets;}catch(e){if(e.code!=='ENOENT')throw e;}
function run(args){const r=spawnSync(ffmpeg,['-hide_banner','-nostdin','-loglevel','error',...args],{maxBuffer:30*1024*1024,windowsHide:true});if(r.error)throw r.error;if(r.status!==0)throw new Error(r.stderr.toString());return r.stdout;}
function analyse(path){
 const data=run(['-i',path,'-ac','1','-ar','24000','-f','f32le','pipe:1']);
 let peak=0,sum=0,first=-1,last=0,clipped=0;const samples=data.length/4;
 for(let i=0;i<samples;i++){const v=data.readFloatLE(i*4);if(!Number.isFinite(v))throw new Error('Non-finite audio');const a=Math.abs(v);peak=Math.max(peak,a);sum+=v*v;if(a>.01){if(first<0)first=i;last=i;}if(a>=.999)clipped++;}
 return {duration:samples/24000,peak,rms:Math.sqrt(sum/Math.max(1,samples)),onset:Math.max(0,first)/24000,audibleDuration:(last-Math.max(0,first))/24000,clipped};
}
await mkdir(assetRoot,{recursive:true});
const manifest={version:1,provider:'ElevenLabs',generationDate:'2026-10-06',plan:'Creator (user confirmed)',flowId:'ednCDWCqnmkvVHvoooSf',licenseReview:'docs/AUDIO_RIGHTS.md',assets:previous.filter(asset=>asset.type==='sfx'&&AUDIO_PLAN.some(item=>item.id===asset.id))};
for(const item of AUDIO_PLAN){
 const existing=manifest.assets.find(x=>x.id===item.id);
 const processingVersion=4;
 const candidates=sourceCandidates(item,records);
 if(matchesProcessedSource(item,existing,processingVersion,candidates)){const p=new URL(existing.path,root);try{const bytes=await readFile(p);if(createHash('sha256').update(bytes).digest('hex')===existing.sha256)continue;}catch(e){if(e.code!=='ENOENT')throw e;}}
 if(!candidates.length){console.log(`Pending: ${item.id}`);continue;}
 const scored=candidates.map(record=>({record,analysis:analyse(fileURLToPath(new URL(record.id+'.source',sourceRoot)))}))
   .filter(c=>c.analysis.rms>.001&&c.analysis.audibleDuration>.06)
   .sort((a,b)=>(a.analysis.onset+a.analysis.clipped/24000*10)-(b.analysis.onset+b.analysis.clipped/24000*10));
 if(!scored.length)throw new Error(`No audible candidate: ${item.id}`);
 const chosen=scored[0],input=fileURLToPath(new URL(chosen.record.id+'.source',sourceRoot));
 const folder='sfx';await mkdir(new URL(folder+'/',assetRoot),{recursive:true});
 const relative=`public/audio/${folder}/${item.id}.mp3`,output=fileURLToPath(new URL(relative,root));
 const trim=Math.max(0,chosen.analysis.onset-.012).toFixed(4),duration=Math.max(.12,chosen.analysis.duration-Number(trim));
 const renderSfx=(gain=1)=>run(['-y','-i',input,'-af',`atrim=start=${trim},asetpts=PTS-STARTPTS,loudnorm=I=-19:TP=-2:LRA=7,afade=t=out:st=${Math.max(0,duration-.04)}:d=0.04,alimiter=limit=0.7:level=false:latency=true,aresample=44100,volume=${gain}`,'-ac','1','-map_metadata','-1','-c:a','libmp3lame','-b:a','96k',output]);
 renderSfx();
 let quality=analyse(output);
 // MP3 encoding/resampling can overshoot a limiter. Re-render from the original with measured headroom.
 if(quality.peak>.95){renderSfx(.85/quality.peak);quality=analyse(output);}
 if(quality.rms<=.001||quality.peak>1.001)throw new Error(`Invalid processed sound: ${item.id}`);
 const bytes=await readFile(output),entry={id:item.id,title:item.title,type:item.type,path:relative,processingVersion,model:chosen.record.model,generationId:chosen.record.generationId,sourceHash:chosen.record.sha256,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,...quality,selection:'earliest audible onset among non-silent candidates; listening review still required'};
 manifest.assets=manifest.assets.filter(x=>x.id!==item.id);manifest.assets.push(entry);
 await writeFile(manifestUrl,JSON.stringify(manifest,null,2)+'\n');
 console.log(`Processed ${item.id}: ${quality.duration.toFixed(2)}s, ${bytes.length} bytes`);
}
await writeFile(manifestUrl,JSON.stringify(manifest,null,2)+'\n');
console.log(`Effects processed: ${manifest.assets.length}/${AUDIO_PLAN.length}`);
