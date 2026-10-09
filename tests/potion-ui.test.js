import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/state.js';
import {grantPotion} from '../src/potions.js';
import {usePotion} from '../src/game.js';
import {createPotionAd} from '../src/potion-ad.js';
import {potionsMarkup,renderPotions} from '../src/potion-panels.js';
import {potionIcon} from '../src/potion-art.js';
import {createIncomeHud} from '../src/income-hud.js';
import {createGameSession} from '../src/session.js';
import {createPotionController} from '../src/potion-controller.js';
import {parseSave} from '../src/save.js';
import {SAVE_KEY} from '../src/state.js';
const T=1800000000000;
function fakeNode(){
  const listeners={},children=new Map();let content='',writes=0;
  return {hidden:true,disabled:false,listeners,
    set textContent(value){content=value;writes++;},get textContent(){return content;},get writes(){return writes;},
    setAttribute(){},addEventListener:(event,fn)=>{listeners[event]=fn;},
    querySelector(selector){if(!children.has(selector))children.set(selector,fakeNode());return children.get(selector);},
    click(){return listeners.click?.();}};
}
test('native reward adapter rejects web, bad items, cancellation and failures without fake grants',async()=>{
  let calls=0;
  const plugin={showRewarded:async()=>{calls++;return {status:'rewarded'};}};
  assert.equal((await createPotionAd({native:()=>false,plugin})({itemId:'red'})).status,'unavailable');
  assert.equal((await createPotionAd({native:()=>true,plugin})({itemId:'bad'})).status,'unavailable');
  assert.equal(calls,0);
  for(const status of ['cancelled','unavailable','anything',undefined]){
    const show=createPotionAd({native:()=>true,plugin:{showRewarded:async()=>({status})}});
    assert.notEqual((await show({itemId:'red'})).status,'rewarded');
  }
  const show=createPotionAd({native:()=>true,plugin:{showRewarded:async()=>{throw Error('SDK unavailable');}}});
  await assert.rejects(show({itemId:'red'}),/SDK unavailable/);
  await assert.rejects(show({itemId:'red'}),/SDK unavailable/);
});
test('native rewarded result waits for foreground save lock and prevents duplicate requests',async()=>{
  let finish,active=false,delays=0;
  const show=createPotionAd({native:()=>true,plugin:{showRewarded:()=>new Promise(r=>finish=r)},
    isActive:()=>active,delay:async()=>{delays++;active=true;}});
  const pending=show({itemId:'blue'});
  assert.equal((await show({itemId:'red'})).status,'unavailable');
  finish({status:'rewarded'});
  assert.equal((await pending).status,'rewarded');assert.equal(delays,1);
  const inactive=createPotionAd({native:()=>true,plugin:{showRewarded:async()=>({status:'rewarded'})},isActive:()=>false,delay:async()=>{}});
  assert.equal((await inactive({itemId:'red'})).status,'unavailable');
});

test('two item cards show stock, disable empty/busy use, and update text without replacing markup',()=>{
  const html=potionsMarkup();assert.equal((html.match(/data-potion-ad=/g)??[]).length,2);
  assert.equal((html.match(/data-potion-use=/g)??[]).length,2);
  assert.match(html,/1분 지속/);assert.match(html,/30분 지속/);
  for(const id of ['red','blue']){assert.equal(potionIcon(id),potionIcon(id));assert.doesNotMatch(potionIcon(id),/href=|<image|script/);}
  assert.notEqual(potionIcon('red'),potionIcon('blue'));
  const root=fakeNode(),s=freshState(T),red=root.querySelector('[data-potion="red"]');
  renderPotions(s,root,{now:T});assert.equal(red.querySelector('[data-potion-use]').disabled,true);
  grantPotion(s,'red');renderPotions(s,root,{now:T});assert.equal(red.querySelector('[data-potion-count]').textContent,'보유 1개');
  assert.equal(red.querySelector('[data-potion-use]').disabled,false);
  renderPotions(s,root,{now:T,busy:true});assert.equal(red.querySelector('[data-potion-ad]').disabled,true);
  usePotion(s,T,'red');renderPotions(s,root,{now:T+1000});assert.equal(red.querySelector('[data-potion-time]').textContent,'사용 중 · 0:59 남음');
  const writes=red.querySelector('[data-potion-time]').writes;
  for(let i=0;i<300;i++)renderPotions(s,root,{now:T+1000});assert.equal(red.querySelector('[data-potion-time]').writes,writes);
  renderPotions(s,root,{now:T+60000});assert.equal(red.querySelector('[data-potion-time]').textContent,'사용 대기');
});

test('home HUD shows both potion timers, clears at expiry and does no extra writes for rapid taps',()=>{
  const nodes=new Map();const root={querySelector:s=>{if(!nodes.has(s))nodes.set(s,fakeNode());return nodes.get(s);}};
  const ui=createIncomeHud(root),s=freshState(T);
  for(const id of ['red','blue']){grantPotion(s,id);usePotion(s,T,id);}
  ui.syncPotions(s,T);
  const red=nodes.get('#tap-potion-effect'),blue=nodes.get('#passive-potion-effect');
  assert.equal(red.textContent,'빨간물약 ×2 · 1:00');assert.equal(blue.textContent,'파랑물약 ×2 · 30:00');
  const writes=red.writes+blue.writes;
  for(let i=0;i<300;i++)ui.syncPotions(s,T);assert.equal(red.writes+blue.writes,writes);
  ui.syncPotions(s,T+60000);assert.equal(red.hidden,true);assert.equal(blue.hidden,false);
  ui.syncPotions(s,T+1800000);assert.equal(blue.hidden,true);
});

test('Android pause/reward/resume grants the selected potion exactly once and persists it',async()=>{
  const saved=new Map();
  const session=createGameSession({storage:{getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)},now:()=>T,setTimer:()=>1,clearTimer:()=>{}});
  session.start();
  const showAd=createPotionAd({native:()=>true,isActive:()=>session.active,
    plugin:{showRewarded:async({itemId})=>{assert.equal(itemId,'blue');session.pause();return {status:'rewarded'};}},
    delay:async()=>session.start()});
  const controller=createPotionController(session,{showAd,now:()=>T});
  assert.equal((await controller.watch('blue')).ok,true);
  const state=parseSave(saved.get(SAVE_KEY),T);
  assert.equal(state.potions.blue.count,1);assert.equal(state.potions.red.count,0);
  session.pause();
});
