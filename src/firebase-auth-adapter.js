import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserPopupRedirectResolver,
  GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithCredential, signOut, deleteUser } from 'firebase/auth';
import { DEVELOPMENT_FIREBASE } from './account-config.js';

let adapter;
export function createFirebaseAuthAdapter({native = false, nativePlugin} = {}) {
  if (adapter) return adapter;
  const name = 'budae-account-development';
  const app = getApps().find(value => value.name === name) ?? initializeApp(DEVELOPMENT_FIREBASE, name);
  const auth = initializeAuth(app, {persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    ...(native ? {} : {popupRedirectResolver: browserPopupRedirectResolver})});
  auth.languageCode = 'ko';
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({prompt: 'select_account'});
  const pluginReady = native ? (nativePlugin ? Promise.resolve(nativePlugin)
    : import('@capacitor-firebase/authentication').then(module => module.FirebaseAuthentication)) : null;
  adapter = {
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
    deleteAccount: async () => { if (auth.currentUser) await deleteUser(auth.currentUser);
      if (native) await (await pluginReady).signOut(); },
  };
  return adapter;
}
