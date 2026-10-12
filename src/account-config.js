// Public Firebase app identifiers, not server credentials. Rules remain deny-all.
export const DEVELOPMENT_FIREBASE = Object.freeze({
  apiKey: 'AIzaSyC3Y7v9jyH3KB0Jg3tF3Lk9OSmm9v7QMJU',
  authDomain: 'budae-kiugi-dev.firebaseapp.com',
  projectId: 'budae-kiugi-dev',
  appId: '1:96394423737:web:08eff8d7940f396871da68',
});

export function accountTestingEnabled(mode, native = false, appId = '') {
  return (mode === 'development' || mode === 'firebase-dev')
    && (!native || appId === 'com.dongramco.budaekiugi.dev');
}
