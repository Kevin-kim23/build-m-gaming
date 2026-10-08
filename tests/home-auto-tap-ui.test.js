import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/state.js';
import {createAutoTapTestPurchase} from '../src/test-purchase.js';
import {createHomeAutoTapFeedback,homeAutoTapMarkup,renderHomeAutoTap} from '../src/home-auto-tap-ui.js';
import {createBackHandler} from '../src/back-button.js';
import {grantTestHomeAutoTap,toggleHomeAutoTap} from '../src/home-auto-tap-rules.js';
import {recruitRank,recruitRankMarkup} from '../src/recruit-rank.js';
import {UNITS} from '../src/units.js';
import {insignia} from '../src/home-view.js';
import {FACILITIES} from '../src/facility-catalog.js';
function fakeNode(){
  const listeners={},children=new Map(),attributes={};let content='',writes=0;
  return {listeners,attributes,disabled:false,
    set textContent(v){content=v;writes++;},get textContent(){return content;},get writes(){return writes;},
    setAttribute(k,v){attributes[k]=v;},addEventListener:(t,fn)=>{listeners[t]=fn;},
    querySelector(s){if(!children.has(s))children.set(s,fakeNode());return children.get(s);},click(){return listeners.click?.();}};
}
test('test purchase dialog confirms explicitly, cancels via Android back, and safely reopens',async()=>{
  const dialog={...fakeNode(),open:false,showModal(){this.open=true;},close(){this.open=false;}};
  const root={createElement:()=>dialog,body:{append(){}},querySelector:s=>s==='#test-purchase-modal'?dialog:null};
  const show=createAutoTapTestPurchase(root),first=show();
  assert.match(dialog.innerHTML,/유료결제 테스트!/);assert.match(dialog.innerHTML,/특별히 이번엔 그냥 드릴게요/);
  assert.match(dialog.innerHTML,/실제 요금은 청구되지 않아요/);
  assert.equal((await show()).status,'unavailable');
  dialog.querySelector('[data-test-purchase-confirm]').click();assert.deepEqual(await first,{status:'granted',source:'test'});
  const second=show();dialog.listeners.close();assert.equal(dialog.open,true);
  const back=createBackHandler({root,hint:()=>assert.fail(),exit:()=>assert.fail()});
  assert.equal(back(),'closed');dialog.listeners.close();assert.equal((await second).status,'cancelled');
  const third=show();dialog.querySelector('[data-test-purchase-confirm]').click();assert.equal((await third).status,'granted');
});

test('item UI shows 4900 test price, locks repurchase, toggles accessibly and avoids unchanged text writes',()=>{
  assert.match(homeAutoTapMarkup(),/4,900원/);assert.match(homeAutoTapMarkup(),/초당 2회/);
  const s=freshState(1),root=fakeNode(),card=root.querySelector('[data-home-auto-tap]');
  renderHomeAutoTap(s,root);assert.equal(card.querySelector('[data-toggle-home-auto]').disabled,true);
  grantTestHomeAutoTap(s);renderHomeAutoTap(s,root);
  const buy=card.querySelector('[data-buy-home-auto]'),toggle=card.querySelector('[data-toggle-home-auto]');
  assert.equal(buy.disabled,true);assert.equal(buy.textContent,'보유 중');
  assert.equal(toggle.disabled,false);assert.equal(toggle.attributes['aria-pressed'],'true');
  const writes=buy.writes+toggle.writes;for(let i=0;i<100;i++)renderHomeAutoTap(s,root);
  assert.equal(buy.writes+toggle.writes,writes);
  toggleHomeAutoTap(s);renderHomeAutoTap(s,root);assert.equal(toggle.attributes['aria-pressed'],'false');
  renderHomeAutoTap(s,root,{active:false});assert.equal(toggle.disabled,true);
});

test('quiet feedback reuses one node and animation, never focuses, measures, clicks or creates elements',()=>{
  let cancelled=0,animations=0;const node={textContent:'',animate(frames,options){animations++;assert.equal(options.duration,420);
    assert.ok(frames.every(frame=>Object.keys(frame).every(key=>['opacity','offset'].includes(key))));
    return {cancel(){cancelled++;}};}};
  const f=createHomeAutoTapFeedback(node);for(let i=0;i<100;i++)f.show(10);
  assert.equal(node.textContent,'자동 +10 G');assert.equal(animations,100);assert.equal(cancelled,99);
  f.clear();assert.equal(cancelled,100);
});

test('every recruit gets its own existing insignia; enlisted specialists map to the four soldier ranks',()=>{
  for(const [id,name] of Object.entries({soldier:'이등병',administrator:'일병',driver:'상병',medic:'병장'})){
    assert.equal(recruitRank(UNITS[id]).name,name);assert.match(recruitRankMarkup(UNITS[id],insignia),new RegExp(`${name} 계급장`));
  }
  for(const unit of Object.values(UNITS)){
    const rank=recruitRank(unit);assert.ok(rank.index>=0,unit.id);
    assert.ok(recruitRankMarkup(unit,insignia).includes(insignia(rank.index)),unit.id);
  }
});

test('renamed cyber knowledge room retains the stable pcRoom save/catalog identity',()=>{
  const f=FACILITIES.find(f=>f.id==='pcRoom');assert.equal(f.name,'사지방');assert.match(f.purpose,/사이버지식정보방/);
});
