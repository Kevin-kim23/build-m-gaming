'use strict';
// CLI 15.33.0 passes storageSource through unchanged. The v2 API documents
// generation as optional. Never infer its value or accept extra source fields.
function validateUploadResponse(body,diagnostic) {
  const fail=check=>{diagnostic?.validation(check);throw Error('DEPLOYMENT_STOPPED');};
  let url;
  try {url=new URL(body?.uploadUrl);} catch {fail('upload-url');}
  if(url.protocol!=='https:'||url.hostname!=='storage.googleapis.com'||url.username||url.password||url.port||url.hash||!url.search||url.pathname==='/')fail('upload-url');
  const source=body?.storageSource;
  if(!source||typeof source!=='object'||Array.isArray(source)||
    !Object.hasOwn(source,'bucket')||!Object.hasOwn(source,'object')||
    Object.keys(source).some(key=>!['bucket','object','generation'].includes(key)))fail('upload-source-fields');
  if(!['bucket','object'].every(key=>typeof source[key]==='string'&&source[key].length>0&&source[key].length<2048))fail('upload-source-format');
  if(Object.hasOwn(source,'generation')) {
    const generation=source.generation;
    if(typeof generation!=='string'||!/^(0|[1-9][0-9]{0,18})$/.test(generation)||BigInt(generation)>9223372036854775807n)fail('upload-generation');
  }
  return {uploadUrl:url.href,storageSource:structuredClone(source)};
}
module.exports={validateUploadResponse};
