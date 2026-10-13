'use strict';
const {PROJECT}=require('./constants.cjs');
const canonical=require('./deployment-template.json');
const RESUME_CONFIRMATION='RESUME DEV PRESERVE FIRST FUNCTION ONCE';
// Same route already allowed in inventory mode. It is not called by loading
// this module. A resume requires its own human confirmation and final approval.
const inventory={method:'GET',url:'https://cloudfunctions.googleapis.com/v2/projects/'+PROJECT+'/locations/-/functions?filter=environment%3D%22GEN_2%22'};
function resumeRequests(){return [structuredClone(inventory),...canonical.requests.filter(r=>
  r.body?.buildConfig?.entryPoint!=='createProfile'&&!r.url.includes('${OPERATION:createProfile}')).map(r=>structuredClone(r))];}
function validateExistingInventory(body,slots,diagnostic){
  const fail=()=>{diagnostic?.validation('existing.inventory');throw Error('DEPLOYMENT_STOPPED');};
  if(!body||!Array.isArray(body.functions)||body.functions.length!==1||
    (body.nextPageToken!==undefined&&body.nextPageToken!=='')||
    (body.unreachable!==undefined&&(!Array.isArray(body.unreachable)||body.unreachable.length)))fail();
  return require('./function-response.cjs').validateFunction(body.functions[0],'createProfile',slots,diagnostic,{existing:true});
}
module.exports={RESUME_CONFIRMATION,resumeRequests,validateExistingInventory};
