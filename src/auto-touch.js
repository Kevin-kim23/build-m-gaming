import {POTIONS} from './potions.js';
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
  const windows=[];
  for(const id of ['red','max']){
    const bonus=POTIONS[id].tapMultiplier-1;
    const p=state.potions?.[id];
    if(p?.startedAt!=null)windows.push({from:p.startedAt,to:p.expiresAt,bonus});
  }
  if(state.swordActivatedAt!=null)windows.push({from:state.swordActivatedAt,
    to:state.swordActivatedAt+(state.swordDurationMs??GENERAL_SWORD.durationMs),bonus:GENERAL_SWORD.tapMultiplier-1});
  let weighted=due-paid;
  // Expand the product into at most seven interval intersections, not a pulse loop.
  for(let mask=1;mask<(1<<windows.length);mask++){
    let from=-Infinity,to=Infinity,bonus=1;
    for(let i=0;i<windows.length;i++)if(mask&(1<<i)){
      from=Math.max(from,windows[i].from);to=Math.min(to,windows[i].to);bonus*=windows[i].bonus;
    }
    weighted+=countWindow(from,to)*bonus;
  }
  const earned=minMoney(subtractMoney(maxGold,state.gold),multiplyMoney(baseTapGold,weighted));
  state.gold=addMoney(state.gold,earned);
  state.autoTouchTicks=due;
  return earned;
}
