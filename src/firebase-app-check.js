import {loadNativeAppCheck} from './native-account-plugins.js';
const unavailable=()=>Object.assign(new Error('app-check-unavailable'),{code:'functions/failed-precondition'});
const development=mode=>mode==='development'||mode==='firebase-dev';

// Auth and local saves do not depend on attestation. Only server calls await this guard.
// Dependencies can be injected by isolated tests; runtime never falls back to a fake token.
export function createFirebaseAppCheck({app,native=false,mode=import.meta.env?.MODE,
  loadSDK=()=>import('firebase/app-check'),loadPlugin=loadNativeAppCheck,now=Date.now}={}) {
  let initialization;
  async function initialize() {
    if(!native||!(mode==='production'||development(mode)))throw unavailable();
    // The web SDK's global debug switch must never override the native attestation provider.
    if(globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN)throw unavailable();
    const [sdk,plugin]=await Promise.all([loadSDK(),loadPlugin()]);
    const provider=new sdk.CustomProvider({getToken:async()=>{
      try {
        const result=await plugin.getToken();
        const projectNumber=app.options.appId.split(':')[1];
        if(result?.projectId!==app.options.projectId||typeof result.appId!=='string'
          ||!result.appId.startsWith(`1:${projectNumber}:android:`)
          ||result.provider!==(development(mode)?'debug':'play-integrity')
          ||typeof result.token!=='string'||!result.token
          ||!Number.isSafeInteger(result.expireTimeMillis)||result.expireTimeMillis<=now())throw unavailable();
        return {token:result.token,expireTimeMillis:result.expireTimeMillis};
      } catch { throw unavailable(); }
    }});
    // On-demand refresh: no attestation polling while the player only uses the local game.
    const instance=sdk.initializeAppCheck(app,{provider,isTokenAutoRefreshEnabled:false});
    return {sdk,instance};
  }
  return async function ensureAppCheck() {
    if(!initialization)initialization=initialize().catch(()=>{initialization=null;throw unavailable();});
    try {
      const {sdk,instance}=await initialization;
      const result=await sdk.getToken(instance);
      if(result?.error||typeof result?.token!=='string'||!result.token)throw unavailable();
    } catch { throw unavailable(); }
  };
}
