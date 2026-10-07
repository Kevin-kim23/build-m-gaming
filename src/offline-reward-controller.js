import { showOfflineRewardAd } from './rewarded-ads.js';
import { reportError } from './diagnostics.js';

export function createOfflineRewardController(session, {showAd=showOfflineRewardAd,onChange=()=>{},onError=reportError}={}) {
  let busy = false;
  function claim() {
    if (busy) return {ok:false,reason:'busy'};
    return session.claimOffline(session.state.offlineReward?.id);
  }
  async function double() {
    const reward = session.state.offlineReward;
    if (busy || !session.active || !reward) return {ok:false,reason:'unavailable'};
    const id = reward.id;
    busy = true; onChange();
    try {
      const result = await showAd({placement:'offline-income',rewardId:id});
      if (result?.status !== 'rewarded') return {ok:false,reason:result?.status === 'cancelled' ? 'cancelled' : 'unavailable'};
      return session.claimOffline(id,2);
    } catch (error) {
      onError('offline.ad',error);
      return {ok:false,reason:'ad-error'};
    } finally { busy = false; onChange(); }
  }
  return {claim,double,get busy(){return busy;}};
}
