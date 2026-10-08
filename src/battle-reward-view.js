import {basePassiveIncome} from './game.js';
import {battleGoldReward,battleRewardSeconds,REGION_INCOME_PERCENT} from './campaign-rewards.js';
import {fmtGold} from './format.js';

export function battleRewardPreview(state,stage) {
  const first=stage.id>(state.campaignCleared??0);
  const income=basePassiveIncome(first?{...state,campaignCleared:stage.id}:state);
  // Quote the base (one-star) reward before wallet saturation; settlement applies the cap.
  const gold=battleGoldReward(income,first,0,1,stage.id);
  return {first,gold,seconds:battleRewardSeconds(first,stage.id)};
}
export function battleRewardMarkup(state,stage) {
  const reward=battleRewardPreview(state,stage);
  return `<p class="region-reward"><strong>${reward.first?(stage.capital?'수도 첫 점령':'첫 점령'):'재도전'} · 기본 +${fmtGold(reward.gold)} G</strong><br>${reward.first?`초당 수입 영구 +${REGION_INCOME_PERCENT}% · `:''}별 보너스 최대 1.5배</p>`;
}
