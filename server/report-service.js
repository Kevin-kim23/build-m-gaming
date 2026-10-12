import {createHash} from 'node:crypto';
import {requireUid,ServiceError,normalizeNicknameForLookup} from './profile-service.js';
import {REPORT_POLICY} from './report-policy.js';

export const NICKNAME_REPORT_REASONS=Object.freeze(['impersonation','abuse','hate','sexual','personal-info']);
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const DAY_MS=24*60*60*1000,KST_OFFSET_MS=9*60*60*1000;

function reportingDay(timestamp) {
  // Asia/Seoul calendar boundaries, independent of the server's local time zone.
  const dayNumber=Math.floor((timestamp+KST_OFFSET_MS)/DAY_MS);
  return {day:new Date(dayNumber*DAY_MS).toISOString().slice(0,10),expiresAt:(dayNumber+1)*DAY_MS-KST_OFFSET_MS};
}

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
      const nicknameRevision=target.nicknameRevision??0;
      if(!Number.isSafeInteger(nicknameRevision)||nicknameRevision<0)throw new ServiceError('report-target-unavailable');
      const id=hash([reporterUid,targetUid,nicknameRevision,key]);
      const path=`nicknameReports/${id}`;
      const dedupPath=`reportDedup/${id}`;
      if(await tx.get(dedupPath))return {submitted:true};
      const existing=await tx.get(path);
      const dedup={reporterUid,targetUid,nicknameRevision,nicknameKeyHash:hash(key)};
      if(existing){tx.set(dedupPath,dedup);return {submitted:true};}
      // The earlier, undeployed draft keyed reports by reason. Preserve any
      // synthetic/preflight records without resetting their status or recounting
      // them. Restrict compatibility to the original nickname generation.
      const legacy=nicknameRevision===0
        ?await Promise.all(NICKNAME_REPORT_REASONS.map(oldReason=>tx.get(`nicknameReports/${hash([reporterUid,targetUid,oldReason])}`)))
        :[];
      const legacyMatch=legacy.some(item=>item?.reporterUid===reporterUid&&item?.targetUid===targetUid
        &&typeof item.nickname==='string'&&item.nickname.normalize('NFKC').trim().toLocaleLowerCase('en-US')===key);
      if(legacyMatch){tx.set(dedupPath,dedup);return {submitted:true};}
      const timestamp=now(),calendar=reportingDay(timestamp);
      const dailyPath=`reportDaily/${reporterUid}`,previous=await tx.get(dailyPath);
      const count=previous?.day===calendar.day?previous.count:0;
      if(!Number.isSafeInteger(count)||count<0)throw new ServiceError('report-limit-unavailable');
      if(count>=REPORT_POLICY.dailyLimit)throw new ServiceError('report-daily-limit');
      tx.set(path,{reporterUid,targetUid,nickname:target.nickname,nicknameRevision,reason,createdAt:timestamp,status:'pending'});
      // Retain the minimum duplicate guard until the nickname changes or either
      // account is deleted, separately from the 90-day completed-report record.
      tx.set(dedupPath,dedup);
      tx.set(dailyPath,{...calendar,count:count+1});
      return {submitted:true};
    });
  };
}
