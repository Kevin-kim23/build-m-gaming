// A private HTTP protocol, deliberately not a Firebase callable.
// No raw errors, identities, request bodies, authorization headers or tokens log.
const ERRORS=Object.freeze({
  'invalid-moderation-request':400,
  'moderation-report-unavailable':404,'moderation-action-unavailable':404,
  'moderation-record-invalid':409,'moderation-report-changed':409,'moderation-target-unavailable':409,
  'moderation-target-changed':409,'moderation-action-conflict':409,'moderation-action-reverted':409,
  'moderation-nickname-conflict':409,'account-deleting':409,
});
function validBody(body) {
  if(!body||typeof body!=='object'||Array.isArray(body)||!Object.hasOwn(body,'operation'))return false;
  try {return Buffer.byteLength(JSON.stringify(body),'utf8')<=2048;}
  catch {return false;}
}
export function createModerationHandler({verifyModerator,service}) {
  return async (request,response)=>{
    response.set('Cache-Control','no-store');
    if(request.method!=='POST')return response.status(405).json({error:'method-not-allowed'});
    let actor;
    try {actor=await verifyModerator(request.get('authorization'));}
    catch {return response.status(403).json({error:'admin-access-denied'});}
    const body=request.body;
    if(!validBody(body))
      return response.status(400).json({error:'invalid-admin-request'});
    try {
      const {operation,...data}=body;
      if(!['list','inspect','resolve','revert'].includes(operation))return response.status(400).json({error:'invalid-admin-request'});
      const result=await service[operation](actor,data);
      return response.status(200).json({result});
    } catch(error) {
      if(error?.code==='moderation-cleanup-pending')return response.status(503).json({
        error:'moderation-cleanup-pending',actionApplied:true,cleanupPending:true,retryWithSameActionId:true,
        message:'조치는 이미 반영됐습니다. 정리가 남아 있으니 같은 actionId로 재시도하세요.',
      });
      if(Object.hasOwn(ERRORS,error?.code))return response.status(ERRORS[error.code]).json({error:error.code});
      return response.status(500).json({error:'moderation-failed'});
    }
  };
}
