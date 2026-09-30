import { catalogVisible, rankForArmy, RANKS } from "./ranks.js";

export const COMMAND_BATON = Object.freeze({
  id: "commandBaton", name: "지휘봉", unlockRank: "중령",
  upgradeRank: "대령", level: 1, maxLevel: 2, recruitAmount: 100,
});
export const GENERAL_SWORD = Object.freeze({
  id: "generalSword", name: "장군검", unlockRank: "준장", level: 1,
  durationMs: 30_000, cooldownMs: 600_000, tapMultiplier: 2,
});
export const BULK_RECRUIT = Object.freeze({
  soldier: Object.freeze({ level: 1, unlockRank: COMMAND_BATON.unlockRank }),
  sergeant: Object.freeze({ level: 2, unlockRank: COMMAND_BATON.upgradeRank }),
});
// Both personal items are derived from actual rank, without duplicate saved rewards.
export function commandBatonStatus(state) {
  const rank = rankForArmy(state);
  const owned = rank >= RANKS.indexOf(COMMAND_BATON.unlockRank);
  return {
    visible: catalogVisible(state, COMMAND_BATON.unlockRank), owned,
    level: !owned ? 0 : rank >= RANKS.indexOf(COMMAND_BATON.upgradeRank) ? 2 : 1,
  };
}
export function generalSwordStatus(state) {
  const owned = rankForArmy(state) >= RANKS.indexOf(GENERAL_SWORD.unlockRank);
  return { visible: catalogVisible(state, GENERAL_SWORD.unlockRank), owned,
    level: owned ? GENERAL_SWORD.level : 0 };
}
export function bulkRecruitAccess(state, type) {
  const rule = BULK_RECRUIT[type];
  if (!rule) return { visible: false, unlocked: false, requirement: "일괄 모집 미지원" };
  const baton = commandBatonStatus(state);
  return { visible: baton.level >= rule.level, unlocked: baton.level >= rule.level,
    requirement: `지휘봉 Lv.${rule.level} · ${rule.unlockRank} 이상` };
}

// A single persisted start time defines both deadlines. A recorded later time cannot rewind.
export function swordSkillStatus(state, now = Date.now()) {
  const owned = generalSwordStatus(state).owned;
  const at = state.swordActivatedAt ?? null;
  const clock = Math.max(now, state.lastAccrual ?? 0);
  const elapsed = at === null ? Infinity : Math.max(0, clock - at);
  const active = owned && elapsed < GENERAL_SWORD.durationMs;
  const remainingMs = at === null ? 0 : Math.max(0, GENERAL_SWORD.cooldownMs - elapsed);
  return { owned, active, canUse: owned && remainingMs === 0,
    activeMs: active ? GENERAL_SWORD.durationMs - elapsed : 0, remainingMs,
    multiplier: active ? GENERAL_SWORD.tapMultiplier : 1 };
}
