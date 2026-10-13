'use strict';
const fs=require('node:fs');
const {fileURLToPath}=require('node:url');
const {syncBuiltinESMExports}=require('node:module');
function installFileGuard(onBlocked=()=>{}) {
  const originals=[];
  const block=()=>{onBlocked();throw Object.assign(new Error('GUARD_FILE_WRITE_DENIED'),{code:'GUARD_FILE_WRITE_DENIED'});};
  function patch(object,key,replacement){originals.push([object,key,object[key]]);object[key]=replacement;}
  // All writes are denied in read-only and synthetic child modes. No write-then-delete.
  const mutations=['write','writev','writeFile','appendFile','truncate','ftruncate','mkdir','mkdtemp','rename','copyFile','cp','rm','rmdir','unlink','symlink','link','chmod','chown','utimes'];
  for(const name of mutations) {
    for(const key of [name,name+'Sync'])if(typeof fs[key]==='function')patch(fs,key,block);
    if(typeof fs.promises[name]==='function')patch(fs.promises,name,async()=>block());
  }
  patch(fs,'createWriteStream',block);
  const sensitive=p=>{
    if(p instanceof URL)p=fileURLToPath(p);
    if(Buffer.isBuffer(p))p=p.toString('utf8');
    return typeof p==='string'&&/(?:^|[\\/])\.env(?:[.\\/]|$)/i.test(p);
  };
  for(const name of ['readFile','readFileSync','createReadStream']) {
    const original=fs[name];
    patch(fs,name,function(p,...args){if(sensitive(p))return block();return original.call(this,p,...args);});
  }
  const readPromise=fs.promises.readFile;
  if(fs.openAsBlob) {
    const original=fs.openAsBlob;
    patch(fs,'openAsBlob',function(p,...args){if(sensitive(p))return block();return original.call(this,p,...args);});
  }
  patch(fs.promises,'readFile',async function(p,...args){if(sensitive(p))return block();return readPromise.call(this,p,...args);});
  for(const name of ['open','openSync']) {
    const original=fs[name];
    patch(fs,name,function(p,flags,...args){if(sensitive(p)||(flags!=='r'&&flags!==0))return block();return original.call(this,p,flags,...args);});
  }
  const openPromise=fs.promises.open;
  patch(fs.promises,'open',async function(p,flags,...args){if(sensitive(p)||(flags!=='r'&&flags!==0))return block();return openPromise.call(this,p,flags,...args);});
  syncBuiltinESMExports();
  return ()=>{for(const [object,key,original] of originals.reverse())object[key]=original;syncBuiltinESMExports();};
}
module.exports={installFileGuard};
