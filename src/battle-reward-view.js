
import {regionIncomePercent,replayRemaining} from './campaign-rewards.js';
import {stageLoot} from './loot.js';
import {fmt} from './format.js';

export function battleRewardPreview(state,stage) {
  const first=stage.id>(state.campaignCleared??0);

  // Quote before wallet saturation; settlement applies the loot cap.
  const loot=(!first&&replayRemaining(state)===0)?0:stageLoot(stage.id,first);
  return {first,loot};
}
export function battleRewardMarkup(state,stage) {
  const reward=battleRewardPreview(state,stage);
  return `<p class="region-reward"><strong>${reward.first?(stage.capital?'수도 첫 점령':'첫 점령'):'재도전'} · 전리품 +${fmt(reward.loot)}</strong><br>${reward.first?`초당 수입 영구 +${regionIncomePercent(stage.id)}% · `:''}전리품 상점에서 특별 대원 영입 · 재전투 20% · 오늘 남은 보상 ${replayRemaining(state)}회/10회</p>`;
}
