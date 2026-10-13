// Capacitor proxies synthesize a callable `then` property. Returning the proxy
// from an async function/Promise callback invokes that native method and can
// leave the Promise pending forever. Resolve only plain method facades.
export async function loadNativeAuthentication(nativePlugin,
  loadModule = () => import('@capacitor-firebase/authentication')) {
  const plugin = nativePlugin ?? (await loadModule()).FirebaseAuthentication;
  return {
    signInWithGoogle: options => plugin.signInWithGoogle(options),
    signOut: () => plugin.signOut(),
  };
}

export async function loadNativeAppCheck(loadCore = () => import('@capacitor/core')) {
  const {registerPlugin} = await loadCore();
  const plugin = registerPlugin('GameAppCheck');
  return {getToken: () => plugin.getToken()};
}
