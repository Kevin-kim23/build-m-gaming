import { campaignStages } from './campaign.js';
import { MAX_GOLD, addMoney, subtractMoney, multiplyMoney, minMoney } from './money.js';

export const REGION_INCOME_PERCENT = 1;
export const MAX_CONQUEST_REGIONS = campaignStages.length;
export function campaignBonusPercent(state) {
  const cleared = state.campaignCleared ?? 0;
  return Number.isInteger(cleared) ? Math.max(0, Math.min(MAX_CONQUEST_REGIONS, cleared)) * REGION_INCOME_PERCENT : 0;
}
// Additive on the combined troop/deployed-equipment income; never compounds.
export function withCampaignIncome(state, baseIncome) {
  return baseIncome + Math.floor(baseIncome * campaignBonusPercent(state) / 100);
}

// 전투 승리 즉시 골드 = 현재 초당 수입 × 초. 처음 점령은 30분, 다시 이기면 2분치.
export const FIRST_CLEAR_REWARD_SECONDS = 1800;
export const REPLAY_REWARD_SECONDS = 120;
export function battleGoldReward(income, firstClear, gold = 0) {
  const seconds = firstClear ? FIRST_CLEAR_REWARD_SECONDS : REPLAY_REWARD_SECONDS;
  return minMoney(multiplyMoney(income, seconds), subtractMoney(MAX_GOLD, gold));
}
