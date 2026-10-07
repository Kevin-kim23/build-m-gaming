// Vite replaces DEV at build time. No saved setting or URL parameter can enable test rewards in an APK.
export const OFFLINE_AD_TEST_MODE = import.meta.env?.DEV === true;
// Future production adapter: resolve rewarded only after the SDK reward-earned callback, not ad close.
export function createOfflineRewardAd(development = false) {
  return async () => development ? {status:'rewarded',test:true} : {status:'unavailable'};
}
export const showOfflineRewardAd = createOfflineRewardAd(OFFLINE_AD_TEST_MODE);
