import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../src/state.js';
import { OPERATIVES, SUPPLY_CAP, recruitOperative, claimSupply, toggleDuty } from '../src/loot.js';
import { POTION_COUNT_LIMIT } from '../src/potions.js';
import { createLootShop, lootShopMarkup, operativeCardView } from '../src/loot-ui.js';

const T=1800000000000,DAY=86400000;
const definition=id=>OPERATIVES.find(o=>o.id===id);
const view=(s,id,clock=T,active=true)=>operativeCardView(s,definition(id),clock,active);

test('roster separates persistent balance, clear benefits, honest prices and one action per operative',()=>{
  const html=lootShopMarkup();
  assert.ok(html.indexOf('data-loot-balance')<html.indexOf('class="loot-scroll"'));
  assert.equal((html.match(/data-crew-action=/g)??[]).length,5);
  for(const o of OPERATIVES){
    assert.ok(html.includes(o.effect));assert.ok(html.includes(`aria-label="${o.name} 상세보기"`));
  }
  assert.equal((html.match(/첫 영입 즉시 지급/g)??[]).length,3);
  assert.match(html,/골드나 현금은 사용하지/);assert.doesNotMatch(html,/한정 판매|한정 수량|할인|희귀 등급/);
});

test('recruitment view exposes exact shortage, keeps prices unchanged and guards an inactive session',()=>{
  const s=freshState(T);
  for(const o of OPERATIVES){
    s.loot.balance=o.price-1;let v=view(s,o.id);
    assert.equal(v.phase,'locked');assert.equal(v.status,'전리품 1개 부족');assert.equal(v.disabled,true);
    s.loot.balance=o.price;v=view(s,o.id);assert.equal(v.phase,'available');assert.equal(v.disabled,false);
    assert.equal(view(s,o.id,T,false).disabled,true);
  }
});

test('owned supply cards show their real clock, collection amount and an inventory-full explanation',()=>{
  for(const o of OPERATIVES.filter(o=>o.period)){
    const s=freshState(T);s.loot.balance=100000;recruitOperative(s,o.id,T);
    let v=view(s,o.id);assert.equal(v.owned,true);assert.equal(v.phase,'waiting');
    assert.equal(v.timer,o.period===DAY?'다음 24:00':'다음 72:00');assert.equal(v.disabled,true);
    v=view(s,o.id,T+o.period);assert.equal(v.phase,'ready');assert.equal(v.action,'1개 받기');assert.equal(v.disabled,false);
    s.potions[o.potion].count=POTION_COUNT_LIMIT;v=view(s,o.id,T+o.period);
    assert.equal(v.action,'아이템 가득');assert.equal(v.disabled,true);assert.match(v.status,/부스터를 사용/);
    s.potions[o.potion].count--;assert.equal(claimSupply(s,o.id,T+o.period).amount,1);
    assert.equal(view(s,o.id,T+o.period).ready,0);
    v=view(s,o.id,T+o.period*(SUPPLY_CAP+1));assert.equal(v.timer,'보급함 가득');assert.equal(v.ready,3);
  }
});

test('passive and toggle cards retain their exact benefits with distinct, truthful action states',()=>{
  const s=freshState(T);s.loot.balance=100000;
  recruitOperative(s,'duty',T);let v=view(s,'duty');
  assert.equal(v.phase,'active');assert.equal(v.action,'끄기');assert.equal(v.pressed,true);
  toggleDuty(s);v=view(s,'duty');assert.equal(v.phase,'paused');assert.equal(v.action,'켜기');assert.equal(v.pressed,false);
  assert.equal(view(s,'duty',T,false).disabled,true);
  recruitOperative(s,'quartermaster',T);v=view(s,'quartermaster');
  assert.equal(v.price,'최대 12시간');assert.equal(v.action,'적용 중');assert.equal(v.disabled,true);
});

function fixture(){
  const nodes=[];
  function element(){
    let value='';const children=new Map();
    const node={dataset:{},attributes:{},hidden:false,disabled:false,writes:0,
      classList:{toggle(){}},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},
      get textContent(){return value;},set textContent(v){this.writes++;value=v;},
      querySelector(key){if(!children.has(key))children.set(key,element());return children.get(key);},
      set innerHTML(value){throw Error('Cards must not be replaced during updates');}};
    nodes.push(node);return node;
  }
  const dialog=element(),trigger=element(),handlers=new Map();
  dialog.open=false;dialog.scrollTop=480;dialog.showModal=()=>{dialog.open=true;};
  dialog.close=()=>{dialog.open=false;handlers.get('close')?.();};
  dialog.addEventListener=(name,fn)=>handlers.set(name,fn);trigger.focus=()=>{};
  let insertions=0;
  const root={body:{insertAdjacentHTML(){insertions++;}},querySelector:id=>id==='#loot-shop'?dialog:trigger};
  const state=freshState(T);state.loot.balance=100000;
  const session={state,active:true,change:fn=>fn(state)};
  return {root,session,dialog,nodes,handlers,get insertions(){return insertions;}};
}
test('recruiting and repeat sync preserve card DOM, scroll and a single welcome grant',()=>{
  const f=fixture(),shop=createLootShop(f.session,{root:f.root,now:()=>T});
  shop.open();assert.equal(f.insertions,1);
  const before=f.nodes.reduce((n,x)=>n+x.writes,0);shop.sync();
  assert.equal(f.nodes.reduce((n,x)=>n+x.writes,0),before);
  const event={target:{closest:selector=>selector==='[data-crew-action]'?{dataset:{crewAction:'scout'}}:null}};
  f.handlers.get('click')(event);assert.equal(f.session.state.potions.blue.count,1);
  assert.equal(f.dialog.scrollTop,480);assert.equal(f.insertions,1);
  f.handlers.get('click')(event);assert.equal(f.session.state.potions.blue.count,1);
  assert.equal(f.dialog.querySelector('[data-loot-collection]').textContent,'1 / 5');
  assert.equal(f.dialog.querySelector('[data-loot-balance]').textContent,'91,000');
});
