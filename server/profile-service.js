// No provider name/email/photo is copied into a public game profile.
import {nicknamePolicyViolation} from './nickname-policy.js';
export class ServiceError extends Error {
  constructor(code) { super(code); this.code = code; }
}
export function requireUid(uid) {
  if(typeof uid !== 'string' || !uid || uid.length > 128 || uid.includes('/'))throw new ServiceError('unauthenticated');
}
// Lookup deliberately permits an existing prohibited name so it can be reported.
export function normalizeNicknameForLookup(value) {
  if(typeof value !== 'string')throw new ServiceError('invalid-nickname');
  const display=value.normalize('NFKC').trim();
  if(!/^[\p{L}\p{N}_]{2,12}$/u.test(display))throw new ServiceError('invalid-nickname');
  const key=display.toLocaleLowerCase('en-US');
  return {display,key};
}
export function normalizeNickname(value) {
  const identity=normalizeNicknameForLookup(value);
  const violation=nicknamePolicyViolation(identity.key);
  if(violation)throw new ServiceError(violation);
  return identity;
}
export function createProfileService({transact, now=Date.now}) {
  return {
    async read(uid) {
      requireUid(uid);
      return transact(async tx => {
        if(await tx.get(`deletions/${uid}`))throw new ServiceError('account-deleting');
        return await tx.get(`profiles/${uid}`) ?? null;
      });
    },
    async create(uid, nickname) {
      requireUid(uid);
      const {display,key}=normalizeNickname(nickname);
      return transact(async tx => {
        const deletion=await tx.get(`deletions/${uid}`);
        const existing=await tx.get(`profiles/${uid}`);
        const claim=await tx.get(`nicknames/${key}`);
        if(deletion)throw new ServiceError('account-deleting');
        if(existing) {
          if(existing.nicknameKey===key)return existing;
          throw new ServiceError('nickname-change-unavailable');
        }
        if(claim && claim.uid!==uid)throw new ServiceError('nickname-taken');
        const createdAt=now();
        const profile={nickname:display,nicknameKey:key,createdAt,rankingStatus:'pending-review'};
        tx.set(`nicknames/${key}`,{uid});
        tx.set(`profiles/${uid}`,profile);
        return profile;
      });
    },
  };
}
