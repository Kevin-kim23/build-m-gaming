import {getFirestore} from 'firebase-admin/firestore';

export function databaseAccess(db=getFirestore()) {
  const transact=operation=>db.runTransaction(async transaction=>operation({
    get:async path=>{const snapshot=await transaction.get(db.doc(path));return snapshot.exists?snapshot.data():null;},
    set:(path,value)=>transaction.set(db.doc(path),value),
    delete:path=>transaction.delete(db.doc(path)),
  }));
  const deleteRelated=async uid=>{
    for(const field of ['reporterUid','targetUid']) {
      while(true) {
        const snapshot=await db.collection('nicknameReports').where(field,'==',uid).limit(200).get();
        if(snapshot.empty)break;
        const batch=db.batch();for(const doc of snapshot.docs)batch.delete(doc.ref);await batch.commit();
      }
    }
  };
  const page=query=>async cursor=>{
    let request=query.limit(100);if(cursor)request=request.startAfter(cursor);
    const snapshot=await request.get();
    return {ids:snapshot.docs.map(doc=>doc.id),next:snapshot.size===100?snapshot.docs.at(-1):null};
  };
  return {transact,deleteRelated,page};
}
