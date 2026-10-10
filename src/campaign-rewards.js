import {EQUIPMENT,enhancementCost} from './equipment.js';
import {RANKS} from './ranks.js';
import { campaignStages } from './campaign.js';
import { MAX_GOLD, subtractMoney, minMoney, scaleMoney } from './money.js';
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

// Legacy duration exports retained for old integrations; current gold is a fixed stage quote.
export const FIRST_CLEAR_REWARD_SECONDS = 900;
export const CAPITAL_REWARD_SECONDS = 3600;
export const REPLAY_REWARD_SECONDS = 30;
export const STAR_REWARD_PERCENT = Object.freeze([100, 100, 125, 150]); // 별 0~3개(0은 쓰지 않음)
export const STAR_FAST_MS = 75_000, STAR_HP_RATIO = 0.5;
export const CAPITAL_STAR_FAST_MS = 120_000;
export function battleRewardSeconds(firstClear,stageId=1) {
  const stage=campaignStages[stageId-1];
  if(!Number.isInteger(stageId)||!stage)throw new RangeError('Unknown reward stage');
  return firstClear?(stage.capital?CAPITAL_REWARD_SECONDS:FIRST_CLEAR_REWARD_SECONDS):REPLAY_REWARD_SECONDS;
}
// 별: 승리 1개, 제한 시간(일반 75초·수도 120초) 또는 본부 체력 50% 이상 2개, 둘 다 3개.
export function battleStars(battle) {
  if (battle?.status !== 'victory') return 0;
  const fast = battle.elapsedMs <= (campaignStages[battle.stageId-1]?.capital?CAPITAL_STAR_FAST_MS:STAR_FAST_MS), healthy = battle.player.hq.hp >= battle.player.hq.maxHp * STAR_HP_RATIO;
  return 1 + (fast || healthy ? 1 : 0) + (fast && healthy ? 1 : 0);
}
export function battleGoldReward(_income, firstClear, gold = 0, _stars = 1, stageId=1) {
  const base=fixedStageGold(stageId);
  return minMoney(firstClear?base:scaleMoney(base,5,100),subtractMoney(MAX_GOLD,gold));
}

export const REPLAY_DAILY_LIMIT=10;
export function rewardDay(now){return Math.floor((now+9*3600000)/86400000);}
export function replayRemaining(state,now=Date.now()){
 const day=Math.max(state.replayRewardDay??0,rewardDay(Math.max(now,state.lastAccrual??0)));
 return day>(state.replayRewardDay??0)?10:Math.max(0,10-(state.replayRewardCount??0));
}
const fixedQuotes=campaignStages.map(stage=>{
 const rank=RANKS.indexOf(stage.recommendedRank),gears=Object.values(EQUIPMENT).filter(g=>RANKS.indexOf(g.unlockRank)<=rank);
 const gear=gears.at(-1),cost=enhancementCost(Math.min(gear.maxLevel-1,stage.recommendedLevel),gear.id);
 return scaleMoney(cost,stage.capital?20:10,100);
});
export function fixedStageGold(id){if(!Number.isInteger(id)||!fixedQuotes[id-1])throw new RangeError('Unknown reward stage');return fixedQuotes[id-1];}
