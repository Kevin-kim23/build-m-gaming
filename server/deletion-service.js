import {requireUid,ServiceError} from './profile-service.js';

export function createDeletionService({transact,deleteAuth,now=Date.now}) {
  return async uid=>{
    requireUid(uid);
    await transact(async tx=>{
      const profile=await tx.get(`profiles/${uid}`);
      const existing=await tx.get(`deletions/${uid}`);
      const claim=profile?await tx.get(`nicknames/${profile.nicknameKey}`):null;
      tx.set(`deletions/${uid}`,existing??{requestedAt:now(),status:'pending'});
      if(claim?.uid===uid)tx.delete(`nicknames/${profile.nicknameKey}`);
      for(const collection of ['profiles','saves','saveBackups','initialSaves','rankingApprovals','rankingCandidates'])tx.delete(`${collection}/${uid}`);
    });
    try { await deleteAuth(uid); }
    catch(error){if(error?.code!=='auth/user-not-found')throw new ServiceError('deletion-pending');}
    await transact(async tx=>{
      const record=await tx.get(`deletions/${uid}`);
      tx.set(`deletions/${uid}`,{...record,status:'completed',completedAt:now()});
    });
    return {deleted:true};
  };
}
