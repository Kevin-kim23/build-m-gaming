import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,SAVE_KEY,SAVE_VERSION} from '../src/state.js';
import {createHomeAutoTapRuntime,awardHomeAutoTaps,grantTestHomeAutoTap,toggleHomeAutoTap,emptyHomeAutoTap,homeAutoTapHomeVisible} from '../src/home-auto-tap.js';
import {createHomeAutoTapPurchase} from '../src/home-auto-tap-ui.js';
import {createGameSession} from '../src/session.js';
import {createFieldNavigation} from '../src/field-navigation.js';
import {activateSword,activateAutoTouch,usePotion,baseTapIncome,basePassiveIncome,accrue} from '../src/game.js';
import {grantPotion} from '../src/potions.js';
import {MAX_GOLD,serializeSave,exact} from '../src/money.js';
import {parseSave,inspectSave} from '../src/save.js';
import {RANKS,RANK_REQUIREMENTS} from '../src/ranks.js';
const T=1800000000000;
function fixture(initial=freshState(T)){
  const values=new Map([[SAVE_KEY,serializeSave(initial)]]),timers=new Map(),effects=[];
  let time=T,mono=0,visible=true,writes=0,reads=0,id=0;
  const session=createGameSession({storage:{getItem(k){reads++;return values.get(k)??null;},setItem(k,v){writes++;values.set(k,v);}},
    now:()=>time,setTimer:(fn,delay)=>{timers.set(++id,{fn,at:time+delay});return id;},clearTimer:key=>timers.delete(key)});
  session.start();
  const runtime=createHomeAutoTapRuntime(session,{canRun:()=>visible,clock:()=>mono,now:()=>time,onIncome:a=>effects.push(a)});
  return {session,runtime,values,effects,get writes(){return writes;},get reads(){return reads;},
    setVisible:v=>{visible=v;},
    step(ms){mono+=ms;time+=ms;return runtime.tick();},
    flushDue(){for(const [key,timer] of [...timers])if(timer.at<=time){timers.delete(key);timer.fn();}},
  };
}
function owned(){const s=freshState(T);grantTestHomeAutoTap(s);return s;}

test('permanent auto taps pay exactly twice a second, batching storage and never increasing manual statistics',()=>{
  const f=fixture(owned()),initialReads=f.reads;
  f.runtime.tick();for(let i=0;i<100;i++){f.step(100);f.flushDue();}
  assert.equal(f.session.state.gold,20);assert.equal(f.session.state.taps,0);assert.equal(f.effects.length,20);
  assert.equal(f.writes,4);assert.equal(f.reads,initialReads);
  f.session.pause();assert.equal(parseSave(f.values.get(SAVE_KEY),T).gold,20);
});

test('jitter preserves half-second remainder; long suspension and clock rollback never become a payout burst',()=>{
  const f=fixture(owned());f.runtime.tick();
  for(const ms of [113,186,203,107,391])f.step(ms);
  assert.equal(f.session.state.gold,2);
  f.step(100000);assert.equal(f.session.state.gold,2);
  f.step(499);assert.equal(f.session.state.gold,2);f.step(1);assert.equal(f.session.state.gold,3);
  f.step(-100);assert.equal(f.session.state.gold,3);f.step(500);assert.equal(f.session.state.gold,4);
  f.session.pause();
});

test('home visibility, ownership, switch and session pause all stop automatic income; resume starts a fresh interval',()=>{
  const f=fixture();f.runtime.tick();f.step(500);assert.equal(f.session.state.gold,0);
  f.session.change(grantTestHomeAutoTap);f.step(100);f.step(500);assert.equal(f.session.state.gold,1);
  f.setVisible(false);f.step(100);f.step(5000);assert.equal(f.session.state.gold,1);
  f.setVisible(true);f.step(100);f.step(499);assert.equal(f.session.state.gold,1);f.step(1);assert.equal(f.session.state.gold,2);
  f.session.change(toggleHomeAutoTap);f.step(100);f.step(1000);assert.equal(f.session.state.gold,2);
  f.session.change(toggleHomeAutoTap);f.step(100);f.step(500);assert.equal(f.session.state.gold,3);
  f.session.pause();f.runtime.reset();f.step(8*3600000);f.session.start();f.runtime.tick();
  assert.equal(f.session.state.gold,3);f.step(500);assert.equal(f.session.state.gold,4);f.session.pause();
});

test('all modal types and the guide block the home-only runner; unsupported popovers do not throw',()=>{
  for(const kind of ['shop','battle','purchase','equipment','settings','offline','promotion'])
    assert.equal(homeAutoTapHomeVisible({querySelector:s=>s==='dialog[open]'?{kind}:null}),false);
  const root=guide=>({querySelector:s=>s==='#guide-spotlight'?guide:null});
  assert.equal(homeAutoTapHomeVisible(root({showPopover(){},matches:()=>true})),false);
  assert.equal(homeAutoTapHomeVisible(root({showPopover(){},matches:()=>false})),true);
  assert.equal(homeAutoTapHomeVisible(root({})),true);assert.equal(homeAutoTapHomeVisible(root(null)),true);
});

test('ten held fingers can all release while automatic taps run; drags do not pay or block later touches',()=>{
  const f=fixture(owned()),element=()=>({events:{},addEventListener(t,fn){this.events[t]=fn;},setPointerCapture(){}});
  const zone=element(),viewport=element();
  createFieldNavigation({zone,viewport,hint:{},earnTap:()=>f.session.tap()});
  const pointer=id=>({pointerId:id,clientX:40+id*10,clientY:60,pointerType:'touch',isPrimary:id===1,timeStamp:1});
  f.runtime.tick();for(let id=1;id<=10;id++)zone.events.pointerdown(pointer(id));
  f.step(500);f.step(500);
  for(let id=1;id<=10;id++)zone.events.pointerup(pointer(id));
  assert.equal(f.session.state.gold,12);assert.equal(f.session.state.taps,10);
  zone.events.pointerdown(pointer(1));zone.events.pointermove({...pointer(1),clientX:150});zone.events.pointerup(pointer(1));
  f.step(500);assert.equal(f.session.state.gold,13);
  zone.events.pointerdown(pointer(2));zone.events.pointerup(pointer(2));assert.equal(f.session.state.gold,14);
  f.session.pause();
});

test('auto taps share red/sword multipliers, stay independent of blue passive and additive to the revolver skill',()=>{
  const a={...owned(),soldiers:RANK_REQUIREMENTS[RANKS.indexOf('중장')]-3000,sergeants:300};
  activateSword(a,T);activateAutoTouch(a,T);
  for(const id of ['red','blue']){grantPotion(a,id);usePotion(a,T,id);}
  const b=parseSave(serializeSave(a),T),base=exact(baseTapIncome(a));
  const p=basePassiveIncome(a);assert.ok(p>0);
  awardHomeAutoTaps(a,T+500,1);awardHomeAutoTaps(a,T+1000,1);accrue(b,T+1000);
  assert.equal(exact(a.gold)-exact(b.gold),base*8n);
  assert.equal(a.autoTouchTicks,b.autoTouchTicks);assert.equal(a.taps,0);
  const before=exact(a.gold);toggleHomeAutoTap(a);assert.equal(awardHomeAutoTaps(a,T+1500,1),0);assert.equal(exact(a.gold),before);
});

test('auto rewards cross safe integers, cap at one gold remaining, round-trip exactly, reject invalid pulse counts',()=>{
  for(const gold of [Number.MAX_SAFE_INTEGER,MAX_GOLD-1n,MAX_GOLD]){
    const s={...owned(),gold};const amount=awardHomeAutoTaps(s,T,2);
    const expected=exact(gold)+2n>MAX_GOLD?MAX_GOLD:exact(gold)+2n;
    assert.equal(exact(s.gold),expected);assert.equal(exact(amount),expected-exact(gold));
    assert.equal(exact(parseSave(serializeSave(s),T).gold),expected);
  }
  const s=owned();for(const count of [-1,0,1.5,3,Infinity])assert.equal(awardHomeAutoTaps(s,T,count),0);
  assert.equal(awardHomeAutoTaps(s,NaN,1),0);assert.equal(s.gold,0);
});

test('v32 migration preserves progress without granting entitlement; v33 validates test source and enabled state',()=>{
  const legacy={...owned(),version:32,gold:MAX_GOLD-1n,facilities:['pcRoom'],facilityLevels:{pcRoom:20}};
  legacy.potions.red.count=4;legacy.equipment.artillery={level:30,deployed:true,count:1};
  const migrated=parseSave(serializeSave(legacy),T);
  assert.equal(migrated.version,SAVE_VERSION);assert.deepEqual(migrated.homeAutoTap,emptyHomeAutoTap());
  assert.equal(migrated.gold,legacy.gold);assert.deepEqual(migrated.facilityLevels,legacy.facilityLevels);
  assert.deepEqual(migrated.potions,legacy.potions);assert.deepEqual(migrated.equipment,legacy.equipment);
  for(const bad of [null,[],{owned:false,enabled:true,source:null},{owned:true,enabled:true,source:'play'},
    {owned:1,enabled:true,source:'test'},{owned:true,enabled:false,source:null}]){
    assert.equal(inspectSave(serializeSave({...migrated,homeAutoTap:bad}),T).issue.field,'homeAutoTap');
  }
});

test('test purchase grants only once, retains gold, persists ownership/off switch and cannot double-confirm',async()=>{
  const f=fixture();let finish;
  const c=createHomeAutoTapPurchase(f.session,{allowTestGrant:true,showPurchase:()=>new Promise(r=>{finish=r;})});
  const pending=c.buy();assert.equal(c.busy,true);assert.equal((await c.buy()).ok,false);assert.equal(c.toggle().ok,false);
  finish({status:'granted',source:'test'});finish({status:'granted',source:'test'});
  assert.equal((await pending).ok,true);assert.equal(f.session.state.gold,0);assert.equal((await c.buy()).ok,false);
  assert.equal(c.toggle().enabled,false);f.session.pause();f.session.start();
  assert.deepEqual(f.session.state.homeAutoTap,{owned:true,enabled:false,source:'test'});
  assert.equal(c.toggle().enabled,true);f.session.pause();
});

test('cancelled, unknown, failed and inactive test purchases cannot grant ownership',async()=>{
  for(const result of [{status:'cancelled'},{status:'granted',source:'play'},undefined]){
    const f=fixture(),c=createHomeAutoTapPurchase(f.session,{allowTestGrant:true,showPurchase:async()=>result});
    assert.equal((await c.buy()).ok,false);assert.equal(f.session.state.homeAutoTap.owned,false);f.session.pause();
  }
  const f=fixture(),errors=[];
  const c=createHomeAutoTapPurchase(f.session,{allowTestGrant:true,showPurchase:async()=>{throw Error('test failure');},onError:(...e)=>errors.push(e)});
  assert.equal((await c.buy()).reason,'error');assert.equal(errors[0][0],'homeAutoTap.purchase');assert.equal(c.busy,false);
  let finish;const paused=createHomeAutoTapPurchase(f.session,{allowTestGrant:true,showPurchase:()=>new Promise(r=>{finish=r;})});
  const pending=paused.buy();f.session.pause();finish({status:'granted',source:'test'});
  assert.equal((await pending).reason,'inactive');assert.equal(f.session.state.homeAutoTap.owned,false);
});

test('release blocks new free grants while grandfathered ownership survives save and toggle',async()=>{
 const f=fixture();let calls=0;const c=createHomeAutoTapPurchase(f.session,{showPurchase:async()=>{calls++;return {status:'granted',source:'test'};}});
 assert.equal((await c.buy()).ok,false);assert.equal(calls,0);assert.equal(f.session.state.homeAutoTap.owned,false);
 grantTestHomeAutoTap(f.session.state);const restored=parseSave(serializeSave(f.session.state),T);
 assert.equal(restored.homeAutoTap.owned,true);assert.equal(restored.homeAutoTap.source,'test');
 assert.equal(toggleHomeAutoTap(restored).ok,true);assert.equal(restored.homeAutoTap.owned,true);f.session.pause();
});
