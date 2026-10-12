import {OAuth2Client} from 'google-auth-library';
import {onRequest} from 'firebase-functions/v2/https';
import {defineString} from 'firebase-functions/params';
import {databaseAccess} from './database.js';
import {createModeratorVerifier} from './moderation-auth.js';
import {createModerationHandler} from './moderation-handler.js';
import {createModerationService} from './moderation-service.js';

// Empty defaults deliberately deny every caller until the owner configures
// the approved dedicated invoker identity after deployment approval.
const audience=defineString('MODERATION_ADMIN_AUDIENCE',{default:''});
const subject=defineString('MODERATION_ADMIN_SUBJECT',{default:''});
const verifier=new OAuth2Client();
export const MODERATION_HTTP_OPTIONS=Object.freeze({
  region:'asia-northeast3',invoker:'private',cors:false,
  minInstances:0,maxInstances:1,concurrency:1,memory:'256MiB',timeoutSeconds:60,
});
// Candidate source settings only: never deploy this during preparation.
export const moderateNicknames=onRequest(MODERATION_HTTP_OPTIONS,async (request,response)=>{
  const service=createModerationService(databaseAccess());
  const verifyModerator=createModeratorVerifier({
    audience:audience.value(),subject:subject.value(),
    verifyIdToken:options=>verifier.verifyIdToken(options),
  });
  return createModerationHandler({service,verifyModerator})(request,response);
});
