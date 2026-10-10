import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_GOLD, LEGACY_MAX_GOLD, parseGold, exact, compactMoney, addMoney, subtractMoney, multiplyMoney, scaleMoney, serializeSave } from '../src/money.js';
import { freshState, parseSave, tapGold, accrue, perSecond, recruit, upgradeSchool, enhanceEquipment, SAVE_KEY, MAX_OFFLINE_MS } from '../src/game.js';
import { enhancementOffer, enhancementCost } from '../src/equipment.js';
import { fmtGold, fmtGoldCost } from '../src/format.js';
import { createGameSession } from '../src/session.js';
import { prepareOfflineReward, claimOfflineReward } from '../src/offline-reward.js';
import { unitCost } from '../src/game.js';
const T=1_800_000_000_000;

test('passive percentage ratios remain exact across the safe integer boundary and 1000해',()=>{
  for(const value of [0,1,99,100,101,Number.MAX_SAFE_INTEGER-1,Number.MAX_SAFE_INTEGER,BigInt(Number.MAX_SAFE_INTEGER)+1n,MAX_GOLD-1n,MAX_GOLD]){
    for(const percent of [100,180,220,240,300,380,400])assert.equal(exact(scaleMoney(value,percent,100)),exact(value)*BigInt(percent)/100n);
  }
  for(const [n,d] of [[-1,100],[220,0],[1,NaN],[Infinity,100],[2.2,100]])assert.throws(()=>scaleMoney(100,n,d),RangeError);
  assert.throws(()=>scaleMoney(-1,220,100),RangeError);
});

test('money crosses the safe-number boundary in both directions without losing a single gold',()=>{
  const edge=Number.MAX_SAFE_INTEGER;
  assert.equal(addMoney(edge,1),BigInt(edge)+1n);
  assert.equal(subtractMoney(BigInt(edge)+1n,1),edge);
  assert.equal(multiplyMoney(edge,100),BigInt(edge)*100n);
  for(const gold of [0,1,edge-1,edge,BigInt(edge)+1n,10_000_000_000_000_001n,10n**20n,MAX_GOLD-1n,MAX_GOLD]) {
    const s={...freshState(T),gold};assert.deepEqual(parseSave(serializeSave(s),T),s);
  }
  assert.throws(()=>exact(Number.MAX_SAFE_INTEGER+1),RangeError);
});

test('4000 mixed arithmetic operations match an independent integer reference at 1000해',()=>{
  let expected=MAX_GOLD/2n, value=expected, seed=87531;
  for(let i=0;i<4000;i++) {
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const amount=seed+1;
    if(i%2){value=addMoney(value,amount);expected+=BigInt(amount);}
    else {value=subtractMoney(value,amount);expected-=BigInt(amount);}
    assert.equal(exact(value),expected);
    assert.equal(exact(multiplyMoney(amount,seed)),BigInt(amount)*BigInt(seed));
  }
});

test('high gold is stored as canonical decimal text, malformed or rounded amounts are rejected',()=>{
  const s={...freshState(T),gold:MAX_GOLD-1n};
  assert.equal(JSON.parse(serializeSave(s)).gold,'99999999999999999999999');
  for(const gold of ['100000000000000000000001','1000000000000000000000000','1e23','+1','01','-1','1.0','Infinity','',null,{},[],Number.MAX_SAFE_INTEGER+1])
    assert.equal(parseSave(JSON.stringify({...freshState(T),gold}),T),null);
  assert.equal(parseSave(JSON.stringify({...freshState(T),version:16,gold:'100000000000000'}),T),null);
  const old={...freshState(T),version:16,gold:99_999_999_999_999};
  assert.equal(parseSave(JSON.stringify(old),T).gold,old.gold);
});

test('prices and balances format through 해 using two units without rounding purchases',()=>{
  for(const [n,wallet,cost] of [
    [9_999_999_999_999_999n,'9,999조 9,999억','1경'],
    [10_000_000_000_000_001n,'1경','1경 1조'],
    [12_345_678_901_234_567n,'1경 2,345조','1경 2,346조'],
    [LEGACY_MAX_GOLD-1n,'999경 9,999조','1,000경'],[LEGACY_MAX_GOLD,'1,000경','1,000경'],
    [10n**20n-1n,'9,999경 9,999조','1해'],[10n**20n,'1해','1해'],
    [10n**20n+1n,'1해','1해 1경'],[123_456_789_012_345_678_901n,'1해 2,345경','1해 2,346경'],
    [MAX_GOLD-1n,'999해 9,999경','1,000해'],[MAX_GOLD,'1,000해','1,000해'],
  ]){assert.equal(fmtGold(n),wallet);assert.equal(fmtGoldCost(n),cost);}
  const parseLabel=label=>[...label.matchAll(/([\d,]+)(해|경|조|억|만)/g)].reduce((sum,[,digits,unit])=>sum+BigInt(digits.replaceAll(',',''))*{해:10n**20n,경:10n**16n,조:10n**12n,억:10n**8n,만:10n**4n}[unit],0n);
  for(let i=1n;i<=1000n;i++) {
    const n=(MAX_GOLD/1000n)*i-17n;
    assert.ok(parseLabel(fmtGold(n))<=n);assert.ok(parseLabel(fmtGoldCost(n))>=n);
  }
});

test('v34 opens the larger wallet without relaxing historical save validation',()=>{
  assert.equal(MAX_GOLD,10n**23n);
  for(const version of [17,21,22,30,33]) {
    assert.equal(parseGold(LEGACY_MAX_GOLD.toString(),version),LEGACY_MAX_GOLD);
    assert.equal(parseGold((LEGACY_MAX_GOLD+1n).toString(),version),null);
    assert.equal(parseGold((10n**20n).toString(),version),null);
  }
  assert.equal(parseGold((LEGACY_MAX_GOLD+1n).toString(),34),LEGACY_MAX_GOLD+1n);
  assert.equal(parseGold(MAX_GOLD.toString(),34),MAX_GOLD);
  assert.equal(parseGold((MAX_GOLD+1n).toString(),34),null);
});

test('a purchase above one 해 rejects a single missing gold and subtracts every digit',()=>{
  const state={...freshState(T),soldiers:200_000_000_000,gold:0};
  const cost=unitCost(state.soldiers,'soldier');
  assert.ok(cost>10n**20n&&cost<MAX_GOLD);
  state.gold=cost-1n;
  const before=serializeSave(state);
  assert.equal(recruit(state,T).reason,'gold');assert.equal(serializeSave(state),before);
  state.gold=cost;assert.equal(recruit(state,T).ok,true);assert.equal(state.gold,0);
  state.gold=MAX_GOLD-1n;
  const next=unitCost(state.soldiers,'soldier');
  assert.equal(recruit(state,T).ok,true);assert.equal(state.gold,MAX_GOLD-1n-exact(next));
  assert.equal(parseSave(serializeSave(state),T).gold,state.gold);
});

test('해-sized pending offline rewards round trip, double exactly and clamp only the payout',()=>{
  const amount=10n**20n+123n;
  const state={...freshState(T),gold:10n**20n+7n,offlineReward:{id:T,durationMs:3600000,amount}};
  const loaded=parseSave(serializeSave(state),T);
  assert.deepEqual(loaded.offlineReward,state.offlineReward);
  assert.equal(claimOfflineReward(loaded,T,2).amount,amount*2n);
  assert.equal(loaded.gold,3n*10n**20n+253n);
  assert.equal(loaded.offlineReward,null);
  const capped={...state,gold:MAX_GOLD-1n,incomeRemainder:777};
  assert.equal(claimOfflineReward(capped,T,2).amount,1);assert.equal(capped.gold,MAX_GOLD);assert.equal(capped.incomeRemainder,0);
  for(const bad of [MAX_GOLD+1n,'1000000000000000000000000',Number.MAX_SAFE_INTEGER+1])
    assert.equal(parseSave(serializeSave({...state,offlineReward:{...state.offlineReward,amount:bad}}),T),null);
  const away={...freshState(T),soldiers:1,gold:MAX_GOLD-1n,offlineReward:{id:T-1,durationMs:3600000,amount:MAX_GOLD-1n}};
  assert.equal(prepareOfflineReward(away,T+3600000),true);assert.equal(away.offlineReward.amount,MAX_GOLD);
  assert.equal(away.gold,MAX_GOLD-1n);assert.ok(parseSave(serializeSave(away),T+3600000));
});

test('one-gold tap at the new cap and purchases never erase low digits',()=>{
  const s={...freshState(T),gold:MAX_GOLD-1n};
  assert.equal(tapGold(s,T),1);assert.equal(s.gold,MAX_GOLD);
  assert.equal(tapGold(s,T),0);
  assert.equal(recruit(s,T).ok,true);assert.equal(s.gold,MAX_GOLD-50n);
  s.gold=MAX_GOLD-1n;s.soldiers=0;
  assert.equal(upgradeSchool(s,T,'nco').ok,true);assert.equal(s.gold,MAX_GOLD-600001n);
});

test('legacy enhancement quote stays exact and cannot bypass the new flag limit',()=>{
  const s={...freshState(T),soldiers:78920,sergeants:300,gold:MAX_GOLD};
  s.equipment.fighter={level:19,count:100000,deployed:false};
  const cost=multiplyMoney(enhancementCost(19,'fighter'),100000);
  assert.ok(typeof cost==='bigint'&&cost>BigInt(Number.MAX_SAFE_INTEGER));
  s.gold=cost-1n;const before=structuredClone(s);
  assert.equal(enhanceEquipment(s,T,'fighter').reason,'max');assert.deepEqual(s,before);
  s.gold=cost;assert.equal(enhanceEquipment(s,T,'fighter').reason,'max');assert.equal(s.gold,cost);
});

test('eight-hour exact income, fractional ticks and cap settlement match integer reference',()=>{
  const base={...freshState(T),gold:10_000_000_000_000_001n,soldiers:5242880,sergeants:300,campaignCleared:80,incomeRemainder:723};
  for(const id of ['helicopter','rocketLauncher','transport','fighter'])base.equipment[id]={level:20,count:100000,deployed:true};
  for(const elapsed of [1,999,1234,MAX_OFFLINE_MS,MAX_OFFLINE_MS*3]) {
    const s=structuredClone(base),scaled=BigInt(perSecond(s))*BigInt(Math.min(elapsed,MAX_OFFLINE_MS))+723n;
    accrue(s,T+elapsed);
    assert.equal(exact(s.gold),base.gold+scaled/1000n);assert.equal(s.incomeRemainder,Number(scaled%1000n));
    assert.equal(parseSave(serializeSave(s),T+elapsed).gold,s.gold);
  }
  const full={...base,gold:MAX_GOLD-1n};accrue(full,T+1);assert.equal(full.gold,MAX_GOLD);assert.equal(full.incomeRemainder,0);
});

test('failed large-money saves retry exactly once and reload without dropping gold digits',()=>{
  let fail=false, errors=0;
  const original={...freshState(T),gold:MAX_GOLD-2n};
  const values=new Map([[SAVE_KEY,serializeSave(original)]]);
  const session=createGameSession({storage:{getItem:k=>values.get(k)??null,setItem(k,v){if(fail)throw Error('full');values.set(k,v);}},
    now:()=>T,setTimer:()=>1,clearTimer:()=>{},onError:()=>errors++});
  session.start();fail=true;session.tap();assert.equal(session.flush(),false);assert.equal(errors,1);
  assert.equal(session.state.gold,MAX_GOLD-1n);assert.equal(parseSave(values.get(SAVE_KEY),T).gold,MAX_GOLD-2n);
  fail=false;session.pause();session.start();assert.equal(session.state.gold,MAX_GOLD-1n);
  session.tap();session.pause();assert.equal(parseSave(values.get(SAVE_KEY),T).gold,MAX_GOLD);
});
