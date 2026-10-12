import {initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {setGlobalOptions} from 'firebase-functions/v2';
import {createProfileService,ServiceError} from './profile-service.js';
import {createCloudService} from './cloud-service.js';
import {createDeletionService} from './deletion-service.js';
import {validateCloudSave} from './save-validator.js';
import {databaseAccess} from './database.js';
import {createNicknameReportService} from './report-service.js';
import {createRateLimiter,createRequestGuard} from './request-security.js';
import {TRUSTED_APP_IDS} from './security-policy.js';
import {isLocalEmulator} from './runtime-environment.js';
import {createScheduledMaintenance} from './scheduled-maintenance.js';
export {moderateNicknames} from './moderation-runtime.js';

const app=initializeApp();
setGlobalOptions({region:'asia-northeast3',maxInstances:2});
const {transact,deleteRelated}=databaseAccess();
const profiles=createProfileService({transact});
const cloud=createCloudService({transact,validate:validateCloudSave});
const deleteAccount=createDeletionService({transact,deleteRelated,deleteAuth:uid=>getAuth().deleteUser(uid)});
const report=createNicknameReportService({transact});
const projectId=app.options.projectId??process.env.GCLOUD_PROJECT;
const emulator=isLocalEmulator({projectId});
const guard=createRequestGuard({getUser:uid=>getAuth().getUser(uid),limit:createRateLimiter({transact}),
  appIds:TRUSTED_APP_IDS[projectId]??[],emulator});
const errorCode=code=>{
  if(code==='nickname-taken')return 'already-exists';
  if(['invalid-nickname','reserved-nickname','prohibited-nickname','invalid-report-reason','self-report'].includes(code))return 'invalid-argument';
  if(['unauthenticated','account-unavailable','recent-login-required'].includes(code))return 'unauthenticated';
  if(code==='rate-limit')return 'resource-exhausted';
  if(code==='app-check-required')return 'permission-denied';
  if(code==='security-unavailable'||code==='deletion-pending')return 'unavailable';
  return 'failed-precondition';
};
function callable(kind,operation) {
  return onCall(async request=>{
    if(!request.auth)throw new HttpsError('unauthenticated','sign-in-required');
    try{const uid=await guard(request,kind);return await operation(uid,request.data,request.auth.token);}
    catch(error){
      if(error instanceof ServiceError)throw new HttpsError(errorCode(error.code),error.code);
      // Avoid SDK errors that might carry user data.
      throw new HttpsError('internal','request-failed');
    }
  });
}
export const readProfile=callable('read',uid=>profiles.read(uid));
export const createProfile=callable('write',(uid,data)=>profiles.create(uid,data?.nickname));
export const readCloudSave=callable('read',uid=>cloud.read(uid));
export const saveCloudProgress=callable('write',(uid,data)=>cloud.save(uid,data));
export const reportNickname=callable('write',(uid,data)=>report(uid,data));
export const deleteGameAccount=callable('write',(uid,data,token)=>{
  if(!Number.isFinite(token.auth_time)||Date.now()/1000-token.auth_time>300)throw new ServiceError('recent-login-required');
  return deleteAccount(uid);
});
// Source preparation only. These triggers are not deployed during stage 2 prep.
export const {retryAccountDeletions,purgeExpiredServerRecords}=createScheduledMaintenance();
