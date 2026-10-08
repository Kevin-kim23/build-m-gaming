import { minMoney, subtractMoney, addMoney, multiplyMoney } from './money.js';
import { AUTO_TOUCH, GENERAL_SWORD, generalRevolverStatus } from './personal-equipment.js';

// Pay due pulses once, including throttled/offline time within the activation's
// window. Mutations settle before changing troops, equipment or the gold boost.
export function settleAutoTouch(state, now, baseTapGold, maxGold) {
  const at=state.autoTouchActivatedAt;
  if(at==null || !generalRevolverStatus(state).owned)return 0;
  const paid=state.autoTouchTicks ?? 0;
  const duration=state.autoTouchDurationMs??AUTO_TOUCH.durationMs;
  const due=Math.max(0,Math.min(Math.floor(duration/AUTO_TOUCH.intervalMs),Math.floor((now-at)/AUTO_TOUCH.intervalMs)));
  if(due<=paid)return 0;
  const countWindow=(start,end)=>{
    if(start==null)return 0;
    const first=Math.max(paid+1,Math.ceil((start-at)/AUTO_TOUCH.intervalMs));
    const last=Math.min(due,Math.ceil((end-at)/AUTO_TOUCH.intervalMs)-1);
    return Math.max(0,last-first+1);
  };
  let boosted=0,overlap=0;
  const red=state.potions?.red;
  const potionBoost=countWindow(red?.startedAt,red?.expiresAt);
  if(state.swordActivatedAt!==null && state.swordActivatedAt!==undefined){
    const end=state.swordActivatedAt+(state.swordDurationMs??GENERAL_SWORD.durationMs);
    boosted=countWindow(state.swordActivatedAt,end);
    if(red?.startedAt!=null)overlap=countWindow(Math.max(state.swordActivatedAt,red.startedAt),Math.min(end,red.expiresAt));
  }
  const earned=minMoney(subtractMoney(maxGold,state.gold),multiplyMoney(baseTapGold,due-paid+potionBoost+(boosted+overlap)*(GENERAL_SWORD.tapMultiplier-1)));
  state.gold=addMoney(state.gold,earned);
  state.autoTouchTicks=due;
  return earned;
}
