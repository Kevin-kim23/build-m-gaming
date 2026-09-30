import { catalogVisible, rankForArmy, RANKS } from "./ranks.js";

export const COMMAND_BATON = Object.freeze({
  id: "commandBaton", name: "지휘봉", unlockRank: "중령",
  upgradeRank: "대령", level: 1, maxLevel: RANKS.length - RANKS.indexOf("중령"), recruitAmount: 100,
});
export const GENERAL_SWORD = Object.freeze({
  id: "generalSword", name: "장군검", unlockRank: "준장", level: 1,
  durationMs: 30_000, durationStepMs: 10_000, cooldownMs: 600_000, tapMultiplier: 2,
});
export const DIVISION_FLAG = Object.freeze({ id:'divisionFlag', name:'사단기', unlockRank:'소장', maxLevel:2 });
export const GENERAL_REVOLVER = Object.freeze({ id:'generalRevolver', name:'장군 리볼버', unlockRank:'중장', maxLevel:1 });
const rewardStatus = (state, item) => {
  const rank=rankForArmy(state), first=RANKS.indexOf(item.unlockRank), owned=rank>=first;
  return { visible:catalogVisible(state,item.unlockRank), owned, level:owned?Math.min(item.maxLevel,rank-first+1):0 };
};
export const divisionFlagStatus = state => rewardStatus(state,DIVISION_FLAG);
export const generalRevolverStatus = state => rewardStatus(state,GENERAL_REVOLVER);
export const generalSwordDuration = state => GENERAL_SWORD.durationMs + Math.max(0,generalSwordStatus(state).level-1)*GENERAL_SWORD.durationStepMs;
export const AUTO_TOUCH = Object.freeze({ durationMs: 60_000, cooldownMs: 1_800_000, intervalMs: 300 });
export function autoTouchStatus(state, now = Date.now()) {
  const owned = generalRevolverStatus(state).owned;
  const at = state.autoTouchActivatedAt ?? null;
  const elapsed = at === null ? Infinity : Math.max(0, Math.max(now, state.lastAccrual ?? 0) - at);
  const active = owned && elapsed < AUTO_TOUCH.durationMs;
  const remainingMs = Math.max(0, AUTO_TOUCH.cooldownMs - elapsed);
  return { owned, active, canUse: owned && remainingMs === 0, remainingMs,
    activeMs: active ? AUTO_TOUCH.durationMs - elapsed : 0 };
}
export const BULK_RECRUIT = Object.freeze({
  soldier: Object.freeze({ level: 1, unlockRank: COMMAND_BATON.unlockRank }),
  sergeant: Object.freeze({ level: 2, unlockRank: COMMAND_BATON.upgradeRank }),
  staffSergeant: Object.freeze({ level: 3, unlockRank: '준장' }),
  masterSergeant: Object.freeze({ level: 4, unlockRank: '소장' }),
  sergeantMajor: Object.freeze({ level: 5, unlockRank: '중장' }),
  lieutenant: Object.freeze({ level: 6, unlockRank: '대장' }),
});
// All personal items are derived from actual rank, without duplicate saved rewards.
export function commandBatonStatus(state) {
  const rank = rankForArmy(state);
  const owned = rank >= RANKS.indexOf(COMMAND_BATON.unlockRank);
  return {
    visible: catalogVisible(state, COMMAND_BATON.unlockRank), owned,
    level: !owned ? 0 : rank - RANKS.indexOf(COMMAND_BATON.unlockRank) + 1,
  };
}
export function generalSwordStatus(state) {
  const rank = rankForArmy(state), firstRank = RANKS.indexOf(GENERAL_SWORD.unlockRank);
  const owned = rank >= firstRank;
  return { visible: catalogVisible(state, GENERAL_SWORD.unlockRank), owned,
    level: owned ? rank - firstRank + 1 : 0 };
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
  const durationMs = at === null ? generalSwordDuration(state) : (state.swordDurationMs ?? GENERAL_SWORD.durationMs);
  const active = owned && elapsed < durationMs;
  const remainingMs = at === null ? 0 : Math.max(0, GENERAL_SWORD.cooldownMs - elapsed);
  return { owned, active, canUse: owned && remainingMs === 0,
    activeMs: active ? durationMs - elapsed : 0, remainingMs, durationMs,
    multiplier: active ? GENERAL_SWORD.tapMultiplier : 1 };
}
