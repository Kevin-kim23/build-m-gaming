import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserPopupRedirectResolver,
  GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithCredential, signOut } from 'firebase/auth';
import { FIREBASE_CONFIG, FIREBASE_APP_NAME } from './firebase-environment.js';
import { createFirebaseAppCheck } from './firebase-app-check.js';
import {createAccountDeletion} from './account-deletion-operation.js';

let adapter;
export function createFirebaseAuthAdapter({native = false, nativePlugin} = {}) {
  if (adapter) return adapter;
  const name = FIREBASE_APP_NAME;
  const app = getApps().find(value => value.name === name) ?? initializeApp(FIREBASE_CONFIG, name);
  const ensureAppCheck=createFirebaseAppCheck({app,native});
  const auth = initializeAuth(app, {persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    ...(native ? {} : {popupRedirectResolver: browserPopupRedirectResolver})});
  auth.languageCode = 'ko';
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({prompt: 'select_account'});
  const pluginReady = native ? (nativePlugin ? Promise.resolve(nativePlugin)
    : import('@capacitor-firebase/authentication').then(module => module.FirebaseAuthentication)) : null;
  let functionsModule;
  async function call(name,data={}) {
    const uid=auth.currentUser?.uid;
    if(!uid)throw Object.assign(new Error('sign-in-required'),{code:'auth/requires-recent-login'});
    await ensureAppCheck();
    if(auth.currentUser?.uid!==uid)throw new Error('account-changed');
    functionsModule??=import('firebase/functions');
    const {getFunctions,httpsCallable}=await functionsModule;
    if(auth.currentUser?.uid!==uid)throw new Error('account-changed');
    return (await httpsCallable(getFunctions(app,'asia-northeast3'),name)(data)).data;
  }
  adapter = {
    call,
    ready: async () => { await pluginReady; await auth.authStateReady(); },
    currentUser: () => auth.currentUser,
    subscribe: listener => onAuthStateChanged(auth, listener),
    signIn: native ? async () => {
      const plugin = await pluginReady;
      const result = await plugin.signInWithGoogle({skipNativeAuth: true, useCredentialManager: true});
      const token = result.credential?.idToken;
      if (!token) throw Object.assign(new Error('Missing Google credential'), {code: 'auth/invalid-credential'});
      await signInWithCredential(auth, GoogleAuthProvider.credential(token));
    } : () => signInWithPopup(auth, provider),
    // With skipNativeAuth, Firebase JS is the sole persistent login session.
    signOut: async () => { await signOut(auth); if (native) await (await pluginReady).signOut(); },
    deleteAccount:createAccountDeletion({currentUser:()=>auth.currentUser,
      deleteServerAccount:()=>call('deleteGameAccount'),signOutLocal:()=>signOut(auth),
      loadNativeSignOut:native?async()=>{const plugin=await pluginReady;return()=>plugin.signOut();}:undefined}),
  };
  return adapter;
}
