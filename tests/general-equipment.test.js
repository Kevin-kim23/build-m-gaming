import test from "node:test";
import assert from "node:assert/strict";
import { freshState, recruit, recruitOffer, unitCost, parseSave, perSecond, perTap, MAX_GOLD, MAX_SOLDIERS, SAVE_KEY } from "../src/game.js";
import { commandBatonStatus, generalSwordStatus } from "../src/personal-equipment.js";
import { RANKS, rankForArmy, promotionProgress } from "../src/ranks.js";
import { shopMarkup } from "../src/shop.js";
import { createGameSession } from "../src/session.js";
const T=1800000000000;
const army=(soldiers=4720)=>({...freshState(T),soldiers,sergeants:40,ncoSchoolLevel:1,gold:MAX_GOLD});
const markup=(s,category)=>shopMarkup(s,'',()=>'',category);
const sum=(count,type)=>Array.from({length:100},(_,i)=>unitCost(count+i,type)).reduce((a,b)=>a+b,0);

test('colonel baton level two adds sergeant batches but preserves soldier batches and school locks',()=>{
  const lower=army(4719);assert.equal(commandBatonStatus(lower).level,1);
  assert.equal(recruitOffer(lower,'sergeant',100).reason,'locked');
  assert.equal(recruit(lower,T,'sergeant',100).ok,false);
  const s=army();assert.equal(commandBatonStatus(s).level,2);
  assert.equal(recruitOffer(s,'sergeant',100).canBuy,true);
  assert.equal(recruitOffer(s,'soldier',100).canBuy,true);
  s.ncoSchoolLevel=0;assert.equal(recruitOffer(s,'sergeant',100).reason,'locked');
  assert.match(recruitOffer(s,'sergeant',100).requirement,/부사관학교/);
  assert.equal(recruitOffer(s,'soldier',100).canBuy,true);
  s.sergeants=39;assert.equal(commandBatonStatus(s).level,0);
});
test('sergeant bulk prices are independent and exactly match 100 sequential recruits',()=>{
  const s=army(), singles=structuredClone(s), cost=sum(s.sergeants,'sergeant');
  const ordinaryCost=recruitOffer(s,'soldier',100).cost;
  assert.equal(recruitOffer(s,'sergeant',100).cost,cost);
  const result=recruit(s,T,'sergeant',100);assert.equal(result.count,100);assert.equal(s.sergeants,140);
  for(let i=0;i<100;i++)assert.equal(recruit(singles,T,'sergeant').ok,true);
  assert.deepEqual(s,singles);assert.equal(recruitOffer(s,'soldier',100).cost,ordinaryCost);
  assert.equal(recruitOffer(s,'sergeant',100).cost,sum(140,'sergeant'));
  const sameCounts={...army(40),staffSergeants:300};
  for(const type of ['soldier','sergeant','soldier','sergeant'])
    assert.equal(recruitOffer(sameCounts,type,100).cost,sum(40,type));
});
test('sergeant batch is atomic for insufficient gold, capacity and wallet-limit prices',()=>{
  for(const s of [army(),{...army(),soldiers:MAX_SOLDIERS-400-999}]) {
    if(s.soldiers===4720)s.gold=sum(40,'sergeant')-1;
    const before=structuredClone(s),result=recruit(s,T,'sergeant',100);
    assert.equal(result.ok,false);assert.deepEqual(s,before);
  }
  const exact={...army(),soldiers:MAX_SOLDIERS-400-1000};
  assert.equal(recruit(exact,T,'sergeant',100).ok,true);
  const expensive={...army(10000),sergeants:10000};
  assert.ok(recruitOffer(expensive,'sergeant',100).cost>MAX_GOLD);
  assert.equal(recruit(expensive,T,'sergeant',100).reason,'gold');
});
test('bulk sergeants accrue only old income and emit normal new income after purchase',()=>{
  const s=army(),income=perSecond(s),tap=perTap(s);s.gold=sum(40,'sergeant');
  assert.equal(recruit(s,T+1000,'sergeant',100).ok,true);
  assert.equal(s.gold,income);assert.equal(perSecond(s),income+5000);assert.equal(perTap(s),tap+30000);
});
test('general ranks require 5000 soldiers, 300 sergeants and the unchanged power threshold',()=>{
  for(const [soldiers,sergeants,staffSergeants] of [[4999,300,20000],[5000,299,20000],[5000,300,0],[7239,300,0]]) {
    const s={...army(soldiers),sergeants,staffSergeants};assert.equal(RANKS[rankForArmy(s)],'대령');
    assert.equal(generalSwordStatus(s).owned,false);assert.ok(promotionProgress(s).ratio<1);
    assert.match(promotionProgress(s).text,/5,000명 · 하사 .*300명/);
  }
  const s={...army(7239),sergeants:300},result=recruit(s,T);
  assert.equal(result.promoted,true);assert.equal(RANKS[result.rank],'준장');assert.equal(s.soldiers,7240);
  assert.equal(generalSwordStatus(s).owned,true);
  assert.equal(RANKS[rankForArmy({...army(5000),sergeants:300,staffSergeants:112})],'준장');
  assert.equal(RANKS[rankForArmy({...army(5000),sergeants:300,staffSergeants:624})],'소장');
  s.sergeants=39;assert.equal(RANKS[rankForArmy(s)],'대위');
});
test('sword is hidden until colonel, locked there, granted at brigadier and explains its active skill',()=>{
  assert.doesNotMatch(markup(army(880),'personal'),/장군검|general-sword-art/);
  const locked=markup(army(),'personal');assert.match(locked,/장군검/);assert.match(locked,/준장 진급 시 자동 지급/);
  assert.match(locked,/Lv.2/);assert.match(locked,/하사 100명 한 번에 모집/);
  const s={...army(10000),sergeants:300},stats=[perSecond(s),perTap(s)],owned=markup(s,'personal');
  assert.match(owned,/보유 중 · 준장 진급 보상/);assert.match(owned,/30초 동안 홈 터치 골드 2배/);
  assert.deepEqual([perSecond(s),perTap(s)],stats);
  const recruits=markup(s,'recruit');
  for(const type of ['soldier','sergeant','staffSergeant'])assert.equal((recruits.match(new RegExp(`data-buy-bulk="${type}"`,'g'))??[]).length,1);
  assert.equal((recruits.match(/data-bulk-price/g)??[]).length,3);
  assert.match(recruits,/data-buy-bulk="staffSergeant"/);
});
test('existing saves retain assets and derive new gear without inventing serialized items',()=>{
  const s=army(9999);s.staffSergeants=1000;s.equipment.helicopter={level:8,deployed:false,count:1};
  const loaded=parseSave(JSON.stringify(s),T);
  for(const field of ['soldiers','sergeants','staffSergeants','gold','equipment','ncoSchoolLevel'])assert.deepEqual(loaded[field],s[field]);
  assert.equal(RANKS[rankForArmy(loaded)],'대령');assert.equal(commandBatonStatus(loaded).level,2);
  assert.equal(generalSwordStatus(loaded).owned,false);
  loaded.soldiers=5000;loaded.sergeants=300;assert.equal(generalSwordStatus(parseSave(JSON.stringify(loaded),T)).owned,true);
  assert.ok(!Object.hasOwn(loaded,'generalSword'));assert.equal(loaded.version, 14);
});
test('100 sergeants save once with backup and survive session reload without double purchase',()=>{
  const initial=army();initial.gold=sum(40,'sergeant');
  const values=new Map([[SAVE_KEY,JSON.stringify(initial)]]),writes=[];
  const storage={getItem:key=>values.get(key)??null,setItem(key,value){writes.push(key);values.set(key,value);}};
  const session=createGameSession({storage,now:()=>T,setTimer:()=>1,clearTimer:()=>{}});
  session.start();assert.equal(session.change(s=>recruit(s,T,'sergeant',100)).ok,true);
  assert.deepEqual(writes,[SAVE_KEY+'-backup',SAVE_KEY]);
  assert.equal(parseSave(values.get(SAVE_KEY),T).sergeants,140);
  assert.equal(parseSave(values.get(SAVE_KEY+'-backup'),T).sergeants,40);
  session.pause();session.start();assert.equal(session.state.sergeants,140);assert.equal(session.state.gold,0);
  assert.equal(session.change(s=>recruit(s,T,'sergeant',100)).reason,'gold');session.pause();
});
