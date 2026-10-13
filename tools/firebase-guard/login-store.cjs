'use strict';
const fs=require('node:fs'),path=require('node:path');
const denied=()=>{throw new Error('GUARD_CREDENTIAL_PATH_DENIED');};
const inside=(file,root)=>file===root||file.startsWith(root+path.sep);
function canonical(value) {return path.resolve(value).toLowerCase();}
function validateCredentialPath(file,{expectedPath,repo,syncRoots=[]}) {
  if(!path.isAbsolute(file)||canonical(file)!==canonical(expectedPath)||inside(canonical(file),canonical(repo)))denied();
  if(path.basename(file)!=='firebase-tools.json')denied();
  if(file.split(/[\\/]/).some(p=>/^(?:onedrive(?: - .*)?|dropbox|google drive|googledrive|icloud(?:drive| drive)?|box(?: sync| drive)?|synologydrive)$/i.test(p)))denied();
  if(syncRoots.filter(Boolean).some(root=>inside(canonical(file),canonical(root))))denied();
  let cursor=path.resolve(file);
  while(true) {
    try {const s=fs.lstatSync(cursor);if(s.isSymbolicLink()||s.isFile()&&s.nlink>1)denied();}catch(e){if(e.code!=='ENOENT')throw e;}
    const parent=path.dirname(cursor);if(parent===cursor)break;cursor=parent;
  }
  return true;
}
function prepareCredentialStore(file,options) {
  validateCredentialPath(file,options);
  // Capture only capabilities required for this exact file. No global write exception.
  const ops={mkdir:fs.mkdirSync.bind(fs),open:fs.openSync.bind(fs),write:fs.writeSync.bind(fs),
    truncate:fs.ftruncateSync.bind(fs),sync:fs.fsyncSync.bind(fs),close:fs.closeSync.bind(fs),
    stat:fs.statSync.bind(fs),fstat:fs.fstatSync.bind(fs)};
  let before,prior={},consumed=false;
  try {before=ops.stat(file);prior=JSON.parse(fs.readFileSync(file,'utf8'));}
  catch(e){if(e.code!=='ENOENT')throw new Error('GUARD_CREDENTIAL_READ_FAILED');}
  if(!prior||typeof prior!=='object'||Array.isArray(prior))denied();
  return Object.freeze({
    save(credentials) {
      if(consumed)denied();consumed=true;
      validateCredentialPath(file,options);
      const current=(()=>{try{return ops.stat(file);}catch(e){if(e.code==='ENOENT')return undefined;throw e;}})();
      if(Boolean(current)!==Boolean(before)||before&&(current.mtimeMs!==before.mtimeMs||current.size!==before.size||current.ino!==before.ino))denied();
      if(!credentials?.user||!credentials.tokens?.access_token||!credentials.tokens?.refresh_token)denied();
      const data={...prior,user:credentials.user,tokens:credentials.tokens,loginScopes:credentials.scopes};
      delete data.session;delete data.tempLoginState;
      const bytes=Buffer.from(JSON.stringify(data));
      ops.mkdir(path.dirname(file),{recursive:true,mode:0o700});
      const flags=before?fs.constants.O_RDWR:(fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL);
      const fd=ops.open(file,flags|(fs.constants.O_NOFOLLOW||0),0o600);
      try {
        const opened=ops.fstat(fd);
        if(!opened.isFile()||before&&(opened.ino!==before.ino||opened.dev!==before.dev))denied();
        let offset=0;
        while(offset<bytes.length) {
          const written=ops.write(fd,bytes,offset,bytes.length-offset,offset);
          if(written<=0)throw new Error('GUARD_CREDENTIAL_WRITE_FAILED');
          offset+=written;
        }
        ops.truncate(fd,bytes.length);ops.sync(fd);
      }finally{ops.close(fd);bytes.fill(0);prior={};}
      // Deliberately no read-back, debug log, backup or temporary credential file.
    },
    revoke(){consumed=true;prior={};}
  });
}
module.exports={validateCredentialPath,prepareCredentialStore};
