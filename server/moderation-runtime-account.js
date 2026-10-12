export const MODERATION_RUNTIME_ACCOUNT_PARAM='MODERATION_RUNTIME_SERVICE_ACCOUNT';
// Full, user-managed service-account email only. No shorthand/default identity.
export const MODERATION_RUNTIME_ACCOUNT_PATTERN=/^[a-z][a-z0-9-]{5,29}@[a-z][a-z0-9-]{4,28}[a-z0-9]\.iam\.gserviceaccount\.com$(?![\s\S])/;

export function requireModerationRuntimeAccount(value) {
  if(typeof value!=='string'||!MODERATION_RUNTIME_ACCOUNT_PATTERN.test(value))
    throw Error('moderation-runtime-account-required');
  return value;
}

// Validate before constructing a DB service or checking caller credentials.
export function withModerationRuntimeAccount(readAccount,handler) {
  return async(request,response)=>{
    try {requireModerationRuntimeAccount(readAccount());}
    catch {
      response.set('Cache-Control','no-store');
      return response.status(503).json({error:'moderation-runtime-unconfigured'});
    }
    return handler(request,response);
  };
}
