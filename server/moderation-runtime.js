import {OAuth2Client} from 'google-auth-library';
import {onRequest} from 'firebase-functions/v2/https';
import {defineString} from 'firebase-functions/params';
import {databaseAccess} from './database.js';
import {createModeratorVerifier} from './moderation-auth.js';
import {createModerationHandler} from './moderation-handler.js';
import {createModerationService} from './moderation-service.js';
import {MODERATION_RUNTIME_ACCOUNT_PARAM,MODERATION_RUNTIME_ACCOUNT_PATTERN,withModerationRuntimeAccount} from './moderation-runtime-account.js';

// Empty defaults deliberately deny every caller until the owner configures
// the approved dedicated invoker identity after deployment approval.
const audience=defineString('MODERATION_ADMIN_AUDIENCE',{default:''});
const subject=defineString('MODERATION_ADMIN_SUBJECT',{default:''});
// A non-secret required parameter; pass the expression, not .value(), to options.
const runtimeAccount=defineString(MODERATION_RUNTIME_ACCOUNT_PARAM,{
  description:'Dedicated moderation runtime service-account email (not the caller account).',
  input:{text:{nonEmpty:true,validationRegex:MODERATION_RUNTIME_ACCOUNT_PATTERN,
    validationErrorMessage:'Use a full dedicated service-account email.'}},
});
const verifier=new OAuth2Client();
export const MODERATION_HTTP_OPTIONS=Object.freeze({
  region:'asia-northeast3',invoker:'private',cors:false,
  serviceAccount:runtimeAccount,
  minInstances:0,maxInstances:1,concurrency:1,memory:'256MiB',timeoutSeconds:60,
});
// Candidate source settings only: never deploy this during preparation.
export const moderateNicknames=onRequest(MODERATION_HTTP_OPTIONS,withModerationRuntimeAccount(()=>runtimeAccount.value(),async (request,response)=>{
  const service=createModerationService(databaseAccess());
  const verifyModerator=createModeratorVerifier({
    audience:audience.value(),subject:subject.value(),
    verifyIdToken:options=>verifier.verifyIdToken(options),
  });
  return createModerationHandler({service,verifyModerator})(request,response);
}));
