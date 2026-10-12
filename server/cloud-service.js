import {requireUid,ServiceError} from './profile-service.js';

export function createCloudService({transact, validate, now=Date.now}) {
  return {
    async read(uid) {
      requireUid(uid);
      return transact(async tx=>{
        if(await tx.get(`deletions/${uid}`))throw new ServiceError('account-deleting');
        return await tx.get(`saves/${uid}`)??null;
      });
    },
    async save(uid, input) {
      requireUid(uid);
      if(!input || !Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0
        ||typeof input.requestId!=='string'||!/^[a-zA-Z0-9_-]{16,80}$/.test(input.requestId))throw new ServiceError('invalid-request');
      const savedAt=now();
      const validated=validate(input.raw,savedAt);
      return transact(async tx=>{
        const deletion=await tx.get(`deletions/${uid}`);
        const profile=await tx.get(`profiles/${uid}`);
        const existing=await tx.get(`saves/${uid}`);
        if(deletion)throw new ServiceError('account-deleting');
        if(!profile)throw new ServiceError('profile-required');
        if(existing?.requestId===input.requestId) {
          if(existing.raw!==validated.raw)throw new ServiceError('request-reused');
          return existing;
        }
        if((existing?.revision??0)!==input.expectedRevision)throw new ServiceError('save-conflict');
        const result={raw:validated.raw,power:validated.power,revision:(existing?.revision??0)+1,
          savedAt,requestId:input.requestId,schema:1};
        // Preserve the first submitted legacy save for review; never pretend it is verified play.
        if(!existing)tx.set(`initialSaves/${uid}`,{raw:validated.raw,power:validated.power,submittedAt:savedAt});
        if(existing)tx.set(`saveBackups/${uid}`,existing);
        tx.set(`saves/${uid}`,result);
        return result;
      });
    },
  };
}
