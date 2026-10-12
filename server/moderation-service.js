import {createHash} from 'node:crypto';
import {ServiceError,requireUid,normalizeNicknameForLookup} from './profile-service.js';
import {REPORT_POLICY} from './report-policy.js';

const HEX=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const DECISIONS=new Set(['warn','default-rename','dismiss']);
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const reject=code=>{throw new ServiceError(code);};
const version=value=>Number.isSafeInteger(value)&&value>=0?value:reject('moderation-record-invalid');
const increment=value=>value<Number.MAX_SAFE_INTEGER?value+1:reject('moderation-record-invalid');
const notice=value=>value===undefined||value===null?null:
  ['warning','renamed'].includes(value.kind)&&Number.isSafeInteger(value.issuedAt)&&value.issuedAt>=0
    ?{kind:value.kind,issuedAt:value.issuedAt}:reject('moderation-record-invalid');
function input(value,keys) {
  if(!value||typeof value!=='object'||Array.isArray(value)
    ||Object.keys(value).some(key=>!keys.includes(key)))reject('invalid-moderation-request');
  return value;
}
function actor(context) {
  if(typeof context?.actorHash!=='string'||!HEX.test(context.actorHash))reject('admin-auth-required');
  return context.actorHash;
}
function reportId(value) {if(typeof value!=='string'||!HEX.test(value))reject('invalid-moderation-request');return value;}
function actionId(value) {if(typeof value!=='string'||!UUID.test(value))reject('invalid-moderation-request');return value.toLowerCase();}
function expectedVersion(value) {if(!Number.isSafeInteger(value)||value<0)reject('invalid-moderation-request');return value;}
function fingerprint(actorHash,data) {
  return hash([actorHash,data.reportId,data.actionId,data.decision??'revert',data.originalActionId??null,data.expectedVersion]);
}
function reportView(id,report) {
  return {reportId:id,status:report.status,version:version(report.version??0),nickname:report.nickname,
    nicknameRevision:version(report.nicknameRevision??0),reason:report.reason,createdAt:report.createdAt,
    completedAt:report.completedAt??null,actionId:report.actionId??null};
}
function receipt(record) {
  return {actionId:record.actionId,reportId:record.reportId,
    status:record.revertedBy?'reverted':record.kind==='revert'?'pending':record.kind==='dismiss'?'dismissed':'resolved',
    version:record.afterReportVersion,nicknameRevision:record.afterRevision,cleanupPending:!!record.cleanupPending};
}
function profileState(profile) {
  const identity=normalizeNicknameForLookup(profile.nickname);
  if(identity.key!==profile.nicknameKey)reject('moderation-record-invalid');
  return {nickname:profile.nickname,key:profile.nicknameKey,revision:version(profile.nicknameRevision??0),
    actionVersion:version(profile.moderationVersion??0),notice:notice(profile.moderationNotice)};
}
async function participants(tx,record) {
  requireUid(record.reporterUid);requireUid(record.targetUid);
  const reporterDeletion=await tx.get(`deletions/${record.reporterUid}`);
  const targetDeletion=await tx.get(`deletions/${record.targetUid}`);
  const profile=await tx.get(`profiles/${record.targetUid}`);
  if(reporterDeletion||targetDeletion)reject('account-deleting');
  if(!profile)reject('moderation-target-unavailable');
  return profile;
}
function applyProfile(profile,state) {
  const updated={...profile,nickname:state.nickname,nicknameKey:state.key,
    nicknameRevision:state.revision,moderationVersion:state.actionVersion};
  if(state.notice)updated.moderationNotice=state.notice;
  else delete updated.moderationNotice;
  return updated;
}
function audit({data,actorHash,report,before,after,timestamp,kind}) {
  return {actionId:data.actionId,reportId:data.reportId,reporterUid:report.reporterUid,targetUid:report.targetUid,
    actorHash,kind,requestHash:fingerprint(actorHash,data),expectedVersion:data.expectedVersion,
    beforeNickname:before.nickname,beforeNicknameKey:before.key,beforeRevision:before.revision,
    beforeActionVersion:before.actionVersion,beforeModerationNotice:before.notice,
    afterNickname:after.nickname,afterNicknameKey:after.key,afterRevision:after.revision,
    afterActionVersion:after.actionVersion,afterModerationNotice:after.notice,
    beforeReportVersion:version(report.version??0),afterReportVersion:increment(version(report.version??0)),
    createdAt:timestamp,expiresAt:timestamp+REPORT_POLICY.completedRetentionMs};
}
function cleanupJob(record) {
  // Keep retry work separate from 90-day audit data. No nickname or report
  // reason survives here; account deletion removes this minimal job as well.
  return {reporterUid:record.reporterUid,targetUid:record.targetUid,
    obsoleteRevision:record.cleanupObsoleteRevision,createdAt:record.createdAt};
}

// Private administrator entry points only. Actor hashes must be derived by the
// IAM/OIDC handler; no player UID, profile, nickname or free-text notes are input.
export function createModerationService({transact,listPending,cleanupDedup,now=Date.now}) {
  async function finish(record) {
    if(!record.cleanupPending)return receipt(record);
    // The profile transaction has already committed. A durable marker and the
    // same action ID make a partial cleanup retryable without reapplying action.
    try {await cleanupDedup(record.targetUid,record.cleanupObsoleteRevision);}
    catch {reject('moderation-cleanup-pending');}
    let latest;
    try {
      latest=await transact(async tx=>{
        const job=await tx.get(`moderationCleanup/${record.actionId}`);
        const current=await tx.get(`moderationActions/${record.actionId}`);
        if(current&&current.requestHash!==record.requestHash)reject('moderation-action-unavailable');
        if(job&&(job.targetUid!==record.targetUid||job.reporterUid!==record.reporterUid
          ||job.obsoleteRevision!==record.cleanupObsoleteRevision))reject('moderation-record-invalid');
        if(job)tx.delete(`moderationCleanup/${record.actionId}`);
        if(current?.cleanupPending)tx.set(`moderationActions/${record.actionId}`,{...current,cleanupPending:false});
        return {...(current??record),cleanupPending:false};
      });
    } catch(error) {
      if(error instanceof ServiceError)throw error;
      reject('moderation-cleanup-pending');
    }
    return receipt(latest);
  }
  async function retry(tx,existing,data,actorHash) {
    if(existing.requestHash!==fingerprint(actorHash,data))reject('moderation-action-conflict');
    await participants(tx,existing);
    return existing;
  }
  return {
    async list(context,data={}) {
      actor(context);input(data,['limit','cursor']);
      const limit=data.limit??20,cursor=data.cursor??null;
      if(!Number.isSafeInteger(limit)||limit<1||limit>50||cursor!==null&&(typeof cursor!=='string'||!HEX.test(cursor)))reject('invalid-moderation-request');
      const page=await listPending({limit,cursor});
      return {items:page.items.map(item=>reportView(reportId(item.id),item)),nextCursor:page.nextCursor??null};
    },
    async inspect(context,data) {
      actor(context);input(data,['reportId']);reportId(data.reportId);
      return transact(async tx=>{
        const report=await tx.get(`nicknameReports/${data.reportId}`);
        if(!report)reject('moderation-report-unavailable');
        const profile=await participants(tx,report),current=profileState(profile);
        return {...reportView(data.reportId,report),target:{nickname:current.nickname,
          nicknameRevision:current.revision,moderationVersion:current.actionVersion,moderationNotice:current.notice}};
      });
    },
    async resolve(context,request) {
      const actorHash=actor(context),data={...input(request,['reportId','actionId','decision','expectedVersion'])};
      data.reportId=reportId(data.reportId);data.actionId=actionId(data.actionId);expectedVersion(data.expectedVersion);
      if(!DECISIONS.has(data.decision))reject('invalid-moderation-request');
      const timestamp=version(now());
      const record=await transact(async tx=>{
        const existing=await tx.get(`moderationActions/${data.actionId}`);
        if(existing)return retry(tx,existing,data,actorHash);
        const report=await tx.get(`nicknameReports/${data.reportId}`);
        if(!report)reject('moderation-report-unavailable');
        if(report.status!=='pending'||version(report.version??0)!==data.expectedVersion)reject('moderation-report-changed');
        const profile=await participants(tx,report),before=profileState(profile);
        if(data.decision!=='dismiss'&&(before.revision!==version(report.nicknameRevision??0)
          ||normalizeNicknameForLookup(report.nickname).key!==before.key))reject('moderation-target-changed');
        const after={...before,actionVersion:increment(before.actionVersion)};
        let oldClaim=null;
        if(data.decision==='warn')after.notice={kind:'warning',issuedAt:timestamp};
        if(data.decision==='default-rename') {
          oldClaim=await tx.get(`nicknames/${before.key}`);
          const choices=[];
          for(let attempt=0;attempt<3;attempt++) {
            const nickname=`유저${hash([report.targetUid,data.actionId,attempt]).slice(0,8)}`;
            const key=normalizeNicknameForLookup(nickname).key;
            choices.push({nickname,key,claim:await tx.get(`nicknames/${key}`)});
          }
          const chosen=choices.find(item=>item.key!==before.key&&(!item.claim||item.claim.uid===report.targetUid));
          if(!chosen)reject('moderation-nickname-conflict');
          after.nickname=chosen.nickname;after.key=chosen.key;after.revision=increment(before.revision);
          after.notice={kind:'renamed',issuedAt:timestamp};
        }
        const action=audit({data,actorHash,report,before,after,timestamp,kind:data.decision});
        if(data.decision==='default-rename') {
          action.cleanupPending=true;action.cleanupObsoleteRevision=before.revision;
          tx.set(`moderationCleanup/${data.actionId}`,cleanupJob(action));
          if(oldClaim?.uid===report.targetUid)tx.delete(`nicknames/${before.key}`);
          tx.set(`nicknames/${after.key}`,{uid:report.targetUid});
        }
        tx.set(`profiles/${report.targetUid}`,applyProfile(profile,after));
        tx.set(`nicknameReports/${data.reportId}`,{...report,status:data.decision==='dismiss'?'dismissed':'resolved',
          version:action.afterReportVersion,actionId:data.actionId,decision:data.decision,
          completedAt:timestamp,expiresAt:timestamp+REPORT_POLICY.completedRetentionMs});
        tx.set(`moderationActions/${data.actionId}`,action);
        return action;
      });
      return finish(record);
    },
    async revert(context,request) {
      const actorHash=actor(context),data={...input(request,['reportId','actionId','originalActionId','expectedVersion'])};
      data.reportId=reportId(data.reportId);data.actionId=actionId(data.actionId);
      data.originalActionId=actionId(data.originalActionId);expectedVersion(data.expectedVersion);
      if(data.actionId===data.originalActionId)reject('invalid-moderation-request');
      const timestamp=version(now());
      const record=await transact(async tx=>{
        const existing=await tx.get(`moderationActions/${data.actionId}`);
        if(existing)return retry(tx,existing,data,actorHash);
        const original=await tx.get(`moderationActions/${data.originalActionId}`);
        if(!original||original.reportId!==data.reportId||!DECISIONS.has(original.kind))reject('moderation-action-unavailable');
        if(original.revertedBy)reject('moderation-action-reverted');
        const report=await tx.get(`nicknameReports/${data.reportId}`);
        if(!report)reject('moderation-report-unavailable');
        if(version(report.version??0)!==data.expectedVersion||report.actionId!==data.originalActionId
          ||data.expectedVersion!==original.afterReportVersion||report.status==='pending')reject('moderation-report-changed');
        if(report.reporterUid!==original.reporterUid||report.targetUid!==original.targetUid)reject('moderation-record-invalid');
        const profile=await participants(tx,report),before=profileState(profile);
        if(before.nickname!==original.afterNickname||before.key!==original.afterNicknameKey
          ||before.revision!==original.afterRevision||before.actionVersion!==original.afterActionVersion
          ||JSON.stringify(before.notice)!==JSON.stringify(original.afterModerationNotice))reject('moderation-target-changed');
        const after={nickname:original.beforeNickname,key:original.beforeNicknameKey,revision:before.revision,
          actionVersion:increment(before.actionVersion),notice:notice(original.beforeModerationNotice)};
        let currentClaim=null;
        if(original.kind==='default-rename') {
          const priorClaim=await tx.get(`nicknames/${after.key}`);
          currentClaim=await tx.get(`nicknames/${before.key}`);
          if(priorClaim&&priorClaim.uid!==report.targetUid)reject('moderation-nickname-conflict');
          after.revision=increment(before.revision);
        }
        const action=audit({data,actorHash,report,before,after,timestamp,kind:'revert'});
        action.originalActionId=data.originalActionId;
        if(original.kind==='default-rename') {
          action.cleanupPending=true;action.cleanupObsoleteRevision=before.revision;
          tx.set(`moderationCleanup/${data.actionId}`,cleanupJob(action));
          if(currentClaim?.uid===report.targetUid)tx.delete(`nicknames/${before.key}`);
          tx.set(`nicknames/${after.key}`,{uid:report.targetUid});
        }
        const pending={...report,status:'pending',version:action.afterReportVersion};
        for(const key of ['completedAt','expiresAt','actionId','decision'])delete pending[key];
        // Reopened reports follow the restored nickname's new generation; old
        // dedup guards must not prevent a fresh report for that restored name.
        if(original.kind==='default-rename'){pending.nickname=after.nickname;pending.nicknameRevision=after.revision;}
        tx.set(`profiles/${report.targetUid}`,applyProfile(profile,after));
        tx.set(`nicknameReports/${data.reportId}`,pending);
        tx.set(`moderationActions/${data.originalActionId}`,{...original,revertedBy:data.actionId,revertedAt:timestamp});
        tx.set(`moderationActions/${data.actionId}`,action);
        return action;
      });
      return finish(record);
    },
  };
}
