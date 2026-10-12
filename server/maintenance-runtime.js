import {getFirestore} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';
import {databaseAccess} from './database.js';
import {createDeletionService} from './deletion-service.js';
import {createDeletionMaintenance,createCompletedDeletionPurger} from './deletion-maintenance.js';
import {createRateLimitPurger} from './request-security.js';

// No exported Cloud Function / deployed scheduler yet. Stage 2 must choose a
// schedule and approve estimated costs before wiring this worker to a trigger.
export function createMaintenanceRuntime({db=getFirestore(),auth=getAuth(),now=Date.now}={}) {
  const {transact,deleteRelated,page}=databaseAccess(db);
  const remove=createDeletionService({transact,deleteRelated,deleteAuth:uid=>auth.deleteUser(uid),now});
  const purge=createCompletedDeletionPurger({transact,getUser:uid=>auth.getUser(uid),now});
  const purgeRate=createRateLimitPurger({transact,now});
  return async()=>{
    const timestamp=now();
    const deletion=await createDeletionMaintenance({remove,purge,
      pendingPage:page(db.collection('deletions').where('status','==','pending')),
      expiredPage:page(db.collection('deletions').where('expiresAt','<=',timestamp)),
    })();
    const rate={purged:0,retained:0,failed:0};let cursor;
    const readPage=page(db.collection('rateLimits').where('expiresAt','<=',timestamp));
    do {const items=await readPage(cursor);for(const uid of items.ids){
      try{if(await purgeRate(uid))rate.purged++;else rate.retained++;}catch{rate.failed++;}
    }cursor=items.next;}while(cursor);
    return {deletion,rate};
  };
}
