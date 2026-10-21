import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,SAVE_VERSION} from '../src/state.js';
import {parseSave} from '../src/save.js';
import {serializeSave,MAX_GOLD,exact} from '../src/money.js';
import {OPERATIVES} from '../src/loot.js';
import {LOOT_PERKS,LOOT_DAILY,LOOT_ITEMS,lootItemOffer,buyLootItem,dealItem,emptyMarket} from '../src/loot-market.js';
import {rewardDay} from '../src/kst-day.js';
import {recruitOffer,recruit,unitCost,basePassiveIncome,enhanceEquipment} from '../src/game.js';
import {enhancementCost} from '../src/equipment.js';
import {quietBattle,deployNow} from './lane-helpers.js';
import {lootShopMarkup,marketCardView} from '../src/loot-ui.js';
import {marketIcon} from '../src/market-art.js';

// 0.79.0 전리품 상점: 가격 ×10, 새 상품 7칸. 시험용 기록만 쓴다.
const T=1800000000000,DAY=86400000;
const day=rewardDay(T),notDeal=id=>{let t=T;while(dealItem(freshState(t),t).id===id)t+=DAY;return t;};
const rich=(t=T)=>{const s=freshState(t);s.loot.balance=1_000_000;s.soldiers=10000;s.sergeants=300;s.equipment.artillery={level:10,count:1,deployed:true};return s;};

test('operative prices are ten times the previous release',()=>{
  assert.deepEqual(OPERATIVES.map(o=>o.price),[3000,9000,9000,24000,60000]);
  assert.deepEqual(LOOT_ITEMS.map(i=>[i.id,i.price]),[['instructors',30000],['lab',40000],['manual',40000],['vault',2000],['blue',3000],['red',3000],['max',30000]]);
});

test('the elite instructors cut every recruit price by exactly 10%, once',()=>{
  const t=notDeal('instructors'),s=rich(t);
  const before=recruitOffer(s,'soldier').cost;
  assert.equal(buyLootItem(s,'instructors',t).ok,true);assert.equal(s.loot.balance,1_000_000-30000);
  assert.equal(recruitOffer(s,'soldier').cost,Math.floor(before*9/10));
  s.gold=recruitOffer(s,'soldier').cost;assert.equal(recruit(s,t).ok,true);assert.equal(s.gold,0);
  assert.equal(buyLootItem(s,'instructors',t).reason,'owned');assert.equal(s.loot.balance,1_000_000-30000);
  assert.equal(unitCost(10001,'soldier'),unitCost(10001,'soldier'),'base quote unchanged');
});

test('the equipment lab cuts enhancement by 10% and the battle manual adds 10% to deployed gear',()=>{
  const t=notDeal('lab'),s=rich(t);s.equipment.artillery.level=9;
  const full=exact(enhancementCost(9,'artillery'));
  buyLootItem(s,'lab',t);
  s.gold=full*9n/10n-1n;assert.equal(enhanceEquipment(s,t,'artillery').reason,'gold');
  s.gold=full*9n/10n;assert.equal(enhanceEquipment(s,t,'artillery').ok,true);assert.equal(exact(s.gold),0n);
  const plain=rich(t),boosted=rich(t);buyLootItem(boosted,'manual',t);
  const a=deployNow(quietBattle(plain,1,['artillery']),'artillery').player.units[0];
  const b=deployNow(quietBattle(boosted,1,['artillery']),'artillery').player.units[0];
  assert.ok(Math.abs(b.damage/a.damage-1.1)<1e-9);assert.ok(Math.abs(b.maxHp/a.maxHp-1.1)<1e-9);assert.equal(b.hp,b.maxHp);
});

test('the vault pays one hour of base passive income, three times per Korean day, capped at the wallet',()=>{
  const t=notDeal('vault'),s=rich(t);
  const hour=exact(basePassiveIncome(s))*3600n;
  for(let i=0;i<3;i++){const r=buyLootItem(s,'vault',t,basePassiveIncome(s));assert.equal(r.ok,true);assert.equal(exact(r.gold),hour);}
  assert.equal(buyLootItem(s,'vault',t,basePassiveIncome(s)).reason,'limit');
  assert.equal(exact(s.gold),hour*3n);
  const next=t+DAY;assert.equal(lootItemOffer(s,'vault',next).left,3);
  s.gold=MAX_GOLD-1n;assert.equal(exact(buyLootItem(s,'vault',next,basePassiveIncome(s)).gold),1n);assert.equal(s.gold,MAX_GOLD);
});

test('booster exchange adds one booster each, two per day, and the max booster costs 30,000',()=>{
  const t=notDeal('max'),s=rich(t);
  assert.equal(lootItemOffer(s,'max',t).price,30000);
  for(const id of ['blue','red','max']){
    for(let i=0;i<2;i++)assert.equal(buyLootItem(s,id,t).ok,true);
    assert.equal(s.potions[id].count,2);assert.equal(buyLootItem(s,id,t).reason,'limit');
  }
});

test('one daily deal at 30% off rotates with the Korean date and skips owned perks',()=>{
  const s=rich();
  const deal=dealItem(s,T);assert.equal(deal.id,LOOT_ITEMS[day%LOOT_ITEMS.length].id);
  assert.equal(lootItemOffer(s,deal.id,T).price,deal.price*7/10);
  assert.notEqual(dealItem(s,T+DAY).id,deal.id);
  const perk=LOOT_PERKS[0],t=T+((LOOT_ITEMS.indexOf(perk)-day%LOOT_ITEMS.length+LOOT_ITEMS.length)%LOOT_ITEMS.length)*DAY;
  assert.equal(dealItem(s,t).id,perk.id);
  assert.equal(buyLootItem(s,perk.id,t).price,perk.price*7/10);
  assert.equal(dealItem(s,t).id,LOOT_ITEMS[1].id);
});

test('short balance and the inventory cap refuse without spending',()=>{
  const s=freshState(T);s.loot.balance=1999;
  assert.equal(buyLootItem(s,'vault',T,100).reason,'loot');assert.equal(s.loot.balance,1999);assert.equal(s.gold,0);
});

test('save44 gains an empty market; save45 round-trips purchases and rejects malformed markets',()=>{
  const old=rich();old.version=44;delete old.loot.market;old.loot.operatives.duty={hiredAt:T,settledAt:T,stock:0,enabled:true};
  const loaded=parseSave(serializeSave(old),T);
  assert.equal(loaded.version,SAVE_VERSION);assert.equal(loaded.loot.balance,old.loot.balance);
  assert.deepEqual(loaded.loot.operatives.duty,old.loot.operatives.duty);assert.deepEqual(loaded.loot.market,emptyMarket());
  buyLootItem(loaded,'instructors',T);buyLootItem(loaded,'vault',T,100);
  assert.deepEqual(parseSave(serializeSave(loaded),T),loaded);
  for(const market of [undefined,{...loaded.loot.market,perks:['instructors','instructors']},{...loaded.loot.market,perks:['gold']},
    {...loaded.loot.market,bought:{...loaded.loot.market.bought,vault:4}},{...loaded.loot.market,day:-1}])
    assert.equal(parseSave(serializeSave({...loaded,loot:{...loaded.loot,market}}),T),null);
});

test('shop shows seven support cards with art, honest prices and the deal label',()=>{
  const html=lootShopMarkup();
  assert.equal((html.match(/data-market-action=/g)??[]).length,LOOT_ITEMS.length);
  for(const item of LOOT_ITEMS)assert.match(marketIcon(item),/<svg/);
  const s=freshState(T);s.loot.balance=0;
  const deal=dealItem(s,T),v=marketCardView(s,deal,T);
  assert.equal(v.deal,true);assert.match(v.label,/특가/);assert.match(v.status,/부족/);assert.equal(v.disabled,true);
  s.loot.balance=1_000_000;buyLootItem(s,'manual',T);
  assert.deepEqual([marketCardView(s,LOOT_PERKS[2],T).action,marketCardView(s,LOOT_PERKS[2],T).disabled],['보유',true]);
  buyLootItem(s,'vault',T,1);assert.match(marketCardView(s,LOOT_DAILY[0],T).status,/받을 골드 .* · 오늘 2 \/ 3회/);
  for(let i=1;i<LOOT_DAILY[0].limit;i++)buyLootItem(s,'vault',T,1);
  assert.equal(marketCardView(s,LOOT_DAILY[0],T).action,'오늘 완료');
});
