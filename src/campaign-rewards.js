import { rewardDay } from './kst-day.js';
import { campaignStages } from './campaign.js';
import { scaleMoney } from './money.js';
import {CONTINENT_STAGE_COUNT} from './campaign-constants.js';

export const REGION_INCOME_PERCENT = 1;
export const MAX_CONQUEST_REGIONS = campaignStages.length;
export function regionIncomePercent(stageId){
  if(!Number.isInteger(stageId)||stageId<1||stageId>MAX_CONQUEST_REGIONS)throw new RangeError('Unknown reward stage');
  return stageId>CONTINENT_STAGE_COUNT?2:REGION_INCOME_PERCENT;
}
export function campaignBonusPercent(state) {
  const cleared = state.campaignCleared ?? 0;
  if(!Number.isInteger(cleared))return 0;
  const count=Math.max(0,Math.min(MAX_CONQUEST_REGIONS,cleared));
  return Math.min(CONTINENT_STAGE_COUNT,count)*REGION_INCOME_PERCENT+Math.max(0,count-CONTINENT_STAGE_COUNT)*2;
}
// Additive on the combined troop/deployed-equipment income; never compounds.
export function withCampaignIncome(state, baseIncome) {
  const bonus=campaignBonusPercent(state);
  return bonus?scaleMoney(baseIncome,100+bonus,100):baseIncome;
}

export const STAR_FAST_MS = 75_000, STAR_HP_RATIO = 0.5;
export const CAPITAL_STAR_FAST_MS = 120_000;
// 별: 승리 1개, 제한 시간(일반 75초·수도 120초) 또는 본부 체력 50% 이상 2개, 둘 다 3개.
export function battleStars(battle) {
  if (battle?.status !== 'victory') return 0;
  const fast = battle.elapsedMs <= (campaignStages[battle.stageId-1]?.capital?CAPITAL_STAR_FAST_MS:STAR_FAST_MS), healthy = battle.player.hq.hp >= battle.player.hq.maxHp * STAR_HP_RATIO;
  return 1 + (fast || healthy ? 1 : 0) + (fast && healthy ? 1 : 0);
}

export const REPLAY_DAILY_LIMIT=10;
export { rewardDay };
export function replayRemaining(state,now=Date.now()){
 const day=Math.max(state.replayRewardDay??0,rewardDay(Math.max(now,state.lastAccrual??0)));
 return day>(state.replayRewardDay??0)?10:Math.max(0,10-(state.replayRewardCount??0));
}
