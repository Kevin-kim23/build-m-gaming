import {getFirestore,FieldPath} from 'firebase-admin/firestore';
import {clearMaintenanceCursorReferences} from './deletion-maintenance.js';

export function databaseAccess(db=getFirestore()) {
  const transact=operation=>db.runTransaction(async transaction=>operation({
    get:async path=>{const snapshot=await transaction.get(db.doc(path));return snapshot.exists?snapshot.data():null;},
    set:(path,value)=>transaction.set(db.doc(path),value),
    delete:path=>transaction.delete(db.doc(path)),
  }));
  const deleteRelated=async uid=>{
    // Each retry is bounded; partial cleanup leaves the deletion barrier pending.
    let remaining=200;
    for(const collection of ['nicknameReports','reportDedup','moderationActions','moderationCleanup'])
    for(const field of ['reporterUid','targetUid']) {
      while(true) {
        const snapshot=await db.collection(collection).where(field,'==',uid).limit(Math.min(100,remaining+1)).get();
        if(snapshot.empty)break;
        if(!remaining)throw Error('related-cleanup-pending');
        const docs=snapshot.docs.slice(0,remaining);
        await transact(async tx=>{
          await clearMaintenanceCursorReferences(tx,docs.map(doc=>({collection,id:doc.id})));
          for(const doc of docs)tx.delete(`${collection}/${doc.id}`);
        });
        remaining-=docs.length;
      }
    }
  };
  const cleanupDedup=async (uid,obsoleteRevision)=>{
    const query=db.collection('reportDedup').where('targetUid','==',uid).where('nicknameRevision','<=',obsoleteRevision);
    const snapshot=await query.limit(101).get();
    for(const doc of snapshot.docs.slice(0,100))await transact(async tx=>{
      const profile=await tx.get(`profiles/${uid}`);
      const guard=await tx.get(`reportDedup/${doc.id}`);
      if(profile&&(profile.nicknameRevision??0)<=obsoleteRevision)throw Error('moderation-cleanup-pending');
      if(guard?.targetUid===uid&&guard.nicknameRevision<=obsoleteRevision)tx.delete(`reportDedup/${doc.id}`);
    });
    if(snapshot.size>100)throw Error('moderation-cleanup-pending');
  };
  const listPending=async ({limit,cursor})=>{
    let query=db.collection('nicknameReports').where('status','==','pending').orderBy(FieldPath.documentId()).limit(limit);
    if(cursor)query=query.startAfter(cursor);
    const snapshot=await query.get();
    return {items:snapshot.docs.map(doc=>({...doc.data(),id:doc.id})),
      nextCursor:snapshot.size===limit?snapshot.docs.at(-1).id:null};
  };
  const page=query=>async cursor=>{
    let request=query.limit(100);if(cursor)request=request.startAfter(cursor);
    const snapshot=await request.get();
    return {ids:snapshot.docs.map(doc=>doc.id),next:snapshot.size===100?snapshot.docs.at(-1):null};
  };
  return {transact,deleteRelated,cleanupDedup,listPending,page};
}
