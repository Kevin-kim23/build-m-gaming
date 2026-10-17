import test from 'node:test';
import assert from 'node:assert/strict';
import { createOfflineRewardUI, offlineRewardMarkup, offlineRewardPreview } from '../src/offline-reward-ui.js';
import { createGameSession } from '../src/session.js';
import { freshState, SAVE_KEY } from '../src/state.js';
import { MAX_GOLD, serializeSave, exact } from '../src/money.js';
import { createOfflineRewardAd } from '../src/rewarded-ads.js';
import { claimOfflineReward } from '../src/offline-reward.js';
import { readFileSync } from 'node:fs';

// Isolated DOM/storage doubles: never modify a real browser's saved progress.
function fixture(showAd) {
  const nodes=new Map(),closeEvents=[];
  const node=selector=>{
    if(!nodes.has(selector))nodes.set(selector,{textContent:'',disabled:false,listeners:{},
      addEventListener(type,fn){this.listeners[type]=fn;},
      async click(){if(!this.disabled)return this.listeners.click?.();}});
    return nodes.get(selector);
  };
  const dialog={...node('dialog'),open:false,querySelector:node,
    showModal(){this.open=true;},close(){this.open=false;closeEvents.push(()=>this.listeners.close?.());}};
  let clock=1800000000000;
  const data=new Map([[SAVE_KEY,serializeSave({...freshState(clock-3600000),soldiers:3})]]);
  const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
  let ui,markup='';
  const session=createGameSession({storage,now:()=>clock,setTimer:()=>1,clearTimer:()=>{},onChange:()=>ui?.sync()});
  const root={body:{insertAdjacentHTML(_position,html){markup=html;}},querySelector:()=>dialog};
  ui=createOfflineRewardUI(session,{root,showAd});
  session.start();
  return {session,node,dialog,markup,ui,setTime:value=>{clock=value;},
    dispatchClose:()=>{while(closeEvents.length)closeEvents.shift()();}};
}

test('return popup shows earned gold, normal receipt persists and repeated clicks cannot pay again',async()=>{
  const f=fixture();
  assert.equal(f.dialog.open,true);
  assert.match(f.markup,/방치 수익/);
  assert.equal(f.node('[data-offline-time]').textContent,'1시간 수익');
  assert.equal(f.node('[data-offline-gold]').textContent,'10,800 G');
  assert.equal(f.node('[data-offline-normal]').textContent,'+10,800 G');
  assert.equal(f.node('[data-offline-double-amount]').textContent,'총 21,600 G');
  assert.equal(f.node('[data-offline-double-label]').textContent,'광고 보고 2배 받기');
  await f.node('[data-offline-claim]').click();
  assert.equal(f.session.state.gold,10800);assert.equal(f.dialog.open,false);
  await f.node('[data-offline-claim]').click();assert.equal(f.session.state.gold,10800);
  f.session.pause();
});

test('closing keeps the reward, ordinary updates do not reopen it, and returning shows it again',async()=>{
  const f=fixture();await f.node('[data-offline-close]').click();
  f.ui.sync();assert.equal(f.dialog.open,false);f.dispatchClose();
  assert.equal(f.session.state.offlineReward.amount,10800);
  f.session.pause();f.session.start();assert.equal(f.dialog.open,true);
  f.session.pause();
});

test('a delayed native close event cannot dismiss a newly reopened reward dialog',()=>{
  const f=fixture();f.session.pause();f.session.start();f.dispatchClose();
  assert.equal(f.dialog.open,true);
  f.session.state.offlineReward.amount=12000;f.ui.sync();
  assert.equal(f.node('[data-offline-gold]').textContent,'12,000 G');
  f.dialog.close();f.dispatchClose();f.ui.sync();assert.equal(f.dialog.open,false);
  f.session.pause();
});

test('an unavailable ad explains failure and leaves normal receiving usable',async()=>{
  const f=fixture();await f.node('[data-offline-double]').click();
  assert.equal(f.dialog.open,true);assert.equal(f.session.state.gold,0);
  assert.match(f.node('[data-offline-message]').textContent,/지금 광고를 불러올 수 없어요/);
  await f.node('[data-offline-claim]').click();assert.equal(f.session.state.gold,10800);
  f.session.pause();
});

test('completed ad double receipt disables both buttons during the callback and pays exactly twice',async()=>{
  let finish;
  const f=fixture(()=>new Promise(resolve=>{finish=resolve;}));
  const job=f.node('[data-offline-double]').click();
  assert.equal(f.node('[data-offline-claim]').disabled,true);
  assert.equal(f.node('[data-offline-double]').disabled,true);
  assert.equal(f.node('[data-offline-double-label]').textContent,'광고 확인 중…');
  await f.node('[data-offline-claim]').click();assert.equal(f.session.state.gold,0);
  finish(await createOfflineRewardAd(true)());await job;
  assert.equal(f.session.state.gold,21600);assert.equal(f.dialog.open,false);
  f.session.pause();
});

test('preview amounts match actual normal and rewarded payouts at exact-money and wallet-cap boundaries',()=>{
  for(const [gold,amount] of [
    [0,10800], [0,Number.MAX_SAFE_INTEGER], [0,9007199254740993n],
    [10n**20n+7n,10n**20n+9n], [MAX_GOLD-150n,100],
    [MAX_GOLD-1n,9007199254740993n], [MAX_GOLD,MAX_GOLD],
  ]) {
    const reward={id:1,amount,durationMs:3600000};
    const preview=offlineRewardPreview(reward,gold);
    const normal=claimOfflineReward({gold,offlineReward:reward},1,1);
    const doubled=claimOfflineReward({gold,offlineReward:reward},1,2);
    assert.equal(exact(preview.normal),exact(normal.amount));
    assert.equal(exact(preview.doubled),exact(doubled.amount));
    assert.equal(exact(preview.bonus),exact(doubled.amount)-exact(normal.amount));
  }
});

test('a partly capped bonus states the actual total without promising twice the payout',()=>{
  const f=fixture();
  f.session.state.gold=MAX_GOLD-150n;
  f.session.state.offlineReward.amount=100;
  f.ui.sync();
  assert.equal(f.node('[data-offline-gold]').textContent,'100 G');
  assert.equal(f.node('[data-offline-double-label]').textContent,'광고 보고 추가 받기');
  assert.equal(f.node('[data-offline-double-amount]').textContent,'총 150 G');
  assert.equal(f.node('[data-offline-double]').title,'광고 시청 완료 후 총 150 G 지급');
  assert.equal(f.node('[data-offline-double]').hidden,false);
  assert.equal(f.node('[data-offline-cap]').hidden,false);
  f.session.pause();
});

test('when an ad cannot add any gold it is hidden and normal receiving remains available',async()=>{
  for(const remaining of [0n,1n]) {
    let adCalls=0;
    const f=fixture(async()=>{adCalls++;return {status:'rewarded'};});
    f.session.state.gold=MAX_GOLD-remaining;f.ui.sync();
    assert.equal(f.node('[data-offline-double]').hidden,true);
    assert.equal(f.node('[data-offline-gold]').textContent,remaining+' G');
    assert.equal(f.node('[data-offline-claim]').disabled,false);
    await f.node('[data-offline-claim]').click();
    assert.equal(f.session.state.gold,MAX_GOLD);
    assert.equal(f.session.state.offlineReward,null);
    assert.equal(adCalls,0);
    f.session.pause();
  }
});

test('cancelled advertising restores both choices and retains all pending gold',async()=>{
  const f=fixture(async()=>({status:'cancelled'}));
  await f.node('[data-offline-double]').click();
  assert.equal(f.dialog.open,true);
  assert.equal(f.session.state.offlineReward.amount,10800);
  assert.equal(f.session.state.gold,0);
  assert.equal(f.node('[data-offline-claim]').disabled,false);
  assert.equal(f.node('[data-offline-double]').disabled,false);
  assert.equal(f.node('[data-offline-double-label]').textContent,'광고 보고 2배 받기');
  assert.match(f.node('[data-offline-message]').textContent,/보상은 보관/);
  f.session.pause();
});

test('compact reward card keeps normal receiving and a labelled optional ad, with reduced motion',()=>{
  const markup=offlineRewardMarkup();
  assert.match(markup,/그냥 받기/);
  assert.match(markup,/광고 보고 2배 받기/);
  assert.match(markup,/최대 8시간/);
  assert.match(markup,/aria-label="보상 나중에 받기"/);
  assert.doesNotMatch(markup,/열심히 활동|병력·장비·보너스|보유 골드 상한/);
  const css=readFileSync(new URL('../src/offline-reward.css',import.meta.url),'utf8');
  assert.match(css,/min-height:48px/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(css,/\binfinite\b/);
});
