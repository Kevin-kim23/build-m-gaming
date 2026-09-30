import { AUTO_TOUCH, GENERAL_SWORD, generalRevolverStatus } from './personal-equipment.js';

// Pay due pulses once, including throttled/offline time within the one-minute
// window. Mutations settle before changing troops, equipment or the gold boost.
export function settleAutoTouch(state, now, baseTapGold, maxGold) {
  const at=state.autoTouchActivatedAt;
  if(at==null || !generalRevolverStatus(state).owned)return 0;
  const paid=state.autoTouchTicks ?? 0;
  const due=Math.max(0,Math.min(AUTO_TOUCH.durationMs/AUTO_TOUCH.intervalMs,Math.floor((now-at)/AUTO_TOUCH.intervalMs)));
  if(due<=paid)return 0;
  let boosted=0;
  if(state.swordActivatedAt!==null && state.swordActivatedAt!==undefined){
    const first=Math.max(paid+1,Math.ceil((state.swordActivatedAt-at)/AUTO_TOUCH.intervalMs));
    const last=Math.min(due,Math.ceil((state.swordActivatedAt+(state.swordDurationMs??GENERAL_SWORD.durationMs)-at)/AUTO_TOUCH.intervalMs)-1);
    boosted=Math.max(0,last-first+1);
  }
  const earned=Math.min(maxGold-state.gold,baseTapGold*(due-paid+boosted*(GENERAL_SWORD.tapMultiplier-1)));
  state.gold+=earned;
  state.autoTouchTicks=due;
  return earned;
}
