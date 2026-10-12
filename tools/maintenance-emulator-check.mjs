import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {createMaintenanceRuntime} from '../server/maintenance-runtime.js';
import {SECURITY_POLICY} from '../server/security-policy.js';
import {MAINTENANCE_POLICY} from '../server/maintenance-policy.js';

// Never accept a project or host argument: this script uses synthetic records
// only, in the same demo project as server-emulator-check.mjs.
const projectId='demo-budae-kiugi';
for(const key of ['GCLOUD_PROJECT','GOOGLE_CLOUD_PROJECT'])
  if(process.env[key]&&process.env[key]!==projectId)throw Error('Only the demo emulator project is permitted');
for(const [key,value] of Object.entries({FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080'})){
  if(process.env[key]&&process.env[key]!==value)throw Error('Only loopback emulators are permitted');
  process.env[key]=value;
}
const require=createRequire(new URL('../server/package.json',import.meta.url));
const {initializeApp,deleteApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore'),{getAuth}=require('firebase-admin/auth');
const app=initializeApp({projectId},'maintenance-qa'),db=getFirestore(app),auth=getAuth(app);
const prefix='maintenance-qa-'+randomUUID(),timestamp=Date.now(),paths=[];
const path=(collection,suffix)=>`${collection}/${prefix}-${suffix}`;
let phase='seed',failed=false;
try {
  const batch=db.batch();
  function seed(collection,suffix,value){const key=path(collection,suffix);paths.push(key);batch.set(db.doc(key),value);return key;}
  const uids=Array.from({length:105},(_,i)=>`${prefix}-${String(i).padStart(3,'0')}`);
  for(let i=0;i<uids.length;i++)seed('deletions',String(i).padStart(3,'0'),{status:'pending',requestedAt:timestamp});
  const stuckUid=`${prefix}-000`,targetUid=`${prefix}-target`,reporterUid=`${prefix}-reporter`;
  seed('profiles','target',{nickname:'합성검증',nicknameKey:'합성검증',nicknameRevision:1});
  seed('reportDedup','old',{targetUid,reporterUid,nicknameRevision:0});
  seed('reportDedup','current',{targetUid,reporterUid,nicknameRevision:1});
  seed('moderationCleanup','job',{targetUid,reporterUid,obsoleteRevision:0,createdAt:timestamp});
  seed('moderationActions','job',{targetUid,reporterUid,cleanupObsoleteRevision:0,cleanupPending:true,expiresAt:timestamp+1_000_000});
  seed('deletions','expired-completed',{status:'completed',completedAt:timestamp-SECURITY_POLICY.deletionRetentionMs,expiresAt:timestamp});
  seed('deletions','pending-with-expiry',{status:'pending',requestedAt:timestamp,expiresAt:timestamp-1});
  seed('rateLimits','expired',{read:[],write:[],expiresAt:timestamp});
  seed('rateLimits','future',{read:[],write:[],expiresAt:timestamp+1_000_000});
  seed('reportDaily','expired',{count:1,expiresAt:timestamp});
  seed('nicknameReports','resolved',{status:'resolved',completedAt:timestamp-SECURITY_POLICY.deletionRetentionMs,expiresAt:timestamp});
  seed('nicknameReports','pending',{status:'pending',expiresAt:timestamp});
  seed('moderationActions','expired',{expiresAt:timestamp});
  await batch.commit();

  phase='expiry';
  // Small test-only cap forces a durable cursor at an exact batch boundary.
  const runtime=createMaintenanceRuntime({db,auth,now:()=>timestamp,
    policy:{...MAINTENANCE_POLICY,expiryLimits:{...MAINTENANCE_POLICY.expiryLimits,deletions:1}}});
  for(let attempt=0;attempt<4;attempt++){
    const expired=await runtime({kind:'expiry',invocationId:randomUUID()});assert.equal(expired.failed,0);
    if(!(await db.doc(path('deletions','expired-completed')).get()).exists)break;
  }
  for(const [collection,suffix] of [['deletions','expired-completed'],['rateLimits','expired'],['reportDaily','expired'],['nicknameReports','resolved'],['moderationActions','expired']])
    assert.equal((await db.doc(path(collection,suffix)).get()).exists,false);
  for(const [collection,suffix] of [['deletions','pending-with-expiry'],['rateLimits','future'],['nicknameReports','pending'],['reportDedup','current']])
    assert.equal((await db.doc(path(collection,suffix)).get()).exists,true);
  const expiryCheckpoint=(await db.doc('maintenanceRuns/expired-records').get()).data();
  assert.equal(JSON.stringify(expiryCheckpoint).includes(`${prefix}-expired-completed`),false);

  phase='bounded-retry-and-cleanup';
  const flakyAuth={getUser:uid=>auth.getUser(uid),deleteUser:uid=>{
    if(uid===stuckUid)throw Error('Synthetic failure must not appear in logs');
    return auth.deleteUser(uid);
  }};
  const retry=createMaintenanceRuntime({db,auth:flakyAuth,now:()=>timestamp});
  let runs=0,completed=0,last;
  while(runs<4&&completed<104){
    last=await retry({kind:'deletion',invocationId:randomUUID()});runs++;
    assert.ok((last.collections.deletions?.visited??0)<=100);
    assert.ok((last.collections.moderationCleanup?.visited??0)<=100);
    const snapshots=await db.getAll(...uids.slice(1).map(uid=>db.doc(`deletions/${uid}`)));
    completed=snapshots.filter(snapshot=>snapshot.data()?.status==='completed').length;
  }
  assert.equal(completed,104);assert.ok(runs>=2);
  assert.equal((await db.doc(`deletions/${stuckUid}`).get()).data().status,'pending');
  assert.equal((await db.doc(`deletions/${stuckUid}`).get()).data().expiresAt,undefined);
  assert.equal((await db.doc(path('moderationCleanup','job')).get()).exists,false);
  assert.equal((await db.doc(path('moderationActions','job')).get()).data().cleanupPending,false);
  assert.equal((await db.doc(path('reportDedup','old')).get()).exists,false);
  assert.equal((await db.doc(path('reportDedup','current')).get()).exists,true);
  assert.doesNotMatch(JSON.stringify(last),/maintenance-qa|Synthetic|nickname/);
  console.log('Maintenance emulator checks passed: 104 completed synthetic deletions, bounded cursor continuation, one failed pending record preserved, moderation cleanup, 90-day expiry, pending report protection, current nickname dedup retained.');
} catch {
  failed=true;
  console.error(`Maintenance emulator checks failed at ${phase}; raw records and SDK errors suppressed.`);
} finally {
  try {
    const cleanup=db.batch();for(const key of paths)cleanup.delete(db.doc(key));await cleanup.commit();
    await deleteApp(app);
  } catch {failed=true;console.error('Maintenance emulator synthetic cleanup failed; raw details suppressed.');}
  if(failed)process.exitCode=1;
}
