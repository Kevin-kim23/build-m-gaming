import {serializeLegacySave} from './legacy-save-fixture.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,SAVE_VERSION,SAVE_KEY} from '../src/state.js';
import {parseSave} from '../src/save.js';
import {MAX_GOLD,GALACTIC_MAX_GOLD,exact,serializeSave,subtractMoney,scaleMoney} from '../src/money.js';
import {BULK_RECRUIT,bulkRecruitDiscountPercent} from '../src/personal-equipment.js';
import {PERSONAL_EQUIPMENT} from '../src/personal-catalog.js';
import {GALACTIC_PERSONAL_COSTS,personalUpgradeStep} from '../src/personal-enhancement.js';
import {EQUIPMENT,equipmentStats,equipmentStage,enhancementCost} from '../src/equipment.js';
import {reconcileAchievements} from '../src/achievements.js';
import {recruit,recruitOffer,unitCost,enhanceEquipment,accrue,activateAutoTouch,activateSword,perTap,perSecond} from '../src/game.js';
import {UNITS} from '../src/units.js';
import {createGameSession} from '../src/session.js';
import {createHomeAutoTapFeedback} from '../src/home-auto-tap-ui.js';
const T=1800000000000;
const army=()=>({...freshState(T),soldiers:10000,sergeants:300,galacticBrigadiers:64,
  ncoSchoolLevel:5,officerSchoolLevel:5,advancedSchoolLevel:5,commandSchoolLevel:5,galacticSchoolLevel:5,gold:MAX_GOLD});

test('baton26..30 replaces the old discounts with five new recruitment abilities',()=>{
  for(let level=26;level<=30;level++){
    const s=army();s.personalLevels.commandBaton=level;
    assert.equal(bulkRecruitDiscountPercent(s),0);
    const sum=Array.from({length:100},(_,i)=>exact(unitCost(s.sergeants+i,'sergeant'))).reduce((a,b)=>a+b,0n);
    assert.equal(exact(recruitOffer(s,'sergeant',100).cost),sum);
    assert.equal(Object.values(BULK_RECRUIT).filter(r=>r.level<=level).length,level);
  }
});

test('v34 preserves all levels and active windows; v35 round-trips new maxima and rejects overflow',()=>{
  const s=army();s.version=34;s.gold=GALACTIC_MAX_GOLD-1n;s.campaignCleared=160;s.campaignStars=[...Array(160).fill(3),...Array(40).fill(0)];
  for(const id of Object.keys(s.personalLevels))s.personalLevels[id]=20;
  s.equipment.tank={level:30,count:1,deployed:true};
  s.swordActivatedAt=T;s.swordDurationMs=220000;s.autoTouchActivatedAt=T;s.autoTouchDurationMs=250000;
  reconcileAchievements(s);
  const loaded=parseSave(serializeLegacySave(s),T);assert.deepEqual(loaded,{...s,version:SAVE_VERSION});
  for(const patch of [{personalLevels:{...s.personalLevels,commandBaton:21}},
    {equipment:{...s.equipment,tank:{level:31,count:1,deployed:true}}},
    {swordDurationMs:230000},{autoTouchDurationMs:260000}])assert.equal(parseSave(serializeSave({...s,...patch}),T),null);
  for(const id of Object.keys(loaded.personalLevels))loaded.personalLevels[id]=30;
  loaded.equipment.tank.level=40;
  // An already running skill keeps its original window after enhancement.
  assert.equal(loaded.swordDurationMs,220000);assert.equal(loaded.autoTouchDurationMs,250000);
  loaded.swordDurationMs=320000;loaded.autoTouchDurationMs=350000;loaded.autoTouchTicks=1166;
  assert.deepEqual(parseSave(serializeSave(loaded),T),loaded);
  for(const patch of [{swordDurationMs:330000},{autoTouchDurationMs:360000},{autoTouchTicks:1167}])
    assert.equal(parseSave(serializeSave({...loaded,...patch}),T),null);
});

test('galactic personal prices double from20..100경 and stay payable below the wallet cap',()=>{
  const s=army();for(const id of Object.keys(s.personalLevels))s.personalLevels[id]=20;
  const passive=exact(perSecond(s,T));
  for(const id of Object.keys(PERSONAL_EQUIPMENT)) {
    const anchor=GALACTIC_PERSONAL_COSTS[id];
    assert.equal(exact(personalUpgradeStep(id,20).cost),anchor);
    assert.ok(anchor/passive>=300n,'not an instant passive upgrade at galaxy brigadier baseline');
    for(let level=21;level<30;level++) {
      assert.equal(exact(personalUpgradeStep(id,level).cost),anchor*2n**BigInt(level-20));
      assert.ok(personalUpgradeStep(id,level).cost<MAX_GOLD);
    }
  }
});

test('every military weapon upgrades31..40 with exact gold and nonempty stage names',()=>{
  for(const id of Object.keys(EQUIPMENT)) {
    const s=army();s.personalLevels.divisionFlag=30;s.equipment[id]={level:30,count:1,deployed:true};
    for(let level=30;level<40;level++) {
      const cost=enhancementCost(level,id);s.gold=subtractMoney(cost,1);
      assert.equal(enhanceEquipment(s,T,id).reason,'gold');assert.equal(s.equipment[id].level,level);
      s.gold=cost;assert.equal(enhanceEquipment(s,T,id).ok,true);assert.equal(s.gold,0);
      assert.ok(equipmentStage(id,level+1));
      assert.equal(exact(equipmentStats(level+1,id).tap),exact(EQUIPMENT[id].tap)+exact(EQUIPMENT[id].tapStep)*BigInt(level+1)+exact(EQUIPMENT[id].tap)*3n*BigInt((level+1)**2)/100n);
      assert.equal(parseSave(serializeSave(s),T).equipment[id].level,level+1);
    }
    assert.equal(enhanceEquipment(s,T,id).reason,'max');
  }
});

test('revolver reports actual credited gold, including sword and wallet cap, only once per pulse',()=>{
  const s=army();s.gold=0;activateAutoTouch(s,T);activateSword(s,T);
  const events=[];const expected=perTap(s,T);
  accrue(s,T+300,(amount)=>events.push(amount));assert.deepEqual(events,[expected]);
  accrue(s,T+300,(amount)=>events.push(amount));assert.equal(events.length,1);
  s.gold=subtractMoney(subtractMoney(MAX_GOLD,scaleMoney(perSecond(s,T),300,1000)),1);
  accrue(s,T+600,(amount)=>events.push(amount));assert.equal(events.at(-1),1);assert.equal(s.gold,MAX_GOLD);
  accrue(s,T+900,(amount)=>events.push(amount));assert.equal(events.length,2);
});

test('session reports revolver ticks without offline animation or duplicate payment; UI reuses one label',()=>{
  const s=army();s.gold=0;activateAutoTouch(s,T);
  let now=T;const events=[],data=new Map([[SAVE_KEY,serializeSave(s)]]);
  const session=createGameSession({storage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},now:()=>now,
    setTimer:()=>1,clearTimer(){},onAutoTouchIncome:value=>events.push(value)});
  session.start();now+=300;session.tick();assert.equal(events.length,1);
  session.tick();session.flush();assert.equal(events.length,1);
  now+=2000;session.tick();assert.equal(events.length,1,'no offline catch-up text');
  let cancelled=0,animations=0;const node={textContent:'',animate(){animations++;return {cancel(){cancelled++;}};}};
  const feedback=createHomeAutoTapFeedback(node,'리볼버!');feedback.show(events[0]);feedback.show(123);
  assert.equal(node.textContent,'리볼버! +123 G');assert.equal(animations,2);assert.equal(cancelled,1);
  feedback.clear();assert.equal(cancelled,2);
});
