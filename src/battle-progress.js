import { STAGES, battleAccess } from './battle.js';

// Only finished victories advance the next stage. No gold or inventory changes.
export function recordBattleVictory(state, battle) {
  const stage = STAGES.find((entry) => entry.id === battle?.stageId);
  const cleared = state.battleCleared ?? 0;
  if (!battleAccess(state).unlocked || !stage || battle.status !== 'victory' ||
      battle.enemy?.hq?.hp !== 0 || !(battle.player?.hq?.hp > 0))
    return { ok: false, reason: 'invalid' };
  if (stage.id > cleared + 1) return { ok: false, reason: 'sequence' };
  state.battleCleared = Math.max(cleared, stage.id);
  return { ok: true, firstClear: stage.id > cleared };
}
