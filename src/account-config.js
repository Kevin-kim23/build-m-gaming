// Public Firebase app identifiers, not server credentials. Rules remain deny-all.
export const DEVELOPMENT_FIREBASE = /* @__PURE__ */ Object.freeze({
  apiKey: 'AIzaSyC3Y7v9jyH3KB0Jg3tF3Lk9OSmm9v7QMJU',
  authDomain: 'budae-kiugi-dev.firebaseapp.com',
  projectId: 'budae-kiugi-dev',
  appId: '1:96394423737:web:08eff8d7940f396871da68',
});

export const PRODUCTION_FIREBASE = /* @__PURE__ */ Object.freeze({
  apiKey: 'AIzaSyDiSzBbAgfo7SWAQtM74klfhkM3zLMx3Lo',
  authDomain: 'budae-kiugi-prod.firebaseapp.com',
  projectId: 'budae-kiugi-prod',
  appId: '1:745998969505:web:77cf8f37be357b0aa71ee0',
});

export function accountEnvironment(mode) {
  if (mode === 'development' || mode === 'firebase-dev') return 'development';
  if (mode === 'production') return 'production';
  return null;
}
export function accountEnabled(mode, native = false, appId = '') {
  const environment = accountEnvironment(mode);
  if (!environment) return false;
  return !native || appId === (environment === 'development'
    ? 'com.dongramco.budaekiugi.dev' : 'com.dongramco.budaekiugi');
}
