
import {battleGoldReward,battleRewardSeconds,regionIncomePercent,replayRemaining} from './campaign-rewards.js';
import {fmtGold} from './format.js';

export function battleRewardPreview(state,stage) {
  const first=stage.id>(state.campaignCleared??0);

  // Quote the base (one-star) reward before wallet saturation; settlement applies the cap.
  const gold=(!first&&replayRemaining(state)===0)?0:battleGoldReward(0,first,0,1,stage.id);
  return {first,gold,seconds:battleRewardSeconds(first,stage.id)};
}
export function battleRewardMarkup(state,stage) {
  const reward=battleRewardPreview(state,stage);
  return `<p class="region-reward"><strong>${reward.first?(stage.capital?'수도 첫 점령':'첫 점령'):'재도전'} · 기본 +${fmtGold(reward.gold)} G</strong><br>${reward.first?`초당 수입 영구 +${regionIncomePercent(stage.id)}% · `:''}지역별 고정 보상 · 재전투 5% · 오늘 남은 보상 ${replayRemaining(state)}회/10회</p>`;
}
