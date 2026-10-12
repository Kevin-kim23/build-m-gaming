import {createHash} from 'node:crypto';

// The Google-signed ID token and private Cloud Run IAM invoker are independent
// gates. Firebase player tokens/custom claims never grant moderation access.
export function createModeratorVerifier({verifyIdToken,audience,subject}) {
  return async authorization=>{
    if(typeof audience!=='string'||!/^https:\/\/[^\s]+$/.test(audience)||
      typeof subject!=='string'||!/^\d{6,64}$/.test(subject))throw Error('admin-unconfigured');
    if(typeof authorization!=='string'||!/^Bearer [^\s]{20,8192}$/.test(authorization))throw Error('admin-unauthorized');
    let payload;
    try {const ticket=await verifyIdToken({idToken:authorization.slice(7),audience});payload=ticket.getPayload();}
    catch {throw Error('admin-unauthorized');}
    if(!payload||!['accounts.google.com','https://accounts.google.com'].includes(payload.iss)||
      payload.sub!==subject||payload.aud!==audience||payload.email_verified!==true)throw Error('admin-unauthorized');
    return {actorHash:createHash('sha256').update(payload.iss+'\n'+payload.sub).digest('hex')};
  };
}
