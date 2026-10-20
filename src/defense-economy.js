// 무한 방어전 보급 계산: 기지 레벨표, 계급별 시작 기지, 짓기·강화 비용, 바로 부르기 보너스.
import {
  BASE_MAX_LEVEL, RANK_START_LEVEL, LINES, BAYS, MAX_LEVEL, TRAIT_LEVELS, CALL_EARLY_PER_S,
} from './defense-data.js';

const checkLevel = (level, max) => {
  if (!Number.isInteger(level) || level < 1 || level > max) throw new RangeError('Invalid defense level');
};

// 기지 Lv1~30: 간격 ×0.94씩(최소 0.4초), 한 번에 +2씩, 상한 +50씩.
export function baseStats(level) {
  checkLevel(level, BASE_MAX_LEVEL);
  const interval = Math.max(0.4, 1.5 * 0.94 ** (level - 1)), amount = 10 + 2 * (level - 1);
  return { interval, amount, cap: 200 + 50 * (level - 1), perSecond: amount / interval };
}
// 그 레벨로 올리는 비용(Lv2부터). 10 단위로 반올림.
export function baseUpgradeCost(level) {
  checkLevel(level, BASE_MAX_LEVEL);
  return level === 1 ? 0 : Math.round(120 * 1.3 ** (level - 2) / 10) * 10;
}

// 부사령관 미만은 방어전이 잠겨 있으므로 null.
export const startBaseLevel = rank => RANK_START_LEVEL[rank] ?? null;

export function buildCost(line) {
  if (!LINES[line]) throw new RangeError('Unknown defense line');
  return LINES[line].buildCost;
}
export function bayBuildCost(bay) {
  if (!BAYS[bay]) throw new RangeError('Unknown support bay');
  return BAYS[bay].buildCost;
}

// level → level+1 비용 = 짓기 값 × (0.4 + level × 0.05). Lv30·40·50으로 올라갈 땐 3배.
export function upgradeCost(cost, level) {
  checkLevel(level, MAX_LEVEL - 1);
  const milestone = TRAIT_LEVELS.includes(level + 1) || level + 1 === MAX_LEVEL;
  return Math.ceil(cost * (8 + level) * (milestone ? 3 : 1) / 20);   // 0.4 + Lv×0.05 = (8 + Lv)/20, 정수로 계산
}
// level에서 target까지 한 번에 올리는 비용.
export function upgradeCostTo(cost, level, target) {
  let sum = 0;
  for (let l = level; l < target; l++) sum += upgradeCost(cost, l);
  return sum;
}
// 다음 선택(진화 조건 레벨, 특성, 최종)이 있는 레벨.
export function nextChoiceLevel(level) {
  return [10, 20, ...TRAIT_LEVELS, MAX_LEVEL].find(l => l > level) ?? null;
}
// 팔기: 쓴 보급의 60%.
export const sellRefund = spent => Math.floor(spent * 0.6);
// 바로 부르기: 남은 초 × 5 (소수점 버림).
export const callEarlyBonus = secondsLeft => Math.floor(Math.max(0, secondsLeft) * CALL_EARLY_PER_S);
