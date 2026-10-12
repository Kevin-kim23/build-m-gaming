import {accrue,perTap} from './game.js';
import {addMoney,subtractMoney,multiplyMoney,minMoney,MAX_GOLD} from './money.js';

import { HOME_AUTO_TAP, homeAutoTapEnabled } from './home-auto-tap-rules.js';
export * from './home-auto-tap-rules.js';

export function homeAutoTapHomeVisible(root){
  if(root.querySelector('dialog[open]'))return false;
  const guide=root.querySelector('#guide-spotlight');
  return !(typeof guide?.showPopover==='function' && guide.matches(':popover-open'));
}

// Internal wallet action only: no DOM click, finger slot, manual tap count or offline pulses.
export function awardHomeAutoTaps(s,now,count){
  if(!homeAutoTapEnabled(s)||!Number.isInteger(count)||count<1||count>2 ||
    !Number.isSafeInteger(now)||now<0||now>100_000_000_000_000)return 0;
  accrue(s,now);
  const amount=minMoney(multiplyMoney(perTap(s,now),count),subtractMoney(MAX_GOLD,s.gold));
  s.gold=addMoney(s.gold,amount);
  if(s.gold===MAX_GOLD)s.incomeRemainder=0;
  return amount;
}

// Driven by the existing app clock. Monotonic elapsed time never crosses app/view pauses.
export function createHomeAutoTapRuntime(session,{canRun,clock=()=>performance.now(),now=Date.now,onIncome=()=>{}}){
  let last=null,remainder=0;
  const reset=()=>{last=null;remainder=0;};
  function tick(){
    if(!session.active||!homeAutoTapEnabled(session.state)||!canRun()){reset();return 0;}
    const current=clock();
    if(!Number.isFinite(current)){reset();return 0;}
    if(last===null){last=current;return 0;}
    const elapsed=current-last;last=current;
    // Browser suspension/long stalls do not become a burst of catch-up taps.
    if(elapsed<0||elapsed>HOME_AUTO_TAP.maxGapMs){remainder=0;return 0;}
    remainder+=elapsed;
    const count=Math.floor(remainder/HOME_AUTO_TAP.intervalMs);
    if(!count)return 0;
    remainder-=count*HOME_AUTO_TAP.intervalMs;
    const amount=session.change(s=>awardHomeAutoTaps(s,now(),count),{defer:true})??0;
    if(amount>0)onIncome(amount);
    return amount;
  }
  return {tick,reset};
}
