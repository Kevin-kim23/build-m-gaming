import { accrue } from './game.js';
import { MAX_OFFLINE_MS, OFFLINE_POPUP_MS } from './offline-rules.js';
import { MAX_GOLD, addMoney, subtractMoney, multiplyMoney, minMoney } from './money.js';

// Called only on session activation, never by the active-play income timer.
// Settle into a temporary wallet so the normal income/skill math stays shared.
export function prepareOfflineReward(state, now) {
  const absence = Math.max(0, Math.floor(now - state.lastAccrual));
  const pending = state.offlineReward;
  if (!absence || (!pending && absence < OFFLINE_POPUP_MS)) return false;
  const durationMs = Math.min(absence, MAX_OFFLINE_MS - (pending?.durationMs ?? 0));
  const settlement = {...state, gold:0};
  const earned = accrue(settlement, state.lastAccrual + durationMs);
  state.lastAccrual = now; // Discard time over the cap; it must never be paid on a later tick.
  state.incomeRemainder = settlement.incomeRemainder;
  state.autoTouchTicks = settlement.autoTouchTicks;
  const amount = minMoney(MAX_GOLD, addMoney(pending?.amount ?? 0, earned));
  state.offlineReward = amount > 0 ? {
    id: earned > 0 || !pending ? now : pending.id,
    amount, durationMs: (pending?.durationMs ?? 0) + durationMs,
  } : null;
  return true;
}

// Only the rewarded-ad adapter's completion path may request multiplier 2.
export function claimOfflineReward(state, id, multiplier = 1) {
  const reward = state.offlineReward;
  if (!reward || reward.id !== id || ![1,2].includes(multiplier)) return {ok:false,reason:'stale'};
  const amount = minMoney(multiplyMoney(reward.amount,multiplier), subtractMoney(MAX_GOLD,state.gold));
  state.gold = addMoney(state.gold,amount);
  state.offlineReward = null;
  if (state.gold === MAX_GOLD) state.incomeRemainder = 0;
  return {ok:true,amount,multiplier};
}
