import { STAGES, battleAccess } from './battle.js';
import { reconcileAchievements } from './achievements.js';
import { accrue } from './game.js';
import { battleGoldReward, battleStars, replayRemaining, rewardDay } from './campaign-rewards.js';
import { addMoney } from './money.js';

// Settle the old rate before a first clear raises the passive income bonus.
export function recordBattleVictory(state, battle, now = Date.now()) {
  const stage = STAGES.find((entry) => entry.id === battle?.stageId);
  const cleared = state.campaignCleared ?? 0;
  if (!Number.isInteger(cleared)||cleared<0||cleared>STAGES.length||!battleAccess(state).unlocked || !stage || battle.status !== 'victory' ||
      battle.enemy?.hq?.hp !== 0 || !(battle.player?.hq?.hp > 0))
    return { ok: false, reason: 'invalid' };
  if (stage.id > cleared + 1) return { ok: false, reason: 'sequence' };
  accrue(state, now);
  state.campaignCleared = Math.max(cleared, stage.id);
  const stars = battleStars(battle), previousBest = state.campaignStars?.[stage.id - 1] ?? 0;
  if (!Array.isArray(state.campaignStars)) state.campaignStars = Array(STAGES.length).fill(0);
  state.campaignStars[stage.id - 1] = Math.max(previousBest, stars);   // 최고 별만 저장; 골드는 별 수와 무관
  const firstClear = stage.id > cleared;
  const clock=Math.max(now,state.lastAccrual),day=Math.max(state.replayRewardDay??0,rewardDay(clock));
  const available=firstClear||replayRemaining(state,clock)>0;
  const gold=available?battleGoldReward(0,firstClear,state.gold,stars,stage.id):0;
  if(!firstClear&&gold>0){state.replayRewardCount=day>(state.replayRewardDay??0)?1:(state.replayRewardCount??0)+1;state.replayRewardDay=day;}
  state.gold = addMoney(state.gold, gold);
  return { ok: true, firstClear, gold, stars, newBest: stars > previousBest, achievements: reconcileAchievements(state) };
}
