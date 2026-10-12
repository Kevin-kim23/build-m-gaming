import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {createRequire} from 'node:module';

// Synthetic SDK/database integration only. The actor below is a unit-layer
// fixture; this never establishes successful live OIDC, IAM or Google login.
const PROJECT='demo-budae-kiugi';
const FUNCTIONS=`http://127.0.0.1:5001/${PROJECT}/asia-northeast3/`;
const require=createRequire(new URL('../server/package.json',import.meta.url));
const nonce=randomUUID().replaceAll('-','');
const actor={actorHash:createHash('sha256').update('synthetic-moderation-'+nonce).digest('hex')};
let phase='safety',checks=0,failed=false,app,db,auth,deleteApp;
const createdAuth=new Set();
const userCollections=['profiles','saves','saveBackups','initialSaves','rankingApprovals','rankingCandidates','rateLimits','reportDaily','deletions'];
const relatedCollections=['nicknameReports','reportDedup','moderationActions','moderationCleanup'];
async function check(name,operation) {phase=name;await operation();checks++;}
async function data(path) {return (await db.doc(path).get()).data();}
async function reports(reporterUid,targetUid) {
  const page=await db.collection('nicknameReports').where('reporterUid','==',reporterUid).get();
  return page.docs.filter(doc=>doc.data().targetUid===targetUid);
}
async function assertGone(uid) {
  for(const collection of [...userCollections.filter(name=>name!=='deletions')])assert.equal((await db.doc(`${collection}/${uid}`).get()).exists,false);
  for(const collection of relatedCollections)for(const field of ['reporterUid','targetUid']){
    assert.equal((await db.collection(collection).where(field,'==',uid).limit(1).get()).empty,true);
  }
  assert.equal((await db.collection('nicknames').where('uid','==',uid).limit(1).get()).empty,true);
  await assert.rejects(auth.getUser(uid),error=>error.code==='auth/user-not-found');
}
async function cleanup() {
  if(!db||!auth)return;
  // Delete only documents owned by accounts this exact run successfully created.
  // Never clear an emulator database or delete records by a broad prefix query.
  for(const uid of createdAuth) {
    assert.ok(uid.startsWith(`qa-moderation-${nonce}-`));
    for(const collection of relatedCollections)for(const field of ['reporterUid','targetUid']){
      while(true) {
        const page=await db.collection(collection).where(field,'==',uid).limit(100).get();
        if(page.empty)break;
        const batch=db.batch();for(const doc of page.docs)batch.delete(doc.ref);await batch.commit();
      }
    }
    const names=await db.collection('nicknames').where('uid','==',uid).get();
    const batch=db.batch();for(const doc of names.docs)batch.delete(doc.ref);
    for(const collection of userCollections)batch.delete(db.doc(`${collection}/${uid}`));
    await batch.commit();
    try {await auth.deleteUser(uid);}
    catch(error){if(error.code!=='auth/user-not-found')throw error;}
  }
}

try {
  if(process.argv.length!==2)throw Error('fixed-emulator-target-only');
  for(const key of ['GCLOUD_PROJECT','GOOGLE_CLOUD_PROJECT']){
    if(process.env[key]&&process.env[key]!==PROJECT)throw Error('demo-project-only');
  }
  for(const [key,value] of Object.entries({FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080'})){
    if(process.env[key]&&process.env[key]!==value)throw Error('loopback-emulator-only');
    process.env[key]=value;
  }
  const appSdk=require('firebase-admin/app');deleteApp=appSdk.deleteApp;
  app=appSdk.initializeApp({projectId:PROJECT},`moderation-check-${nonce}`);
  db=require('firebase-admin/firestore').getFirestore(app);auth=require('firebase-admin/auth').getAuth(app);
  const [{databaseAccess},{createModerationService},{createProfileService},{createNicknameReportService},{createDeletionService}]=await Promise.all([
    import('../server/database.js'),import('../server/moderation-service.js'),import('../server/profile-service.js'),
    import('../server/report-service.js'),import('../server/deletion-service.js'),
  ]);
  const access=databaseAccess(db),moderation=createModerationService(access),profiles=createProfileService(access);
  const report=createNicknameReportService(access);
  const remove=createDeletionService({...access,deleteAuth:uid=>auth.deleteUser(uid)});
  const reporter=`qa-moderation-${nonce}-reporter`,target=`qa-moderation-${nonce}-target`;
  const reporterName=`신고${nonce.slice(0,8)}`,targetName=`검증${nonce.slice(0,8)}`;
  let firstId,newerId;
  const warnId=randomUUID(),warnUndoId=randomUUID(),renameId=randomUUID(),renameUndoId=randomUUID();
  await check('create-synthetic-accounts',async()=>{
    for(const uid of [reporter,target]){
      await auth.createUser({uid});createdAuth.add(uid);
    }
    await profiles.create(reporter,reporterName);await profiles.create(target,targetName);
    assert.equal((await auth.getUser(reporter)).uid,reporter);assert.equal((await auth.getUser(target)).uid,target);
  });
  await check('create-report-and-guard',async()=>{
    await report(reporter,{nickname:targetName,reason:'abuse'});
    const found=await reports(reporter,target);assert.equal(found.length,1);firstId=found[0].id;
    assert.equal((await data(`reportDedup/${firstId}`)).nicknameRevision,0);
  });
  await check('unsigned-private-http-denied',async()=>{
    const beforeReport=await data(`nicknameReports/${firstId}`),beforeProfile=await data(`profiles/${target}`);
    const response=await fetch(FUNCTIONS+'moderateNicknames',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({operation:'list'}),redirect:'error',signal:AbortSignal.timeout(30_000)});
    assert.equal(response.status,403);
    assert.deepEqual(await data(`nicknameReports/${firstId}`),beforeReport);
    assert.deepEqual(await data(`profiles/${target}`),beforeProfile);
  });
  await check('list-and-inspect-real-firestore',async()=>{
    let cursor=null,found=false;
    for(let pageIndex=0;pageIndex<20;pageIndex++){
      const page=await moderation.list(actor,{limit:50,...(cursor?{cursor}:{})});
      if(page.items.some(item=>item.reportId===firstId)){found=true;break;}
      cursor=page.nextCursor;if(!cursor)break;
    }
    assert.equal(found,true);
    const inspected=await moderation.inspect(actor,{reportId:firstId});
    assert.equal(inspected.target.nickname,targetName);assert.equal(inspected.version,0);
  });
  await check('warning-and-reversal-real-transactions',async()=>{
    const decision={reportId:firstId,actionId:warnId,decision:'warn',expectedVersion:0};
    assert.equal((await moderation.resolve(actor,decision)).status,'resolved');
    assert.equal((await moderation.resolve(actor,decision)).version,1);
    assert.equal((await data(`profiles/${target}`)).moderationNotice.kind,'warning');
    assert.equal((await moderation.revert(actor,{reportId:firstId,actionId:warnUndoId,originalActionId:warnId,expectedVersion:1})).status,'pending');
    assert.equal((await data(`profiles/${target}`)).moderationNotice,undefined);
    assert.equal((await data(`nicknameReports/${firstId}`)).expiresAt,undefined);
  });
  await check('forced-default-name-and-old-guard-cleanup',async()=>{
    await moderation.resolve(actor,{reportId:firstId,actionId:renameId,decision:'default-rename',expectedVersion:2});
    const profile=await data(`profiles/${target}`);
    assert.match(profile.nickname,/^유저[a-f0-9]{8}$/);assert.equal(profile.nicknameRevision,1);
    assert.equal((await db.doc(`reportDedup/${firstId}`).get()).exists,false);
    assert.equal((await db.doc(`moderationCleanup/${renameId}`).get()).exists,false);
    await report(reporter,{nickname:profile.nickname,reason:'hate'});
    const found=(await reports(reporter,target)).filter(doc=>doc.data().nicknameRevision===1);
    assert.equal(found.length,1);newerId=found[0].id;
    await access.cleanupDedup(target,0);
    assert.equal((await data(`reportDedup/${newerId}`)).nicknameRevision,1);
  });
  await check('rename-reversal-keeps-new-generation-guard',async()=>{
    await moderation.revert(actor,{reportId:firstId,actionId:renameUndoId,originalActionId:renameId,expectedVersion:3});
    const profile=await data(`profiles/${target}`);
    assert.equal(profile.nickname,targetName);assert.equal(profile.nicknameRevision,2);
    assert.equal((await db.doc(`reportDedup/${newerId}`).get()).exists,false);
    await report(reporter,{nickname:targetName,reason:'abuse'});
    const found=(await reports(reporter,target)).filter(doc=>doc.data().nicknameRevision===2&&doc.id!==firstId);
    assert.equal(found.length,1);
    await access.cleanupDedup(target,1);
    assert.equal((await data(`reportDedup/${found[0].id}`)).nicknameRevision,2);
    assert.equal((await db.doc(`moderationCleanup/${renameUndoId}`).get()).exists,false);
  });
  await check('prepare-both-role-deletion-fixtures',async()=>{
    await report(target,{nickname:reporterName,reason:'impersonation'});
    const reverse=await reports(target,reporter);assert.equal(reverse.length,1);
    await moderation.resolve(actor,{reportId:reverse[0].id,actionId:randomUUID(),decision:'warn',expectedVersion:0});
    for(const [reporterUid,targetUid] of [[reporter,target],[target,reporter]]){
      await db.collection('moderationCleanup').doc(randomUUID()).create({reporterUid,targetUid,obsoleteRevision:0,createdAt:Date.now()});
    }
    assert.equal((await db.doc(`reportDaily/${reporter}`).get()).exists,true);
    assert.equal((await db.doc(`reportDaily/${target}`).get()).exists,true);
  });
  await check('delete-first-account-and-both-related-roles',async()=>{
    assert.equal((await remove(reporter)).deleted,true);await assertGone(reporter);
    const deletion=await data(`deletions/${reporter}`);assert.equal(deletion.status,'completed');
    assert.equal(deletion.expiresAt-deletion.completedAt,90*24*60*60*1000);
  });
  await check('delete-second-account-and-daily-counter',async()=>{
    assert.equal((await remove(target)).deleted,true);await assertGone(target);
    assert.equal((await data(`deletions/${target}`)).status,'completed');
  });
} catch {
  failed=true;console.error(`FAIL moderation emulator phase: ${phase}`);
} finally {
  try {await cleanup();}
  catch {failed=true;console.error('FAIL moderation emulator phase: cleanup-own-synthetic-records');}
  try {if(db)await db.terminate();if(app)await deleteApp(app);}
  catch {failed=true;console.error('FAIL moderation emulator phase: close-emulator-clients');}
}
if(!failed)console.log(`PASS moderation emulator checks: ${checks}; synthetic actor only, live OIDC not tested.`);
process.exitCode=failed?1:0;
