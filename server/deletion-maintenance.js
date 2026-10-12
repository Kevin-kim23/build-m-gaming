import {SECURITY_POLICY} from './security-policy.js';
import {randomUUID} from 'node:crypto';
import {MAINTENANCE_POLICY} from './maintenance-policy.js';
import {requireUid} from './profile-service.js';

const JOBS=['deletion-retry','expired-records'];
const CURSOR_COLLECTIONS=new Set(['deletions','rateLimits','reportDaily','nicknameReports','moderationActions','moderationCleanup']);
const withoutId=cursor=>Number.isFinite(cursor?.expiresAt)?{expiresAt:cursor.expiresAt,
  ...(Number.isFinite(cursor.updatedAt)?{updatedAt:cursor.updatedAt}:{})}:null;

// Read all metadata before writing, so callers can delete the original records
// in this same transaction. This also clears a cursor held by the other job.
export async function clearMaintenanceCursorReferences(tx,references) {
  const matches=new Set(references.map(({collection,id})=>`${collection}/${id}`));
  const records=await Promise.all(JOBS.map(async job=>({path:`maintenanceRuns/${job}`,record:await tx.get(`maintenanceRuns/${job}`)})));
  for(const {path,record} of records) {
    if(!record)continue;
    const cursors={...record.cursors};let changed=false;
    for(const [collection,cursor] of Object.entries(cursors))if(matches.has(`${collection}/${cursor?.id}`)) {
      const replacement=withoutId(cursor);
      if(replacement)cursors[collection]=replacement;else delete cursors[collection];
      changed=true;
    }
    if(changed)tx.set(path,{...record,cursors});
  }
}

async function liveCursors(tx,cursors) {
  const result={};
  for(const [collection,cursor] of Object.entries(cursors)) {
    if(!CURSOR_COLLECTIONS.has(collection))continue;
    if(typeof cursor?.id==='string'&&cursor.id&&!cursor.id.includes('/')&&await tx.get(`${collection}/${cursor.id}`))result[collection]=cursor;
    else {const replacement=withoutId(cursor);if(replacement)result[collection]=replacement;}
  }
  return result;
}

// Scheduler-independent worker. The scheduled trigger and its costs must be
// approved before deployment. Page cursors keep one failed request from
// starving later requests. Return counts only, never identifiers or SDK errors.
export function createDeletionMaintenance({pendingPage,expiredPage,remove,purge}) {
  return async () => {
    const result={retried:0,completed:0,retryFailed:0,purged:0,retained:0,purgeFailed:0};
    for(const [readPage,visit] of [
      [pendingPage,async uid=>{result.retried++;try{await remove(uid);result.completed++;}catch{result.retryFailed++;}}],
      [expiredPage,async uid=>{try{if(await purge(uid))result.purged++;else result.retained++;}catch{result.purgeFailed++;}}],
    ]) {
      let cursor;
      do {const page=await readPage(cursor);for(const uid of page.ids)await visit(uid);cursor=page.next;} while(cursor);
    }
    return result;
  };
}

export function createCompletedDeletionPurger({transact,getUser,now=Date.now}) {
  return async uid=>{
    // Never remove the barrier while the old authentication account still exists.
    try {await getUser(uid);return false;}
    catch(error){if(error?.code!=='auth/user-not-found')throw error;}
    return transact(async tx=>{
      const path=`deletions/${uid}`, record=await tx.get(path);
      if(record?.status!=='completed'||!Number.isFinite(record.completedAt)||
        now()<record.completedAt+SECURITY_POLICY.deletionRetentionMs)return false;
      await clearMaintenanceCursorReferences(tx,[{collection:'deletions',id:uid}]);
      tx.delete(path);return true;
    });
  };
}

// Cursor IDs can identify an account. Clear them at scan end or after 90 days
// on the next run. Checkpoints contain no game data, nickname or raw error.
export function createMaintenanceCoordinator({transact,now=Date.now,token=randomUUID,policy=MAINTENANCE_POLICY}) {
  const path=job=>{
    if(!['deletion-retry','expired-records'].includes(job))throw Error('maintenance-invalid-job');
    return `maintenanceRuns/${job}`;
  };
  return {
    claim:(job,invocationId)=>transact(async tx=>{
      const key=path(job),record=await tx.get(key)??{},time=now();
      if(record.lastCompletedInvocation===invocationId)return {skipped:'duplicate'};
      if(record.leaseUntil>time)throw Error('maintenance-busy');
      const attempts=record.activeInvocation===invocationId?(record.attempts??0)+1:1;
      if(attempts>policy.maxInvocationAttempts)return {skipped:'retry-limit'};
      const cursors=await liveCursors(tx,Object.fromEntries(Object.entries(record.cursors??{}).filter(([,cursor])=>
        Number.isFinite(cursor?.updatedAt)&&cursor.updatedAt+policy.cursorRetentionMs>time)));
      const leaseToken=token();
      tx.set(key,{...record,cursors,activeInvocation:invocationId,attempts,leaseToken,leaseUntil:time+policy.leaseMs,updatedAt:time});
      return {leaseToken,cursors,nextSource:Number.isSafeInteger(record.nextSource)?record.nextSource:0};
    }),
    checkpoint:(job,leaseToken,cursors,nextSource)=>transact(async tx=>{
      const key=path(job),record=await tx.get(key),time=now();
      if(record?.leaseToken!==leaseToken||record.leaseUntil<=time)throw Error('maintenance-lease-lost');
      // Another worker/account deletion may have removed a cursor's source
      // since this process read it. Never resurrect its ID from a cached cursor.
      const retained=await liveCursors(tx,cursors);
      tx.set(key,{...record,cursors:retained,...(nextSource===undefined?{}:{nextSource}),leaseUntil:time+policy.leaseMs,updatedAt:time});
    }),
    release:(job,leaseToken,completed)=>transact(async tx=>{
      const key=path(job),record=await tx.get(key);
      if(record?.leaseToken!==leaseToken)return;
      tx.set(key,{...record,leaseToken:null,leaseUntil:0,updatedAt:now(),
        ...(completed?{lastCompletedInvocation:record.activeInvocation}:{})});
    }),
  };
}

// Cap sources separately so a busy queue cannot consume every other queue's
// slot. Durable cursors pass failed items and survive delivery retries.
export function createBoundedMaintenanceJob({job,sources,coordinator,now=Date.now,policy=MAINTENANCE_POLICY}) {
  return async(invocationId=randomUUID())=>{
    const startedAt=now(),lease=await coordinator.claim(job,invocationId);
    if(lease.skipped)return {skipped:lease.skipped,visited:0,failed:0,collections:{}};
    const cursors={...lease.cursors},localCursors={...lease.cursors},result={visited:0,failed:0,budgetReached:false,limitReached:false,collections:{}};
    let completed=false;
    try {
      const start=((lease.nextSource??0)%sources.length+sources.length)%sources.length;
      for(let offset=0;offset<sources.length;offset++) {
        if(now()-startedAt>=policy.workerBudgetMs){result.budgetReached=true;break;}
        const index=(start+offset)%sources.length,source=sources[index];
        // Rotate the starting queue if the time budget interrupts this pass.
        await coordinator.checkpoint(job,lease.leaseToken,cursors,(index+1)%sources.length);
        const counts=result.collections[source.name]={visited:0,purged:0,retained:0,failed:0};
        while(counts.visited<source.limit) {
          if(now()-startedAt>=policy.workerBudgetMs){result.budgetReached=true;break;}
          const limit=Math.min(policy.pageSize,source.limit-counts.visited);
          const page=await source.readPage(localCursors[source.name]??null,limit);
          if(!page.items.length){delete cursors[source.name];delete localCursors[source.name];await coordinator.checkpoint(job,lease.leaseToken,cursors);break;}
          let pageFinished=true;
          const concurrency=source.concurrency??1;
          for(let offset=0;offset<page.items.length;offset+=concurrency) {
            if(now()-startedAt>=policy.workerBudgetMs){result.budgetReached=true;pageFinished=false;break;}
            const wave=page.items.slice(offset,offset+concurrency);
            const outcomes=await Promise.all(wave.map(async item=>{
              try{return await source.visit(item.id)?'purged':'retained';}catch{return 'failed';}
            }));
            for(const outcome of outcomes){counts[outcome]++;if(outcome==='failed')result.failed++;}
            counts.visited+=wave.length;result.visited+=wave.length;
            // Advance only after every item in this ordered wave settled.
            localCursors[source.name]={...wave.at(-1).cursor,updatedAt:now()};
            if(source.expiryCursor) {
              const surviving=wave.filter((_,index)=>outcomes[index]!=='purged').at(-1);
              cursors[source.name]=surviving?{...surviving.cursor,updatedAt:now()}:withoutId(localCursors[source.name]);
            } else cursors[source.name]=localCursors[source.name];
            await coordinator.checkpoint(job,lease.leaseToken,cursors);
          }
          if(pageFinished&&page.items.length<limit){delete cursors[source.name];delete localCursors[source.name];await coordinator.checkpoint(job,lease.leaseToken,cursors);break;}
          if(result.budgetReached)break;
        }
        // This signals potential backlog without an extra billed query.
        if(counts.visited===source.limit)result.limitReached=true;
        if(result.budgetReached)break;
      }
      completed=true;
      return result;
    } finally {
      await coordinator.release(job,lease.leaseToken,completed);
    }
  };
}

export function createExpiredRecordPurger({transact,collection,now=Date.now,eligible=()=>true}) {
  if(!['rateLimits','reportDaily','nicknameReports','moderationActions'].includes(collection))throw Error('maintenance-invalid-collection');
  return id=>transact(async tx=>{
    const path=`${collection}/${id}`,record=await tx.get(path);
    if(!record||!Number.isFinite(record.expiresAt)||record.expiresAt>now()||!eligible(record))return false;
    await clearMaintenanceCursorReferences(tx,[{collection,id}]);
    tx.delete(path);return true;
  });
}

// The minimum retry job outlives a 90-day moderation audit when cleanup failed;
// successful cleanup removes it without recreating an expired audit record.
export function createModerationCleanupRetrier({transact,cleanupDedup}) {
  return async id=>{
    const path=`moderationCleanup/${id}`,job=await transact(tx=>tx.get(path));
    if(!job)return false;
    requireUid(job.targetUid);requireUid(job.reporterUid);
    if(!Number.isSafeInteger(job.obsoleteRevision)||job.obsoleteRevision<0)throw Error('maintenance-cleanup-invalid');
    await cleanupDedup(job.targetUid,job.obsoleteRevision);
    return transact(async tx=>{
      const current=await tx.get(path),audit=await tx.get(`moderationActions/${id}`);
      if(!current)return false;
      if(current.targetUid!==job.targetUid||current.reporterUid!==job.reporterUid||current.obsoleteRevision!==job.obsoleteRevision)
        throw Error('maintenance-cleanup-changed');
      if(audit&&(audit.targetUid!==job.targetUid||audit.reporterUid!==job.reporterUid||audit.cleanupObsoleteRevision!==job.obsoleteRevision))
        throw Error('maintenance-cleanup-changed');
      await clearMaintenanceCursorReferences(tx,[{collection:'moderationCleanup',id}]);
      tx.delete(path);
      if(audit?.cleanupPending)tx.set(`moderationActions/${id}`,{...audit,cleanupPending:false});
      return true;
    });
  };
}
