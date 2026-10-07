import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState,unitCost,recruitOffer,recruit,perSecond,perTap,parseSave } from '../src/game.js';
import { MAX_GOLD,exact,serializeSave } from '../src/money.js';
import { schoolOffer } from '../src/schools.js';
import { schoolUnlockPreview } from '../src/school-panels.js';
import { simulateGrowth } from '../tools/growth-sim.mjs';
const T=1800000000000;

test('early school unlock increases income materially and has a transparent next-unit preview',()=>{
  const s={...freshState(T),soldiers:28,ncoSchoolLevel:1,gold:unitCost(0,'sergeant')};
  const income=perSecond(s),tap=perTap(s);
  assert.equal(recruit(s,T,'sergeant').ok,true);
  assert.equal(s.gold,0);assert.equal(perSecond(s),income+50);assert.equal(perTap(s),tap+300);
  assert.ok(perSecond(s)>income*2);assert.ok(perTap(s)>tap*2);
  assert.equal(schoolOffer(freshState(T),'nco').cost,150000);
  assert.match(schoolUnlockPreview(schoolOffer(freshState(T),'nco')),/하사 해금 · 1명당 초당 \+50 G \/ 터치 \+300 G/);
  assert.match(schoolUnlockPreview(schoolOffer(s,'nco')),/중사 해금/);
});

test('paced polynomial prices preserve exact low digits above the safe-integer boundary',()=>{
  const count=1500,id='general';
  const expected=(5120000000000n+40960000000n*BigInt(count)+512000000n*BigInt(count)**2n)*12n;
  assert.ok(expected>BigInt(Number.MAX_SAFE_INTEGER));assert.equal(exact(unitCost(count,id)),expected);
  const owned=300_000_000,n=BigInt(owned);
  const price=((1000n+1000n*n+n*n+199n)/200n)*10n*8n;
  assert.equal(exact(unitCost(owned,'soldier')),price);
  const s={...freshState(T),gold:price-1n,soldiers:owned};
  const before=serializeSave(s);assert.equal(recruit(s,T).reason,'gold');assert.equal(serializeSave(s),before);
  s.gold=MAX_GOLD-1n;assert.equal(recruit(s,T).ok,true);assert.equal(s.gold,MAX_GOLD-1n-price);
  assert.equal(parseSave(serializeSave(s),T).gold,s.gold);
  assert.equal(unitCost(Number.MAX_SAFE_INTEGER,id),MAX_GOLD);
});

test('new batch prices still charge exactly the sum and do not affect other troop prices',()=>{
  const s={...freshState(T),soldiers:5000,sergeants:300,staffSergeants:120,ncoSchoolLevel:5,
    gold:MAX_GOLD,personalLevels:{...freshState(T).personalLevels,commandBaton:2}};
  const expected=Array.from({length:100},(_,i)=>exact(unitCost(300+i,'sergeant'))).reduce((a,b)=>a+b,0n);
  assert.equal(exact(recruitOffer(s,'sergeant',100).cost),expected);
  const other=unitCost(120,'staffSergeant');assert.equal(recruit(s,T,'sergeant',100).ok,true);
  assert.equal(s.gold,MAX_GOLD-expected);assert.equal(unitCost(120,'staffSergeant'),other);
  assert.equal(parseSave(serializeSave(s),T).gold,s.gold);
});

test('existing paid armies, school levels, pending rewards and gold survive the price-only patch',()=>{
  const s={...freshState(T),soldiers:5000,sergeants:300,staffSergeants:120,ncoSchoolLevel:5,
    gold:9007199254740993n,offlineReward:{id:T,amount:9007199254740993n,durationMs:3600000}};
  const restored=parseSave(serializeSave(s),T);
  for(const field of ['soldiers','sergeants','staffSergeants','ncoSchoolLevel','gold','offlineReward'])assert.deepEqual(restored[field],s[field]);
  assert.equal(perSecond(restored),perSecond(s));assert.equal(perTap(restored),perTap(s));
});

test('documented session model no longer reaches colonel on day one or ends the campaign in a few days',()=>{
  const report=simulateGrowth({battles:true});
  const reached=Object.fromEntries(report.milestones.map(m=>[m.rank,m.day]));
  assert.ok(reached['대령']>=2&&reached['대령']<=5);
  assert.ok(reached['대원수']>=21&&reached['대원수']<=35);
  assert.ok(reached['준장']-reached['대령']<4);
});
