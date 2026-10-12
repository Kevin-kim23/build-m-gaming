import test from 'node:test';
import assert from 'node:assert/strict';
import { createOfflineRewardUI } from '../src/offline-reward-ui.js';
import { createGameSession } from '../src/session.js';
import { freshState, SAVE_KEY } from '../src/state.js';
import { serializeSave } from '../src/money.js';
import { createOfflineRewardAd } from '../src/rewarded-ads.js';

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
  assert.match(f.markup,/병사들이 골드를 모았어요/);
  assert.equal(f.node('[data-offline-time]').textContent,'수입 정산: 1시간');
  assert.equal(f.node('[data-offline-gold]').textContent,'10,800 G');
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
  await f.node('[data-offline-claim]').click();assert.equal(f.session.state.gold,0);
  finish(await createOfflineRewardAd(true)());await job;
  assert.equal(f.session.state.gold,21600);assert.equal(f.dialog.open,false);
  f.session.pause();
});
