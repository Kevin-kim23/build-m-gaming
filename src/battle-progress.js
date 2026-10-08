import { STAGES, battleAccess } from './battle.js';
import { reconcileAchievements } from './achievements.js';
import { accrue, basePassiveIncome } from './game.js';
import { battleGoldReward, battleStars } from './campaign-rewards.js';
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
  state.campaignStars[stage.id - 1] = Math.max(previousBest, stars);   // 최고 별만 저장(전리품 별 배율은 이번 판 별 기준)
  const firstClear = stage.id > cleared;
  const gold = battleGoldReward(basePassiveIncome(state), firstClear, state.gold, stars, stage.id); // Permanent income; temporary potions only boost accrual.
  state.gold = addMoney(state.gold, gold);
  return { ok: true, firstClear, gold, stars, newBest: stars > previousBest, achievements: reconcileAchievements(state) };
}
