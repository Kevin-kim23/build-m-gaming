'use strict';
const {isDeepStrictEqual:equal}=require('node:util');
const {PROJECT,REGION}=require('./constants.cjs');
const template=require('./deployment-template.json');
const parent='projects/'+PROJECT+'/locations/'+REGION;
function validateFunction(f,id,slots,diagnostic,{existing=false}={}) {
  const fail=field=>{diagnostic?.validation(field);throw Error('DEPLOYMENT_STOPPED');};
  const model=template.requests.find(r=>r.body?.buildConfig?.entryPoint===id)?.body;
  if(!model||f?.name!==parent+'/functions/'+id)fail('response.name');
  if(f?.buildConfig?.runtime!=='nodejs22')fail('response.buildConfig.runtime');
  const s=f?.serviceConfig;
  if(s?.maxInstanceCount!==model.serviceConfig.maxInstanceCount)fail('response.serviceConfig.maxInstanceCount');
  if(s?.serviceAccountEmail!==(id==='moderateNicknames'?slots.ADMIN_RUNTIME:slots.DEFAULT_RUNTIME))fail('response.serviceConfig.serviceAccountEmail');
  const serviceParents=[parent,'projects/'+slots.PROJECT_NUMBER+'/locations/'+REGION];
  if(!serviceParents.some(p=>typeof s?.service==='string'&&s.service===p+'/services/'+id.toLowerCase()))fail('response.serviceConfig.service');
  let u;try{u=new URL(f.url);}catch{fail('response.url');}
  const cloud=u.hostname===REGION+'-'+PROJECT+'.cloudfunctions.net'&&u.pathname==='/'+id;
  const run=u.hostname.endsWith('.run.app')&&u.pathname==='/';
  if(u.protocol!=='https:'||u.port||u.username||u.password||u.search||u.hash||!(cloud||run))fail('response.url');
  if(['retryAccountDeletions','purgeExpiredServerRecords'].includes(id)&&s.ingressSettings!=='ALLOW_INTERNAL_ONLY')fail('response.serviceConfig.ingressSettings');
  if(existing) {
    if(f.state!=='ACTIVE'||f.environment!=='GEN_2')fail('response.state');
    if(f.buildConfig.entryPoint!==id)fail('response.buildConfig.entryPoint');
    // The only preserved function is the prior first callable. Validate its
    // explicit configuration, not service-level UI defaults or unrelated IAM.
    for(const [key,value] of Object.entries({availableMemory:'256Mi',availableCpu:'1',maxInstanceRequestConcurrency:80,timeoutSeconds:60,ingressSettings:'ALLOW_ALL'}))
      if(s[key]!==value)fail('existing.configuration');
    if(![undefined,0].includes(s.minInstanceCount))fail('existing.configuration');
    const expected=Object.fromEntries(Object.entries(model.serviceConfig.environmentVariables).map(([key,value])=>
      [key,value==='${FIREBASE_CONFIG}'?slots.FIREBASE_CONFIG:value==='${ADMIN_RUNTIME}'?slots.ADMIN_RUNTIME:value]));
    if(!equal(s.environmentVariables,expected))fail('existing.environment');
    if(f.labels?.['firebase-functions-codebase']!=='game'||f.labels?.['deployment-callable']!=='true')fail('existing.configuration');
  }
  return {service:s.service,uri:f.url};
}
module.exports={validateFunction};
