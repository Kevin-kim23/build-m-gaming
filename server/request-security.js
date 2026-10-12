import {requireUid,ServiceError} from './profile-service.js';
import {SECURITY_POLICY} from './security-policy.js';
import {clearMaintenanceCursorReferences} from './deletion-maintenance.js';

// Sliding windows are shared by all devices/functions through one UID document.
export function createRateLimiter({transact,now=Date.now,policy=SECURITY_POLICY}) {
  return async (uid,kind)=>{
    requireUid(uid);
    if(!['read','write'].includes(kind))throw new ServiceError('invalid-request');
    const time=now(), limit=kind==='read'?policy.readLimit:policy.writeLimit;
    return transact(async tx=>{
      const path=`rateLimits/${uid}`, previous=await tx.get(path)??{};
      const read=(previous.read??[]).filter(t=>Number.isFinite(t)&&t>time-policy.windowMs);
      const write=(previous.write??[]).filter(t=>Number.isFinite(t)&&t>time-policy.windowMs);
      const history=kind==='read'?read:write;
      if(history.length>=limit)throw new ServiceError('rate-limit');
      history.push(time);
      tx.set(path,{read,write,expiresAt:Math.max(time,...read,...write)+policy.windowMs});
    });
  };
}

export function createRateLimitPurger({transact,now=Date.now}) {
  return uid=>transact(async tx=>{
    const path=`rateLimits/${uid}`,record=await tx.get(path);
    if(!record||!Number.isFinite(record.expiresAt)||record.expiresAt>now())return false;
    await clearMaintenanceCursorReferences(tx,[{collection:'rateLimits',id:uid}]);
    tx.delete(path);return true;
  });
}

export function createRequestGuard({getUser,limit,appIds,emulator=false}) {
  return async (request,kind)=>{
    const uid=request.auth?.uid;
    requireUid(uid);
    // request.app is populated by the callable framework only after token verification.
    // Never trust an app ID supplied in request.data or headers directly.
    if(!emulator && (!request.app || !appIds.includes(request.app.appId)))throw new ServiceError('app-check-required');
    let user;
    try {user=await getUser(uid);}
    catch(error) {
      if(error?.code==='auth/user-not-found')throw new ServiceError('account-unavailable');
      throw new ServiceError('security-unavailable');
    }
    if(user.disabled)throw new ServiceError('account-unavailable');
    const authTime=request.auth.token?.auth_time;
    const revokedAt=user.tokensValidAfterTime?Date.parse(user.tokensValidAfterTime):0;
    if(!Number.isFinite(authTime)||!Number.isFinite(revokedAt)||authTime*1000<revokedAt)throw new ServiceError('recent-login-required');
    await limit(uid,kind);
    return uid;
  };
}
