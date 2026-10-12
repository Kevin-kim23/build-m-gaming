import {createHash} from 'node:crypto';
import {requireUid,ServiceError,normalizeNicknameForLookup} from './profile-service.js';

export const NICKNAME_REPORT_REASONS=Object.freeze(['impersonation','abuse','hate','sexual','personal-info']);

// Firestore client rules remain deny-all. Neither report documents, UIDs nor
// moderation state are returned to the reporting player or a public endpoint.
export function createNicknameReportService({transact,now=Date.now}) {
  return async (reporterUid,data)=>{
    requireUid(reporterUid);
    const {key}=normalizeNicknameForLookup(data?.nickname);
    if(!NICKNAME_REPORT_REASONS.includes(data?.reason))throw new ServiceError('invalid-report-reason');
    const reason=data.reason;
    return transact(async tx=>{
      const reporterDeletion=await tx.get(`deletions/${reporterUid}`);
      const reporter=await tx.get(`profiles/${reporterUid}`);
      const claim=await tx.get(`nicknames/${key}`);
      if(reporterDeletion)throw new ServiceError('account-deleting');
      if(!reporter)throw new ServiceError('profile-required');
      if(!claim)throw new ServiceError('report-target-unavailable');
      const targetUid=claim.uid;
      requireUid(targetUid);
      if(targetUid===reporterUid)throw new ServiceError('self-report');
      const targetDeletion=await tx.get(`deletions/${targetUid}`);
      const target=await tx.get(`profiles/${targetUid}`);
      if(targetDeletion||!target||target.nicknameKey!==key)throw new ServiceError('report-target-unavailable');
      const id=createHash('sha256').update(JSON.stringify([reporterUid,targetUid,reason])).digest('hex');
      const path=`nicknameReports/${id}`;
      const existing=await tx.get(path);
      if(existing)return {submitted:true};
      tx.set(path,{reporterUid,targetUid,nickname:target.nickname,reason,createdAt:now(),status:'pending'});
      return {submitted:true};
    });
  };
}
