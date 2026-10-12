import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {setGlobalOptions} from 'firebase-functions/v2';
import {createProfileService,ServiceError} from './profile-service.js';
import {createCloudService} from './cloud-service.js';
import {createDeletionService} from './deletion-service.js';
import {validateCloudSave} from './save-validator.js';

initializeApp();
setGlobalOptions({region:'asia-northeast3',maxInstances:2});
const db=getFirestore();
const transact=operation=>db.runTransaction(async transaction=>operation({
  get:async path=>{const snapshot=await transaction.get(db.doc(path));return snapshot.exists?snapshot.data():null;},
  set:(path,value)=>transaction.set(db.doc(path),value),
  delete:path=>transaction.delete(db.doc(path)),
}));
const profiles=createProfileService({transact});
const cloud=createCloudService({transact,validate:validateCloudSave});
const deleteAccount=createDeletionService({transact,deleteAuth:uid=>getAuth().deleteUser(uid)});
function callable(operation) {
  return onCall(async request=>{
    if(!request.auth)throw new HttpsError('unauthenticated','sign-in-required');
    try{return await operation(request.auth.uid,request.data,request.auth.token);}
    catch(error){
      if(error instanceof ServiceError)throw new HttpsError(
        error.code==='nickname-taken'?'already-exists':error.code==='invalid-nickname'||error.code==='reserved-nickname'?'invalid-argument':'failed-precondition',error.code);
      // Avoid SDK errors that might carry user data.
      throw new HttpsError('internal','request-failed');
    }
  });
}
export const readProfile=callable(uid=>profiles.read(uid));
export const createProfile=callable((uid,data)=>profiles.create(uid,data?.nickname));
export const readCloudSave=callable(uid=>cloud.read(uid));
export const saveCloudProgress=callable((uid,data)=>cloud.save(uid,data));
export const deleteGameAccount=callable((uid,data,token)=>{
  if(!Number.isFinite(token.auth_time)||Date.now()/1000-token.auth_time>300)throw new ServiceError('recent-login-required');
  return deleteAccount(uid);
});
