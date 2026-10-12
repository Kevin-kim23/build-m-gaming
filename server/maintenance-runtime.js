import {getFirestore,FieldPath} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';
import {randomUUID} from 'node:crypto';
import {databaseAccess} from './database.js';
import {createDeletionService} from './deletion-service.js';
import {createCompletedDeletionPurger,createExpiredRecordPurger,createMaintenanceCoordinator,createBoundedMaintenanceJob,createModerationCleanupRetrier} from './deletion-maintenance.js';
import {createRateLimitPurger} from './request-security.js';
import {MAINTENANCE_POLICY} from './maintenance-policy.js';

// No deployment is performed here. Both triggers and the former emulator-only
// combined worker use the same bounded, leased implementation.
export function createMaintenanceRuntime({db=getFirestore(),auth=getAuth(),now=Date.now,policy=MAINTENANCE_POLICY}={}) {
  const {transact,deleteRelated,cleanupDedup}=databaseAccess(db);
  const remove=createDeletionService({transact,deleteRelated,deleteAuth:uid=>auth.deleteUser(uid),now});
  const purge=createCompletedDeletionPurger({transact,getUser:uid=>auth.getUser(uid),now});
  const purgeRate=createRateLimitPurger({transact,now});
  const coordinator=createMaintenanceCoordinator({transact,now,policy});
  const expiredSource=(collection,visit)=>({name:collection,limit:policy.expiryLimits[collection],concurrency:policy.expiryConcurrency,expiryCursor:true,visit,
    readPage:async(cursor,limit)=>{
      let query=db.collection(collection).where('expiresAt','<=',now()).orderBy('expiresAt').orderBy(FieldPath.documentId()).limit(limit);
      if(cursor)query=cursor.id?query.startAfter(cursor.expiresAt,cursor.id):query.startAt(cursor.expiresAt);
      const snapshot=await query.get();
      return {items:snapshot.docs.map(doc=>({id:doc.id,cursor:{id:doc.id,expiresAt:doc.data().expiresAt}}))};
    }});
  const pending={name:'deletions',limit:policy.deletionLimit,visit:async uid=>{await remove(uid);return true;},
    readPage:async(cursor,limit)=>{
      let query=db.collection('deletions').where('status','==','pending').orderBy(FieldPath.documentId()).limit(limit);
      if(cursor)query=query.startAfter(cursor.id);
      const snapshot=await query.get();
      return {items:snapshot.docs.map(doc=>({id:doc.id,cursor:{id:doc.id}}))};
    }};
  const moderationCleanup={name:'moderationCleanup',limit:policy.moderationCleanupLimit,
    visit:createModerationCleanupRetrier({transact,cleanupDedup}),readPage:async(cursor,limit)=>{
      let query=db.collection('moderationCleanup').orderBy(FieldPath.documentId()).limit(limit);
      if(cursor)query=query.startAfter(cursor.id);
      const snapshot=await query.get();
      return {items:snapshot.docs.map(doc=>({id:doc.id,cursor:{id:doc.id}}))};
    }};
  const retry=createBoundedMaintenanceJob({job:'deletion-retry',sources:[pending,moderationCleanup],coordinator,now,policy});
  const expiry=createBoundedMaintenanceJob({job:'expired-records',coordinator,now,policy,sources:[
    expiredSource('deletions',purge),expiredSource('rateLimits',purgeRate),
    ...['reportDaily','nicknameReports','moderationActions'].map(collection=>expiredSource(collection,
      createExpiredRecordPurger({transact,collection,now,
        eligible:record=>collection!=='nicknameReports'||['resolved','dismissed'].includes(record.status)}))),
  ]});
  return async({kind='all',invocationId=randomUUID()}={})=>{
    if(kind==='deletion')return retry(invocationId);
    if(kind==='expiry')return expiry(invocationId);
    if(kind!=='all')throw Error('maintenance-invalid-kind');
    const retried=await retry(invocationId),expired=await expiry(invocationId);
    const retryCounts=retried.collections.deletions??{},purgeCounts=expired.collections.deletions??{};
    return {deletion:{retried:retryCounts.visited??0,completed:retryCounts.purged??0,retryFailed:retryCounts.failed??0,
      purged:purgeCounts.purged??0,retained:purgeCounts.retained??0,purgeFailed:purgeCounts.failed??0},
      rate:expired.collections.rateLimits??{},expired};
  };
}
