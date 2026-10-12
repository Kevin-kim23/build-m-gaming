import {requireUid,ServiceError} from './profile-service.js';
import {SECURITY_POLICY} from './security-policy.js';
import {clearMaintenanceCursorReferences} from './deletion-maintenance.js';

export function createDeletionService({transact,deleteAuth,deleteRelated=async()=>{},now=Date.now}) {
  return async uid=>{
    requireUid(uid);
    const completed=await transact(async tx=>{
      const profile=await tx.get(`profiles/${uid}`);
      const existing=await tx.get(`deletions/${uid}`);
      const claim=profile?await tx.get(`nicknames/${profile.nicknameKey}`):null;
      if(existing?.status==='completed')return true;
      tx.set(`deletions/${uid}`,{requestedAt:existing?.requestedAt??now(),status:'pending',
        attempts:(existing?.attempts??0)+1,lastAttemptAt:now()});
      if(claim?.uid===uid)tx.delete(`nicknames/${profile.nicknameKey}`);
      for(const collection of ['profiles','saves','saveBackups','initialSaves','rankingApprovals','rankingCandidates'])tx.delete(`${collection}/${uid}`);
      return false;
    });
    if(completed)return {deleted:true};
    // Reports cannot be created after the tombstone transaction: report writes
    // read both users' deletion records and conflict/retry if deletion wins.
    try { await deleteRelated(uid); }
    catch { throw new ServiceError('deletion-pending'); }
    try { await deleteAuth(uid); }
    catch(error){if(error?.code!=='auth/user-not-found')throw new ServiceError('deletion-pending');}
    await transact(async tx=>{
      const record=await tx.get(`deletions/${uid}`);
      if(record?.status==='completed')return;
      const completedAt=now();
      await clearMaintenanceCursorReferences(tx,[{collection:'rateLimits',id:uid},{collection:'reportDaily',id:uid}]);
      tx.delete(`rateLimits/${uid}`);
      tx.delete(`reportDaily/${uid}`);
      tx.set(`deletions/${uid}`,{...record,status:'completed',completedAt,
        expiresAt:completedAt+SECURITY_POLICY.deletionRetentionMs});
    });
    return {deleted:true};
  };
}
