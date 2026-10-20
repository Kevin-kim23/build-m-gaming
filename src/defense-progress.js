// 무한 방어전 저장 기록(저장 버전 44): 최고 기록, 방어 훈장, 계열 각성, 하루 보상 횟수.
// 판 하나의 상태(run)는 저장하지 않는다. 판이 끝날 때 기록과 보상만 반영한다.
import { LINES, UNLOCK_RANK } from './defense-data.js';
import { RANKS, rankForArmy } from './ranks.js';
import { awardLoot } from './loot.js';
import { rewardDay } from './campaign-rewards.js';

export const DAILY_REWARDS = 3;
export const AWAKEN_COSTS = Object.freeze([20, 40, 80, 160, 320]);   // ★1~★5에 드는 방어 훈장
export const AWAKEN_STEP = 0.1;                                      // ★마다 그 계열 공격 +10%
export const LOOT_PER_WAVE = 8;
export const MAX_MEDALS = 1_000_000_000;
const MAX_WAVE = 100_000;

export const emptyDefense = () => ({ best: 0, bestAt: 0, medals: 0, awaken: { armor: 0, firepower: 0, air: 0 }, rewardDay: 0, rewardCount: 0 });
const integer = (v, max) => Number.isSafeInteger(v) && v >= 0 && v <= max;

export function validDefense(d, lastAccrual) {
  return !!d && typeof d === 'object' && !Array.isArray(d) && integer(d.best, MAX_WAVE) && integer(d.bestAt, lastAccrual)
    && (d.best > 0 || d.bestAt === 0) && integer(d.medals, MAX_MEDALS) && integer(d.rewardDay, 2_000_000) && integer(d.rewardCount, DAILY_REWARDS)
    && !!d.awaken && typeof d.awaken === 'object' && !Array.isArray(d.awaken) && Object.keys(d.awaken).length === Object.keys(LINES).length
    && Object.keys(LINES).every(line => integer(d.awaken[line], AWAKEN_COSTS.length));
}
export const copyDefense = d => ({ ...d, awaken: { ...d.awaken } });

export const defenseUnlocked = state => rankForArmy(state) >= RANKS.indexOf(UNLOCK_RANK);
export const defenseOf = state => state.defense ?? emptyDefense();

// 오늘 남은 보상 판 수(한국 시간 자정 기준, 본편 재도전 보상과 같은 날짜 계산).
export function rewardsLeft(state, now = Date.now()) {
  const d = defenseOf(state), day = rewardDay(Math.max(now, state.lastAccrual ?? 0));
  return day > d.rewardDay ? DAILY_REWARDS : Math.max(0, DAILY_REWARDS - d.rewardCount);
}

// 판 끝: 최고 기록은 항상, 보상(전리품·방어 훈장)은 하루 3판까지. 0웨이브는 보상 없음.
export function recordDefenseRun(state, cleared, now = Date.now()) {
  if (!integer(cleared, MAX_WAVE)) throw new RangeError('Invalid defense result');
  state.defense ??= emptyDefense();
  const d = state.defense, clock = Math.max(now, state.lastAccrual ?? 0), day = rewardDay(clock);
  const newBest = cleared > d.best;
  if (newBest) { d.best = cleared; d.bestAt = clock; }
  const rewarded = cleared > 0 && rewardsLeft(state, clock) > 0;
  let loot = 0, medals = 0;
  if (rewarded) {
    d.rewardCount = day > d.rewardDay ? 1 : d.rewardCount + 1; d.rewardDay = day;
    loot = awardLoot(state, cleared * LOOT_PER_WAVE);
    medals = Math.min(cleared, MAX_MEDALS - d.medals); d.medals += medals;
  }
  return { newBest, rewarded, loot, medals, left: rewardsLeft(state, clock) };
}

export const awakenCost = level => AWAKEN_COSTS[level] ?? null;
export function awaken(state, line) {
  if (!LINES[line]) throw new RangeError('Unknown defense line');
  const d = state.defense ??= emptyDefense(), cost = awakenCost(d.awaken[line]);
  if (cost === null) return { ok: false, reason: 'max' };
  if (d.medals < cost) return { ok: false, reason: 'medals' };
  d.medals -= cost; d.awaken[line] += 1;
  return { ok: true, level: d.awaken[line] };
}
// 판 시작 때 계열 공격 보너스(★ × 10%).
export const awakenBonus = state => Object.fromEntries(Object.keys(LINES).map(line => [line, defenseOf(state).awaken[line] * AWAKEN_STEP]));
