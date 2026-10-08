import test from 'node:test';
import assert from 'node:assert/strict';
import {createFieldGesture} from '../src/field-gesture.js';
import {createFieldNavigation} from '../src/field-navigation.js';
import {createGameSession} from '../src/session.js';
import {freshState,SAVE_KEY} from '../src/state.js';
import {MAX_GOLD,serializeSave,exact} from '../src/money.js';
import {parseSave} from '../src/save.js';
const T=1800000000000;
function element(){return {events:{},addEventListener(type,fn){this.events[type]=fn;},setPointerCapture(){}};}

test('ten real navigation pointer releases each earn exactly once, with no per-second cap or per-tap storage',()=>{
  const values=new Map();let writes=0;
  const session=createGameSession({storage:{getItem:k=>values.get(k)??null,setItem(k,v){writes++;values.set(k,v);}},now:()=>T,setTimer:()=>1,clearTimer(){}});
  session.start();writes=0;
  const zone=element(),viewport=element();
  const nav=createFieldNavigation({zone,viewport,hint:{},earnTap:()=>session.tap()});
  const pointer=id=>({pointerId:id,clientX:40+id*10,clientY:60,pointerType:'touch',isPrimary:id===1,timeStamp:1});
  for(let batch=0;batch<3;batch++){
    for(let id=1;id<=11;id++)zone.events.pointerdown(pointer(id));
    zone.events.pointerdown(pointer(1)); // Duplicate down must not duplicate payment.
    for(let id=11;id>=1;id--){zone.events.pointerup(pointer(id));zone.events.lostpointercapture(pointer(id));}
    zone.events.click({detail:1}); // Browser's synthesized click must not pay again.
  }
  assert.equal(session.state.gold,30);assert.equal(session.state.taps,30);assert.equal(writes,0);
  zone.events.pointerdown(pointer(1));zone.events.pointercancel(pointer(1));zone.events.pointerup(pointer(1));
  zone.events.pointerdown(pointer(2));nav.clear();zone.events.pointerup(pointer(2));
  assert.equal(session.state.gold,30);
  session.pause();assert.equal(parseSave(values.get(SAVE_KEY),T).gold,30);
});

test('ten taps crossing safe-number and wallet boundaries remain exact after save and reload',()=>{
  for(const start of [Number.MAX_SAFE_INTEGER-5,MAX_GOLD-5n]){
    const s={...freshState(T),gold:start},values=new Map([[SAVE_KEY,serializeSave(s)]]);
    const session=createGameSession({storage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},now:()=>T,setTimer:()=>1,clearTimer(){}});
    session.start();for(let i=0;i<10;i++)session.tap();
    const expected=exact(start)+10n>MAX_GOLD?MAX_GOLD:exact(start)+10n;
    assert.equal(exact(session.state.gold),expected);
    session.pause();session.start();assert.equal(exact(session.state.gold),expected);session.pause();
  }
});

test('rejected release cannot free an accepted slot; fresh taps after releases are accepted immediately',()=>{
  const g=createFieldGesture();for(let i=0;i<10;i++)g.down(i,0,0,0);
  assert.equal(g.down(10,0,0,0),false);assert.equal(g.up(10,0,0),false);
  assert.equal(g.down(11,0,0,0),false);
  assert.equal(g.up(3,0,0),true);assert.equal(g.down(12,0,0,0),true);
  assert.equal(g.down(12,0,0,0),false);assert.equal(g.up(12,0,0),true);assert.equal(g.up(12,0,0),false);
});

test('scroll and swipe cancel all ten fingers, stale slots and lifecycle clear never block later taps',()=>{
  const g=createFieldGesture();
  for(const action of [()=>g.scroll(),()=>g.move(0,15,0),()=>g.clear()]){
    for(let i=0;i<10;i++)g.down(i,0,0,0);action();
    for(let i=0;i<10;i++)assert.equal(g.up(i,0,0),false);
  }
  for(let i=0;i<10;i++)g.down(i,0,0,0);
  assert.equal(g.down(20,0,0,4999),false);assert.equal(g.down(20,0,0,5001),true);
  for(let i=0;i<10;i++)assert.equal(g.up(i,0,0),false);
  assert.equal(g.up(20,0,0),true);
});
