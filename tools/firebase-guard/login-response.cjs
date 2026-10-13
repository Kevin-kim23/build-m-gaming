'use strict';
const {SCOPES}=require('./login-session.cjs');
function credentialsFromResponse(body,clientId) {
  if(!body||typeof body.access_token!=='string'||!body.access_token||typeof body.refresh_token!=='string'||
    !body.refresh_token||typeof body.id_token!=='string'||!Number.isFinite(body.expires_in)||body.expires_in<=0)throw new Error('GUARD_LOGIN_RESPONSE');
  const parts=body.id_token.split('.');
  if(parts.length!==3)throw new Error('GUARD_LOGIN_RESPONSE');
  const user=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));
  // The pinned CLI decodes the ID token from Google's HTTPS token response.
  // Validate claims too, without introducing a JWKS/userinfo request.
  if(!user||!['accounts.google.com','https://accounts.google.com'].includes(user.iss)||user.aud!==clientId||
    typeof user.sub!=='string'||!user.sub||typeof user.email!=='string'||!user.email||
    !Number.isFinite(user.exp)||user.exp<=Date.now()/1000)throw new Error('GUARD_LOGIN_RESPONSE');
  return {user,tokens:{...body,expires_at:Date.now()+body.expires_in*1000},scopes:[...SCOPES]};
}
module.exports={credentialsFromResponse};
