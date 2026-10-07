import { campaignStages } from './campaign.js';
import { MAX_GOLD, subtractMoney, multiplyMoney, minMoney, scaleMoney } from './money.js';

export const REGION_INCOME_PERCENT = 1;
export const MAX_CONQUEST_REGIONS = campaignStages.length;
export function campaignBonusPercent(state) {
  const cleared = state.campaignCleared ?? 0;
  return Number.isInteger(cleared) ? Math.max(0, Math.min(MAX_CONQUEST_REGIONS, cleared)) * REGION_INCOME_PERCENT : 0;
}
// Additive on the combined troop/deployed-equipment income; never compounds.
export function withCampaignIncome(state, baseIncome) {
  const bonus=campaignBonusPercent(state);
  return bonus?scaleMoney(baseIncome,100+bonus,100):baseIncome;
}

// 전투 승리 즉시 골드 = 현재 초당 수입 × 초. 처음 점령은 30분, 다시 이기면 2분치.
export const FIRST_CLEAR_REWARD_SECONDS = 1800;
export const REPLAY_REWARD_SECONDS = 120;
export const STAR_REWARD_PERCENT = Object.freeze([100, 100, 125, 150]); // 별 0~3개(0은 쓰지 않음)
export const STAR_FAST_MS = 75_000, STAR_HP_RATIO = 0.5;
// 별: 승리 1개, 75초 이내 또는 본부 체력 50% 이상 2개, 둘 다 3개. 저장하지 않고 이번 전리품에만 반영한다.
export function battleStars(battle) {
  if (battle?.status !== 'victory') return 0;
  const fast = battle.elapsedMs <= STAR_FAST_MS, healthy = battle.player.hq.hp >= battle.player.hq.maxHp * STAR_HP_RATIO;
  return 1 + (fast || healthy ? 1 : 0) + (fast && healthy ? 1 : 0);
}
export function battleGoldReward(income, firstClear, gold = 0, stars = 1) {
  const seconds = firstClear ? FIRST_CLEAR_REWARD_SECONDS : REPLAY_REWARD_SECONDS;
  const percent = STAR_REWARD_PERCENT[Math.max(1, Math.min(3, stars))];
  return minMoney(scaleMoney(multiplyMoney(income, seconds), percent, 100), subtractMoney(MAX_GOLD, gold));
}
