'use strict';
const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {createRequire}=require('node:module');
const {createHash}=require('node:crypto');
const {PROJECT}=require('./constants.cjs');
const fail=()=>{throw Error('DEPLOY_INPUT_INVALID');};
function git(repo,args,encoding='utf8') {return execFileSync('git',args,{cwd:repo,encoding,stdio:['ignore','pipe','pipe'],windowsHide:true,maxBuffer:20*1024*1024});}
function readPrivateValues(repo,filename) {
  const root=fs.realpathSync(repo),real=fs.realpathSync(filename);
  if(!path.isAbsolute(filename)||real.toLowerCase().startsWith((root+path.sep).toLowerCase())||
    /(?:^|[\\/])(?:OneDrive[^\\/]*|Dropbox|Google Drive|iCloudDrive)(?:[\\/]|$)/i.test(real))fail();
  for(const key of ['OneDrive','OneDriveCommercial','OneDriveConsumer'])if(process.env[key]&&real.toLowerCase().startsWith(path.resolve(process.env[key]).toLowerCase()+path.sep))fail();
  if(fs.statSync(real).size>8192)fail();
  const values=JSON.parse(fs.readFileSync(real,'utf8'));
  if(Object.keys(values).sort().join(',')!=='DEFAULT_RUNTIME,FIREBASE_CONFIG,PROJECT_NUMBER')fail();
  if(git(repo,['ls-files','--','server/.env.'+PROJECT]).trim())fail();
  git(repo,['check-ignore','-q','server/.env.'+PROJECT]);
  const lines=fs.readFileSync(path.join(repo,'server/.env.'+PROJECT),'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/);
  if(lines.length!==3)fail();
  const env={};
  for(const line of lines) {const m=/^(MODERATION_RUNTIME_SERVICE_ACCOUNT|MODERATION_ADMIN_AUDIENCE|MODERATION_ADMIN_SUBJECT)=([^\r\n]*)$/.exec(line);if(!m||Object.hasOwn(env,m[1]))fail();env[m[1]]=m[2];}
  if(env.MODERATION_ADMIN_AUDIENCE!==''||env.MODERATION_ADMIN_SUBJECT!=='')fail();
  return {...values,ADMIN_RUNTIME:env.MODERATION_RUNTIME_SERVICE_ACCOUNT};
}
async function archiveCommittedSource(cliDir,repo) {
  if(git(repo,['status','--porcelain']).trim()||git(repo,['branch','--show-current']).trim()!=='feat/firebase-server-test')fail();
  const head=git(repo,['rev-parse','HEAD']).trim();
  const names=git(repo,['ls-files','-z','--','server','src']).split('\0').filter(Boolean);
  const selected=names.filter(n=>/^server\/[a-z0-9-]+\.(js|json)$/.test(n)||/^src\/[a-z0-9-]+\.js$/.test(n));
  if(!selected.includes('server/index.js')||!selected.includes('server/package-lock.json'))fail();
  const req=createRequire(path.join(cliDir,'package.json')),zip=req('archiver')('zip',{zlib:{level:9}});
  const chunks=[];
  const complete=new Promise((resolve,reject)=>{zip.on('data',b=>chunks.push(b));zip.once('end',resolve);zip.once('error',()=>reject(Error('ARCHIVE_FAILED')));zip.once('warning',()=>reject(Error('ARCHIVE_FAILED')));});
  for(const name of selected.sort()) {
    const content=git(repo,['show',head+':'+name],null);
    // Ignored game copies must match the committed rules discovered by the SDK.
    if(name.startsWith('src/')) {
      const copy=fs.readFileSync(path.join(repo,'server/game',path.basename(name)));
      if(copy.toString('utf8').replace(/\r\n/g,'\n')!==content.toString('utf8').replace(/\r\n/g,'\n'))fail();
    }
    zip.append(content,{name:name.startsWith('src/')?'game/'+path.basename(name):name.slice(7),date:new Date('2000-01-01T00:00:00Z'),mode:0o644});
  }
  await zip.finalize();await complete;
  const archive=Buffer.concat(chunks);
  return {archive,archiveHash:createHash('sha256').update(archive).digest('hex'),head};
}
module.exports={readPrivateValues,archiveCommittedSource};
