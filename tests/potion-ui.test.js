import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/state.js';
import {grantPotion} from '../src/potions.js';
import {usePotion} from '../src/game.js';
import {createPotionTestAd} from '../src/potion-ad.js';
import {potionsMarkup,renderPotions} from '../src/potion-panels.js';
import {potionIcon} from '../src/potion-art.js';
import {createIncomeHud} from '../src/income-hud.js';
import {createBackHandler} from '../src/back-button.js';
const T=1800000000000;
function fakeNode(){
  const listeners={},children=new Map();let content='',writes=0;
  return {hidden:true,disabled:false,listeners,
    set textContent(value){content=value;writes++;},get textContent(){return content;},get writes(){return writes;},
    setAttribute(){},addEventListener:(event,fn)=>{listeners[event]=fn;},
    querySelector(selector){if(!children.has(selector))children.set(selector,fakeNode());return children.get(selector);},
    click(){return listeners.click?.();}};
}
test('test ad popup grants only on confirm, cancels via Android back, and ignores late close events',async()=>{
  const dialog={...fakeNode(),open:false,showModal(){this.open=true;},close(){this.open=false;}};
  const root={createElement:()=>dialog,body:{append(){}},querySelector:s=>s==='#potion-ad-modal'?dialog:null};
  const show=createPotionTestAd(root);
  const first=show({itemId:'red'});
  assert.match(dialog.innerHTML,/광고는 본 걸로 칩니다/);assert.match(dialog.innerHTML,/나중엔 광고가 나와요/);
  assert.equal(dialog.querySelector('[data-potion-ad-reward]').textContent,'빨간물약 1개');
  assert.equal((await show({itemId:'blue'})).status,'unavailable');
  dialog.querySelector('[data-potion-ad-confirm]').click();assert.equal((await first).status,'rewarded');
  const second=show({itemId:'blue'});dialog.listeners.close();assert.equal(dialog.open,true);
  const back=createBackHandler({root,exit:()=>assert.fail('cannot exit while ad popup is open'),hint:()=>assert.fail('no exit hint')});
  assert.equal(back(),'closed');dialog.listeners.close();assert.equal((await second).status,'cancelled');
  const third=show({itemId:'blue'});dialog.querySelector('[data-potion-ad-confirm]').click();assert.equal((await third).status,'rewarded');
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
