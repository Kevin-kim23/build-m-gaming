import { STAGES, battleAccess } from './battle.js';
import { reconcileAchievements } from './achievements.js';
import { accrue, perSecond } from './game.js';
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
  const firstClear = stage.id > cleared, stars = battleStars(battle);
  const gold = battleGoldReward(perSecond(state), firstClear, state.gold, stars); // 새 점령 보너스가 반영된 수입 기준
  state.gold = addMoney(state.gold, gold);
  return { ok: true, firstClear, gold, stars, achievements: reconcileAchievements(state) };
}
