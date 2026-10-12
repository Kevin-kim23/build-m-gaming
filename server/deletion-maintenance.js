import {SECURITY_POLICY} from './security-policy.js';

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
      tx.delete(path);return true;
    });
  };
}
