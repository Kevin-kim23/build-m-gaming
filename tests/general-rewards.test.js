import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, activateSword, activateAutoTouch, accrue, perTap, perSecond, parseSave, MAX_GOLD, buyAdditionalEquipment, enhanceEquipment, setEquipmentDeployed, SAVE_KEY } from '../src/game.js';
import { RANKS, RANK_REQUIREMENTS } from '../src/ranks.js';
import { divisionFlagStatus, generalRevolverStatus, generalSwordDuration, swordSkillStatus, autoTouchStatus } from '../src/personal-equipment.js';
import { additionalEquipmentCost, enhancementCost, enhancementOffer, equipmentLevelLimit, equipmentPurchaseOffer } from '../src/equipment.js';
import { createGameSession } from '../src/session.js';
import { equipmentPanelMarkup } from '../src/equipment-panels.js';
import { shopMarkup, SHOP_CATEGORIES } from '../src/shop.js';
import { personalIcon } from '../src/personal-art.js';
const T=1_800_000_000_000;
const army=(rank='중장')=>({...freshState(T),soldiers:RANK_REQUIREMENTS[RANKS.indexOf(rank)]-3000,sergeants:300,ncoSchoolLevel:5});

test('promotion rewards derive from actual ranks and sword duration increases by ten seconds',()=>{
  for(const [rank,duration,flag,revolver] of [['준장',30000,0,0],['소장',40000,1,0],['중장',50000,2,1],['대장',60000,2,1]]){
    const s=army(rank);assert.equal(generalSwordDuration(s),duration);
    assert.equal(divisionFlagStatus(s).level,flag);assert.equal(generalRevolverStatus(s).level,revolver);
    assert.equal(activateSword(s,T).ok,true);assert.equal(s.swordDurationMs,duration);
    assert.equal(swordSkillStatus(s,T+duration-1).active,true);assert.equal(swordSkillStatus(s,T+duration).active,false);
    assert.equal(activateSword(s,T+599999).reason,'cooldown');assert.equal(activateSword(s,T+600000).ok,true);
  }
});
test('a promotion does not extend or resurrect an already activated sword',()=>{
  const s=army('준장');activateSword(s,T);accrue(s,T+30001);s.soldiers=army('중장').soldiers;
  assert.equal(generalSwordDuration(s),50000);assert.equal(swordSkillStatus(s,T+30001).active,false);
  assert.equal(swordSkillStatus(parseSave(JSON.stringify(s)),T+30001).durationMs,30000);
});
test('auto touch starts after 300 ms, pays exactly 200 times and does not inflate manual taps',()=>{
  const s=army(),tap=perTap(s,T),passive=perSecond(s);assert.equal(activateAutoTouch(s,T).ok,true);
  for(const ms of [0,299,300,599,600,59999,60000,60001,70000]){
    accrue(s,T+ms);const pulses=Math.min(200,Math.floor(ms/300));
    assert.equal(s.autoTouchTicks,pulses);assert.equal(s.gold,Math.floor(passive*ms/1000)+pulses*tap);assert.equal(s.taps,0);
  }
  assert.equal(autoTouchStatus(s,T+70000).active,false);assert.equal(activateAutoTouch(s,T+1799999).reason,'cooldown');
  assert.equal(activateAutoTouch(s,T+1800000).ok,true);assert.equal(s.autoTouchTicks,0);
});
test('auto touch respects rank, bad clocks, wallet cap and rollback without replaying paid pulses',()=>{
  assert.equal(activateAutoTouch(army('소장'),T).reason,'locked');
  for(const now of [-1,NaN,Infinity,1.5,1e15])assert.equal(activateAutoTouch(army(),now).reason,'time');
  const s=army();activateAutoTouch(s,T);s.gold=MAX_GOLD;accrue(s,T+300);assert.equal(s.autoTouchTicks,1);
  s.gold=0;accrue(s,T+299);assert.equal(s.gold,0);accrue(s,T+300);assert.equal(s.gold,0);
  accrue(s,T+600);assert.equal(s.autoTouchTicks,2);assert.equal(s.gold,Math.floor(perSecond(s)*.3)+perTap(s,T));
});
test('sword overlap uses each pulse timestamp, including its exclusive expiry boundary',()=>{
  for(const offset of [0,100,300,30000,50000]){
    const s=army(),base=perTap(s,T),income=perSecond(s);activateAutoTouch(s,T);activateSword(s,T+offset);accrue(s,T+60000);
    // The activation transaction settles a pulse exactly at offset before enabling the boost.
    let boosted=0;for(let n=1;n<=200;n++)if(n*300>offset&&n*300<offset+50000)boosted++;
    assert.equal(s.gold,income*60+base*(200+boosted),`offset ${offset}`);
  }
});
test('auto touch settles old equipment income before storage, then uses new tap value',()=>{
  const s=army();s.equipment.tank={level:10,count:2,deployed:true};const oldTap=perTap(s,T),oldIncome=perSecond(s);
  activateAutoTouch(s,T);setEquipmentDeployed(s,false,T+600,'tank');
  assert.equal(s.gold,Math.floor(oldIncome*.6)+oldTap*2);const before=s.gold;
  accrue(s,T+1200);assert.equal(s.gold-before,Math.floor(perSecond(s)*.6)+perTap(s,T)*2);
});
test('coarse offline settlement equals fine ticks across boost expiry and survives reload',()=>{
  const a=army(),b=army();for(const s of [a,b]){activateAutoTouch(s,T);activateSword(s,T);}
  for(let ms=100;ms<=120000;ms+=100)accrue(a,T+ms);
  accrue(b,T+17300);const loaded=parseSave(JSON.stringify(b));accrue(loaded,T+120000);
  assert.equal(loaded.gold,a.gold);assert.equal(loaded.autoTouchTicks,200);
  const before=loaded.gold;accrue(loaded,T+120000);assert.equal(loaded.gold,before);
});
test('version 15 migration preserves assets and active 30 second sword, ignores injected new rewards',()=>{
  const s={...army('소장'),version:15,gold:123456,taps:789,campaignCleared:20,swordActivatedAt:T-10000};
  s.equipment.tank={level:10,count:3,deployed:true};delete s.equipment.transport;delete s.equipment.fighter;
  s.autoTouchActivatedAt=T-300;s.autoTouchTicks=1;s.swordDurationMs=60000;
  const next=parseSave(JSON.stringify(s));assert.equal(next.version,16);
  for(const key of ['gold','taps','soldiers','sergeants','campaignCleared','swordActivatedAt'])assert.equal(next[key],s[key]);
  assert.deepEqual(next.equipment.tank,s.equipment.tank);assert.equal(next.equipment.transport,null);assert.equal(next.equipment.fighter,null);
  assert.equal(next.autoTouchActivatedAt,null);assert.equal(next.autoTouchTicks,0);assert.equal(next.swordDurationMs,30000);
  assert.equal(divisionFlagStatus(next).level,1);assert.equal(swordSkillStatus(next,T).activeMs,20000);
});
test('version 16 rejects corrupt auto cursors, skill durations and incomplete aircraft slots',()=>{
  const s=army();activateAutoTouch(s,T);accrue(s,T+300);
  for(const patch of [{autoTouchTicks:-1},{autoTouchTicks:201},{autoTouchTicks:.5},{autoTouchTicks:'1'},
    {autoTouchActivatedAt:T+301},{autoTouchActivatedAt:null},{swordDurationMs:90000},{swordDurationMs:undefined}])
    assert.equal(parseSave(JSON.stringify({...s,...patch})),null);
  const missing=structuredClone(s);delete missing.equipment.fighter;assert.equal(parseSave(JSON.stringify(missing)),null);
});
test('division flag caps enhancement at ten or twenty; grouped copies pay per copy',()=>{
  const s=army('소장');s.gold=MAX_GOLD;s.equipment.tank={level:10,count:2,deployed:true};
  assert.equal(equipmentLevelLimit(s),10);assert.equal(enhanceEquipment(s,T,'tank').reason,'max');
  s.soldiers=army('중장').soldiers;assert.equal(equipmentLevelLimit(s),20);
  for(let n=10;n<20;n++){const before=s.gold;assert.equal(enhanceEquipment(s,T,'tank').ok,true);assert.equal(before-s.gold,2*enhancementCost(n,'tank'));}
  assert.equal(enhanceEquipment(s,T,'tank').reason,'max');assert.equal(parseSave(JSON.stringify(s)).equipment.tank.level,20);
});
test('copies at every level 10 to 20 cost the initial purchase plus all actual upgrade costs',()=>{
  for(let level=10;level<=20;level++){
    const s=army();s.gold=MAX_GOLD;s.equipment.fighter={level,count:2,deployed:false};
    const total=1500000000+Array.from({length:level},(_,n)=>enhancementCost(n,'fighter')).reduce((a,b)=>a+b,0);
    assert.equal(additionalEquipmentCost('fighter',level),total);const before=s.gold;
    assert.deepEqual(buyAdditionalEquipment(s,T,'fighter'),{ok:true,cost:total,count:3,level,deployed:false});
    assert.equal(s.gold,before-total);assert.deepEqual(parseSave(JSON.stringify(s)).equipment.fighter,s.equipment.fighter);
  }
  const s=army();s.gold=MAX_GOLD;s.equipment.fighter={level:19,count:100000,deployed:false};
  assert.ok(Number.isSafeInteger(enhancementOffer(s,'fighter').cost));assert.equal(enhancementOffer(s,'fighter').reason,'gold');
});
test('aircraft rank previews require actual general ranks and 300 sergeants',()=>{
  assert.equal(equipmentPurchaseOffer(army('준장'),'transport').visible,true);assert.equal(equipmentPurchaseOffer(army('준장'),'transport').reason,'locked');
  assert.equal(equipmentPurchaseOffer(army('소장'),'fighter').reason,'locked');
  const s=army();s.gold=MAX_GOLD;for(const id of ['transport','fighter'])assert.equal(equipmentPurchaseOffer(s,id).canBuy,true);
  s.sergeants=299;assert.equal(equipmentPurchaseOffer(s,'fighter').reason,'locked');
});
test('equipment owns military/personal navigation; shop no longer exposes personal category',()=>{
  const s=army(),personal=equipmentPanelMarkup(s,'tank','personal'),military=equipmentPanelMarkup(s,'tank');
  assert.deepEqual(SHOP_CATEGORIES.map(c=>c.id),['recruit','equipment','schools']);
  assert.doesNotMatch(shopMarkup(s,'',()=>''),/data-personal-equipment|data-shop-category="personal"/);
  for(const id of ['commandBaton','generalSword','divisionFlag','generalRevolver'])assert.match(personal,new RegExp(`data-personal-equipment="${id}"`));
  assert.match(personal,/50초 동안 터치 골드 2배/);assert.match(personal,/현재 단계까지의 강화비/);
  assert.match(personal,/data-use-revolver/);assert.doesNotMatch(personal,/data-select-equipment/);
  assert.match(military,/data-equipment-category="personal"/);assert.equal((military.match(/data-level=/g)??[]).length,20);
});
test('new ceremonial art is detailed, distinct and reused across renders',()=>{
  const flag=personalIcon('flag',1),upgraded=personalIcon('flag',2),revolver=personalIcon('revolver');
  assert.equal(personalIcon('flag',1),flag);assert.notEqual(flag,upgraded);assert.notEqual(flag,revolver);
  for(const svg of [flag,upgraded,revolver])assert.ok((svg.match(/<rect /g)??[]).length>90);
});
test('auto skill checkpoints once, ticks batch saves, handoff/reload never replays gold',()=>{
  let now=T;const s=army(),values=new Map([[SAVE_KEY,JSON.stringify(s)]]),writes=[];
  const storage={getItem:key=>values.get(key)??null,setItem(key,value){writes.push(key);values.set(key,value);}};
  const make=()=>createGameSession({storage,now:()=>now,setTimer:()=>1,clearTimer:()=>{}});
  const a=make();a.start();a.change(state=>activateAutoTouch(state,now));assert.deepEqual(writes,[SAVE_KEY+'-backup',SAVE_KEY]);
  for(let n=1;n<=6;n++){now=T+n*300;a.tick();}assert.equal(writes.length,2);assert.equal(a.state.autoTouchTicks,6);
  a.pause();const b=make();b.start();assert.equal(b.state.gold,a.state.gold);assert.equal(b.state.autoTouchTicks,6);
  assert.equal(a.change(state=>activateAutoTouch(state,now)),undefined);
  now=T+60000;b.tick();assert.equal(b.state.autoTouchTicks,200);b.pause();const c=make();c.start();assert.equal(c.state.gold,b.state.gold);c.pause();
});
test('failed saves retain auto progress in memory and recover without duplicate pulses',()=>{
  let now=T,fail=false;const values=new Map([[SAVE_KEY,JSON.stringify(army())]]),errors=[];
  const storage={getItem:k=>values.get(k)??null,setItem(k,v){if(fail)throw new Error('full');values.set(k,v);}};
  const session=createGameSession({storage,now:()=>now,setTimer:()=>1,clearTimer:()=>{},onError:(area)=>errors.push(area)});
  session.start();session.change(s=>activateAutoTouch(s,now));fail=true;now=T+600;session.tick();session.pause();
  assert.equal(session.state.autoTouchTicks,2);const earned=session.state.gold;
  session.start();assert.equal(session.state.gold,earned);assert.equal(session.state.autoTouchTicks,2);
  fail=false;assert.equal(session.flush(),true);const saved=parseSave(values.get(SAVE_KEY));
  assert.equal(saved.gold,earned);assert.equal(saved.autoTouchTicks,2);assert.deepEqual(errors,['save.write']);session.pause();
});
