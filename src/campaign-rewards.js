import { campaignStages } from './campaign.js';

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
