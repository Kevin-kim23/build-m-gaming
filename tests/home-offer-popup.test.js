import test from 'node:test';
import assert from 'node:assert/strict';
import {createHomeOfferPopup} from '../src/home-offer-popup.js';
function setup(watch){
  let handler,calls=0,shown;
  const button={disabled:false,textContent:''},message={textContent:''};
  const card={dataset:{homeOffer:'red'},isConnected:true,querySelector:q=>q==='[data-detail-action]'?button:message};
  const dialog={querySelector:()=>card};
  const ui=createHomeOfferPopup({watch,buy:()=>{throw Error('not a purchase');},register:fn=>handler=fn,show:content=>shown=content,onSuccess:()=>calls++});
  return {ui,card,button,message,run:()=>handler('home-offer-claim',{item:'red'},dialog),calls:()=>calls,shown:()=>shown};
}
test('independent ad popup debounces repeated clicks and grants through the existing controller once',async()=>{
  let resolve,watches=0;const fixture=setup(()=>{watches++;return new Promise(r=>resolve=r);});
  fixture.ui.open('red');assert.equal(fixture.shown().title,'빨간물약');assert.equal(watches,0);
  const pending=fixture.run();await fixture.run();assert.equal(watches,1);assert.equal(fixture.button.disabled,true);
  resolve({ok:true});await pending;assert.equal(fixture.calls(),1);assert.equal(fixture.button.textContent,'획득 완료');
  await fixture.run();assert.equal(watches,1);
});
test('ad cancellation permits retry and a closed popup never rewrites a different dialog',async()=>{
  const cancelled=setup(async()=>({ok:false,reason:'cancelled'}));await cancelled.run();
  assert.equal(cancelled.calls(),0);assert.equal(cancelled.button.disabled,false);assert.match(cancelled.message.textContent,/지급되지/);
  let resolve;const closed=setup(()=>new Promise(r=>resolve=r));const pending=closed.run();closed.card.isConnected=false;
  resolve({ok:true});await pending;assert.equal(closed.calls(),1);assert.notEqual(closed.button.textContent,'획득 완료');
});
