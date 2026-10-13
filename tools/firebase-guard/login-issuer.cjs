'use strict';
// CLI 15.33.0 lib/api.js authOrigin + Google OIDC authorization response issuer.
const GOOGLE_ISSUER='https://accounts.google.com';
function issuerFailureCode(value) {
  // This is the ONLY acceptance test. Never normalize a value into acceptance.
  if(value===GOOGLE_ISSUER)return 0;
  if(value===null)return 54;
  if(typeof value!=='string')return 52;
  // Remaining branches classify rejected shapes only; no raw value is exposed.
  if(value.trim()!==value)return 55;
  if(value.toLowerCase()===GOOGLE_ISSUER)return 56;
  if(value===GOOGLE_ISSUER+'/')return 57;
  if(value==='accounts.google.com'||value==='http://accounts.google.com')return 58;
  return 52;
}
module.exports={GOOGLE_ISSUER,issuerFailureCode};
