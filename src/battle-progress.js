import { STAGES, battleAccess } from './battle.js';
import { reconcileAchievements } from './achievements.js';
import { accrue } from './game.js';

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
  return { ok: true, firstClear: stage.id > cleared, achievements: reconcileAchievements(state) };
}
