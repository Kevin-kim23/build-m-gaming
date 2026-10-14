import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,SAVE_KEY} from '../src/state.js';
import {createGameSession} from '../src/session.js';
import {createStorePurchase} from '../src/store-purchase.js';
import {createStoreTestPurchase} from '../src/test-purchase.js';
import {renderStore,storeMarkup} from '../src/store-panels.js';
import {POTION_COUNT_LIMIT} from '../src/potions.js';
import {serializeSave} from '../src/money.js';

function fixture(){
  const data=new Map([[SAVE_KEY,serializeSave(freshState(1000))]]);
  const session=createGameSession({storage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},now:()=>1000,setTimer:()=>1,clearTimer:()=>{}});
  session.start();return session;
}
const granted={status:'granted',source:'test'};
test('both product entry points share one lock; package is atomic, persists and excludes auto-tap',async()=>{
  const session=fixture();let finish,calls=0;
  const c=createStorePurchase(session,{allowTestGrant:true,showPurchase:id=>{calls++;assert.equal(id,'starter');return new Promise(r=>{finish=r;});}});
  const pending=c.buy('starter');
  assert.equal((await c.buy('starter')).ok,false);assert.equal((await c.buy('auto')).ok,false);assert.equal(c.toggle().reason,'busy');assert.equal(calls,1);
  finish(granted);finish(granted);assert.equal((await pending).ok,true);
  assert.equal(session.state.potions.red.count,30);assert.equal(session.state.potions.blue.count,30);assert.equal(session.state.homeAutoTap.owned,false);
  session.pause();session.start();assert.equal(session.state.starterPack.claimed,true);assert.equal((await c.buy('starter')).ok,false);session.pause();
});
test('release, cancellation, foreign callbacks and inactive sessions never grant package',async()=>{
  const session=fixture();let calls=0;
  const release=createStorePurchase(session,{showPurchase:async()=>{calls++;return granted;}});
  for(const id of ['starter','auto','invalid'])assert.equal((await release.buy(id)).ok,false);
  assert.equal(calls,0);
  for(const result of [undefined,{status:'cancelled'},{status:'granted',source:'play'}]){
    const c=createStorePurchase(session,{allowTestGrant:true,showPurchase:async()=>result});
    assert.equal((await c.buy('starter')).ok,false);assert.equal(session.state.starterPack.claimed,false);assert.equal(c.busy,false);
  }
  let finish;const paused=createStorePurchase(session,{allowTestGrant:true,showPurchase:()=>new Promise(r=>{finish=r;})});
  const pending=paused.buy('starter');session.pause();finish(granted);assert.equal((await pending).reason,'inactive');assert.equal(session.state.potions.red.count,0);
});
test('purchase error is recorded and allows retry; auto ownership remains independent',async()=>{
  const session=fixture(),errors=[];let fail=true;
  const c=createStorePurchase(session,{allowTestGrant:true,showPurchase:async()=>{if(fail)throw Error('synthetic');return granted;},onError:(...a)=>errors.push(a)});
  assert.equal((await c.buy('starter')).reason,'error');assert.equal(errors[0][0],'store.purchase');assert.equal(c.busy,false);
  fail=false;assert.equal((await c.buy('auto')).ok,true);c.toggle();
  assert.equal((await c.buy('starter')).ok,true);assert.equal(session.state.homeAutoTap.enabled,false);session.pause();
});
function fakeNode(){
  const listeners={},nodes=new Map();let text='',writes=0;
  return {listeners,set textContent(v){text=v;writes++;},get textContent(){return text;},get writes(){return writes;},
    addEventListener:(t,fn)=>{listeners[t]=fn;},setAttribute(){},querySelector(s){if(!nodes.has(s))nodes.set(s,fakeNode());return nodes.get(s);}};
}
test('one shared dialog shows exact product contents, clears acknowledgement and cancels without a grant',async()=>{
  const dialog={...fakeNode(),open:false,showModal(){this.open=true;},close(){this.open=false;this.listeners.close();}};
  let creates=0;const show=createStoreTestPurchase({createElement(){creates++;return dialog;},body:{append(){}}});
  const pack=show('starter');assert.match(dialog.innerHTML,/터치 부스터 30개 \+ 초당 부스터 30개/);assert.match(dialog.innerHTML,/5,900원/);assert.match(dialog.innerHTML,/자동터치는 포함되지/);
  assert.equal((await show('auto')).status,'unavailable');
  dialog.querySelector('[data-test-purchase-ack]').checked=true;dialog.querySelector('[data-test-purchase-confirm]').listeners.click();assert.deepEqual(await pack,granted);
  const auto=show('auto');assert.match(dialog.innerHTML,/자동터치 무료 테스트/);assert.match(dialog.innerHTML,/4,900원/);assert.doesNotMatch(dialog.innerHTML,/터치 부스터 30개/);
  assert.equal(dialog.querySelector('[data-test-purchase-ack]').checked,false);dialog.querySelector('[data-test-purchase-cancel]').listeners.click();assert.equal((await auto).status,'cancelled');assert.equal(creates,1);
});
test('store renderer locks release, claimed and full inventories, with no unchanged text rewrites',()=>{
  const s=freshState(1000),root=fakeNode(),card=root.querySelector('[data-starter-pack]'),button=card.querySelector('[data-buy-starter]'),status=card.querySelector('[data-starter-status]');
  assert.match(storeMarkup(),/실제 결제는 아직 연결되지/);assert.doesNotMatch(storeMarkup(),/할인|마감|한정 수량|남은 시간/);
  assert.ok(storeMarkup().indexOf('data-starter-pack')<storeMarkup().indexOf('data-home-auto-tap'),'starter pack is the first product');
  renderStore(s,root);assert.equal(button.disabled,true);assert.equal(button.textContent,'구매 준비 중');
  renderStore(s,root,{allowTestGrant:true});assert.equal(button.disabled,false);
  const writes=button.writes+status.writes;for(let i=0;i<60;i++)renderStore(s,root,{allowTestGrant:true});assert.equal(button.writes+status.writes,writes);
  renderStore(s,root,{allowTestGrant:true,busy:true});assert.equal(button.disabled,true);
  s.potions.blue.count=POTION_COUNT_LIMIT-29;renderStore(s,root,{allowTestGrant:true});assert.equal(button.disabled,true);
  s.potions.blue.count=0;s.starterPack={claimed:true,source:'test'};renderStore(s,root,{allowTestGrant:true});assert.equal(button.disabled,true);assert.equal(button.textContent,'수령 완료');
});
