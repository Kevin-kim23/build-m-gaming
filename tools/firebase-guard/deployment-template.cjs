'use strict';
const {PROJECT,REGION,FUNCTIONS}=require('./constants.cjs');
// Only synthetic capture output may be converted to a versioned template.
function templateFromCapture(result) {
  if(result.failed||result.stage!=='captured'||result.blocked!==0||result.requests.length!==33)throw Error('CAPTURE_INCOMPLETE');
  const replacements=[
    ['moderation-runtime@'+PROJECT+'.iam.gserviceaccount.com','${ADMIN_RUNTIME}'],
    ['123456789012-compute'+'@'+'developer.gserviceaccount.com','${DEFAULT_RUNTIME}'],
    ['123456789012','${PROJECT_NUMBER}'],
    ['https://storage.googleapis.com/offline-fixture/source.zip?GoogleAccessId=offline&Signature=fixture','${UPLOAD_URL}'],
  ];
  const parent='projects/'+PROJECT+'/locations/'+REGION;
  for(const id of FUNCTIONS)replacements.push(
    [parent+'/operations/'+id,'${OPERATION:'+id+'}'],
    [parent+'/services/'+id.toLowerCase(),'${SERVICE:'+id+'}'],
    ['https://'+id.toLowerCase()+'.offline.invalid','${URI:'+id+'}']);
  function convert(value,key) {
    if(key==='storageSource')return {$slot:'STORAGE_SOURCE'};
    if(key==='FIREBASE_CONFIG')return '${FIREBASE_CONFIG}';
    if(typeof value==='string') {
      for(const [from,to] of replacements)value=value.split(from).join(to);
      return value;
    }
    if(Array.isArray(value))return value.map(v=>convert(v));
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).map(([k,v])=>[k,convert(v,k)]));
    return value;
  }
  const requests=result.requests.map(r=>convert(r));
  if(JSON.stringify(requests).includes('@')||JSON.stringify(requests).includes('123456789012'))throw Error('PRIVATE_TEMPLATE');
  return {schema:1,cli:'15.33.0',project:PROJECT,region:REGION,requests};
}
module.exports={templateFromCapture};
