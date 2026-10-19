import {renderStore,storeMarkup} from '../src/store-panels.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/state.js';
import {createAutoTapTestPurchase} from '../src/test-purchase.js';
import {createHomeAutoTapFeedback,homeAutoTapMarkup,homeAutoTapPitch,renderHomeAutoTap} from '../src/home-auto-tap-ui.js';
import {homeOfferMarkup} from '../src/home-offer-popup.js';
import {HOME_AUTO_TAP} from '../src/home-auto-tap-rules.js';
import {createBackHandler} from '../src/back-button.js';
import {grantTestHomeAutoTap,toggleHomeAutoTap} from '../src/home-auto-tap-rules.js';
import {recruitRank,recruitRankMarkup} from '../src/recruit-rank.js';
import {UNITS} from '../src/units.js';
import {insignia} from '../src/home-view.js';
import {FACILITIES} from '../src/facility-catalog.js';
import {STARTER_PACK} from '../src/starter-pack.js';
import {POTIONS} from '../src/potions.js';
function fakeNode(){
  const listeners={},children=new Map(),attributes={};let content='',writes=0;
  return {listeners,attributes,disabled:false,
    set textContent(v){content=v;writes++;},get textContent(){return content;},get writes(){return writes;},
    setAttribute(k,v){attributes[k]=v;},addEventListener:(t,fn)=>{listeners[t]=fn;},
    querySelector(s){if(!children.has(s))children.set(s,fakeNode());return children.get(s);},click(){return listeners.click?.();}};
}

test('store keeps purchase controls and limits while the home offer retains its separate preview',()=>{
  const pitch=homeAutoTapPitch(),store=homeAutoTapMarkup(),offer=homeOfferMarkup('auto',{allowTestGrant:false}).body;
  assert.ok(!store.includes(pitch));assert.ok(offer.includes(pitch));assert.match(store,/초당 10회 · 영구 해금/);assert.match(store,/<details class="store-purchase-help">/);
  assert.match(pitch,new RegExp(`${HOME_AUTO_TAP.tapsPerSecond}회/초`));
  assert.match(pitch,/상점·전투·팝업·앱 종료 중에는 멈춥니다/);
  assert.match(pitch,/작동 예시/);assert.doesNotMatch(pitch,/<button|<input|onclick|data-buy|data-detail-action/);
  assert.equal((store.match(/data-buy-home-auto/g)||[]).length,1);
  assert.equal((offer.match(/data-detail-action=/g)||[]).length,1);
  assert.match(offer,/disabled>구매 준비 중/);assert.match(store,/구매 복원은 준비 중/);
});
test('test purchase dialog confirms explicitly, cancels via Android back, and safely reopens',async()=>{
  const dialog={...fakeNode(),open:false,showModal(){this.open=true;},close(){this.open=false;}};
  const root={createElement:()=>dialog,body:{append(){}},querySelector:s=>s==='#test-purchase-modal'?dialog:null};
  const show=createAutoTapTestPurchase(root),first=show();
  assert.match(dialog.innerHTML,/자동터치 무료 테스트/);assert.match(dialog.innerHTML,/법정대리인/);
  assert.match(dialog.innerHTML,/실제 요금은 청구되지 않아요/);
  assert.equal((await show()).status,'unavailable');
  dialog.querySelector('[data-test-purchase-confirm]').click();assert.equal(dialog.open,true);
  dialog.querySelector('[data-test-purchase-ack]').checked=true;
  dialog.querySelector('[data-test-purchase-confirm]').click();assert.deepEqual(await first,{status:'granted',source:'test'});
  const second=show();dialog.listeners.close();assert.equal(dialog.open,true);
  const back=createBackHandler({root,hint:()=>assert.fail(),exit:()=>assert.fail()});
  assert.equal(back(),'closed');dialog.listeners.close();assert.equal((await second).status,'cancelled');
  const third=show();assert.equal(dialog.querySelector('[data-test-purchase-ack]').checked,false);dialog.querySelector('[data-test-purchase-ack]').checked=true;dialog.querySelector('[data-test-purchase-confirm]').click();assert.equal((await third).status,'granted');
});

test('item UI clearly shows free test, locks repurchase, toggles accessibly and avoids unchanged text writes',()=>{
  assert.doesNotMatch(homeAutoTapMarkup(),/예정 가격/);assert.match(homeAutoTapMarkup(),/구매 준비 중/);assert.match(homeAutoTapMarkup(),/초당 10회/);
  const s=freshState(1),root=fakeNode(),card=root.querySelector('[data-home-auto-tap]');
  renderHomeAutoTap(s,root);assert.equal(card.querySelector('[data-toggle-home-auto]').disabled,true);assert.equal(card.querySelector('[data-buy-home-auto]').disabled,true);
  assert.equal(card.querySelector('[data-toggle-home-auto]').hidden,true);
  grantTestHomeAutoTap(s);renderHomeAutoTap(s,root);
  const buy=card.querySelector('[data-buy-home-auto]'),toggle=card.querySelector('[data-toggle-home-auto]');
  assert.equal(buy.disabled,true);assert.equal(buy.textContent,'보유 중');assert.equal(buy.hidden,true);
  assert.equal(toggle.disabled,false);assert.equal(toggle.attributes['aria-pressed'],'true');
  assert.equal(toggle.hidden,false);assert.equal(card.querySelector('[data-home-auto-status]').hidden,false);
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
    let rendered;
    const html=recruitRankMarkup(unit,index=>{
      assert.equal(index,rank.index,unit.id);
      return rendered=insignia(index);
    });
    assert.ok(html.includes(rendered),unit.id);
  }
});

test('renamed cyber knowledge room retains the stable pcRoom save/catalog identity',()=>{
  const f=FACILITIES.find(f=>f.id==='pcRoom');assert.equal(f.name,'사지방');assert.match(f.purpose,/사이버지식정보방/);
});

test('configured Play products show real supplied prices and purchase actions instead of free-test labels',()=>{
 const root=fakeNode(),state=freshState(1);
 renderStore(state,root,{allowTestGrant:false,billing:{configured:true,price:'4,900원'},starterBilling:{configured:true,price:'5,900원'}});
 for(const [cardSelector,buttonSelector,expected] of [['[data-home-auto-tap]','[data-buy-home-auto]','4,900₩'],['[data-starter-pack]','[data-buy-starter]','5,900₩']]){
  const card=root.querySelector(cardSelector),button=card.querySelector(buttonSelector);
  assert.equal(button.textContent,expected);assert.equal(button.disabled,false);
  assert.ok(button.attributes['aria-label'].includes(expected));assert.match(button.attributes['aria-label'],/구매/);
 }
 assert.match(storeMarkup(),/특별혜택!/);assert.match(storeMarkup(),/1회 한정!/);assert.doesNotMatch(storeMarkup(),/계정당/);
 assert.doesNotMatch(storeMarkup(),/data-starter-price|data-play-price/);
 const header=homeAutoTapMarkup().match(/<header[^>]*>([\s\S]*?)<\/header>/)[1];
 assert.doesNotMatch(header,/<p|<small/);assert.match(header,/<h3>자동터치<\/h3><span class="auto-rate-label">10회\/초<\/span>/);assert.match(header,/홈 전용 · 영구/);assert.match(homeAutoTapMarkup(),/홈에서만 작동/);
});

test('shop prices preserve foreign currencies and lock purchases when Play has no usable price',()=>{
 const root=fakeNode(),state=freshState(1);
 const auto=root.querySelector('[data-home-auto-tap]').querySelector('[data-buy-home-auto]');
 const starter=root.querySelector('[data-starter-pack]').querySelector('[data-buy-starter]');
 for(const price of ['',null,'   ']){
  renderStore(state,root,{allowTestGrant:true,billing:{configured:true,price},starterBilling:{configured:true,price}});
  assert.equal(auto.disabled,true);assert.equal(starter.disabled,true);
  assert.equal(auto.textContent,'상품 확인 필요');assert.equal(starter.textContent,'상품 확인 필요');
 }
 renderStore(state,root,{billing:{configured:true,price:'US$4.99'},starterBilling:{configured:true,price:'€5.99'}});
 assert.equal(auto.textContent,'US$4.99');assert.equal(starter.textContent,'€5.99');
 assert.equal(auto.disabled,false);assert.equal(starter.disabled,false);
 renderStore(state,root,{busy:true,billing:{configured:true,price:'₩4,900'},starterBilling:{configured:true,price:'₩5,900'}});
 assert.equal(auto.disabled,true);assert.equal(starter.disabled,true);
});

test('purchase rows expose the automatic-tap scope and starter quantities without opening help',()=>{
 const auto=homeAutoTapMarkup().split('<details')[0];
 assert.match(auto,new RegExp(`${HOME_AUTO_TAP.tapsPerSecond}회/초`));
 assert.match(auto,/홈 전용 · 영구/);
 assert.doesNotMatch(auto,/초당 ×/);
 const starter=storeMarkup().split('<details')[0];
 for(const potion of Object.values(POTIONS)){
  assert.ok(starter.includes(`<strong>${potion.shortName}<span>${STARTER_PACK[potion.id]}개</span></strong>`));
 }
 assert.match(starter,/아이템에서 사용/);
 assert.match(starter,/data-buy-starter/);
 assert.doesNotMatch(starter,/계정당|자동터치 포함/);
});

test('compact store retains the local one-time limit and clear max duration/multipliers from the real catalog',()=>{
 const markup=storeMarkup(),starter=markup.split('<details')[0],auto=homeAutoTapMarkup().split('<details')[0];
 assert.ok(markup.indexOf('data-starter-pack')<markup.indexOf('data-home-auto-tap'));
 assert.match(starter,/<span class="starter-limit-badge">1회 한정!<\/span>/);
 assert.match(starter,/현재 기기 기록에서 1회 · 자동터치 미포함/);
 assert.ok(starter.includes(`<strong>${POTIONS.max.durationLabel} 동안</strong>`));
 assert.ok(starter.includes(`터치 골드 <b>${POTIONS.max.tapMultiplier}X</b>`));
 assert.ok(starter.includes(`초당 골드 <b>${POTIONS.max.passiveMultiplier}X</b>`));
 assert.doesNotMatch(starter,/starter-lead|starter-vial-effect/);
 assert.doesNotMatch(auto,/auto-store-tag|auto-store-benefits|auto-store-lead/);
 assert.match(auto,/홈 전용 · 영구/);
 assert.doesNotMatch(markup,/기간 한정|오늘만|마감|남은 수량|판매 1위|할인|정가/);
 assert.equal((markup.match(/data-buy-starter/g)||[]).length,1);
 assert.equal((markup.match(/data-buy-home-auto/g)||[]).length,1);
});

test('store still protects inactive, busy, claimed and full-inventory states without changing savings',()=>{
 const root=fakeNode(),state=freshState(1);
 const auto=root.querySelector('[data-home-auto-tap]').querySelector('[data-buy-home-auto]');
 const starterCard=root.querySelector('[data-starter-pack]'),starter=starterCard.querySelector('[data-buy-starter]');
 for(const options of [{active:false,allowTestGrant:true},{busy:true,allowTestGrant:true},{allowTestGrant:false}]){
  renderStore(state,root,options);assert.equal(auto.disabled,true);assert.equal(starter.disabled,true);
 }
 renderStore(state,root,{allowTestGrant:true});
 assert.equal(auto.textContent,'무료 테스트');assert.equal(starter.textContent,'무료 테스트');
 assert.equal(auto.disabled,false);assert.equal(starter.disabled,false);
 state.potions.max.count=Number.MAX_SAFE_INTEGER;
 renderStore(state,root,{allowTestGrant:true});assert.equal(starter.disabled,true);
 assert.match(starterCard.querySelector('[data-starter-status]').textContent,/보관 한도/);
 state.starterPack={claimed:true,source:'test'};
 renderStore(state,root,{allowTestGrant:true});assert.equal(starter.disabled,true);assert.equal(starter.textContent,'수령 완료');
 const status=starterCard.querySelector('[data-starter-status]');
 const before=starter.writes+status.writes;
 for(let i=0;i<10;i++)renderStore(state,root,{allowTestGrant:true});
 assert.equal(starter.writes+status.writes,before);
});
