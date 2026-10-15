import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,buyEquipment,enhanceEquipment,setEquipmentDeployed,enhancePersonalEquipment} from '../src/game.js';
import {equipmentPanelMarkup,renderEquipmentPanel} from '../src/equipment-panels.js';
import {personalDetailMarkup,renderPersonalList} from '../src/personal-panels.js';
import {shopMarkup,SHOP_CATEGORIES} from '../src/shop.js';
import {EQUIPMENT} from '../src/equipment.js';
import {MAX_GOLD} from '../src/money.js';
const T=1800000000000;
function element(){
  const node={width:220,height:124,textContent:'',hidden:false,disabled:false,dataset:{},attributes:{},paintCount:0,htmlWrites:0,
    classList:{toggle(){}},setAttribute(k,v){this.attributes[k]=v;},
    set innerHTML(v){this.htmlWrites++;this.html=v;},get innerHTML(){return this.html??'';}};
  const ctx=new Proxy({drawImage(){node.paintCount++;}},{get:(target,key)=>target[key]??(()=>{})});
  node.getContext=()=>ctx;return node;
}
function panel({military=[],personal=[]}={}){
  const cards=new Map(),wallet=element();
  for(const [type,ids] of [['equipment',military],['personalEquipment',personal]])for(const id of ids){
    const nodes=new Map(),card={dataset:{[type]:id},classList:{toggle(){}},querySelector(selector){
      if(!nodes.has(selector))nodes.set(selector,element());return nodes.get(selector);}};
    cards.set(id,card);
  }
  return {scrollTop:430,cards,wallet,set innerHTML(value){throw Error('list must not be replaced');},
    querySelector(selector){return selector==='#equipment-gold'?wallet:null;},
    querySelectorAll(selector){const field=selector==='[data-equipment]'?'equipment':'personalEquipment';return [...cards.values()].filter(c=>c.dataset[field]);}};
}
function withCanvas(run){const previous=globalThis.document;globalThis.document={createElement:element};try{return run();}finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}}

test('military50 completes enhancement while lower caps stay on the action without redundant status',()=>withCanvas(()=>{
  const s={...freshState(T),soldiers:50000,sergeants:300},root=panel({military:['tank']}),card=root.cards.get('tank');
  for(const level of [20,30,40,50]){
    s.personalLevels.divisionFlag=level-10;s.equipment.tank={level,count:1,deployed:true};
    renderEquipmentPanel(s,root,'tank');
    assert.equal(card.querySelector('[data-enhance-equipment]').disabled,true);
    assert.equal(card.querySelector('[data-enhance-equipment]').textContent,level===50?'최대 강화':'강화 한도');
    assert.doesNotMatch(card.querySelector('[data-gear-status]').textContent,/배치 중|사단기 강화/);
  }
}));

test('all military rows live in the equipment panel without a selected-item view or shop purchases',()=>{
  const s={...freshState(T),soldiers:240};
  assert.deepEqual(SHOP_CATEGORIES.map(c=>c.id),['recruit','facilities','items','store']);
  for(const c of SHOP_CATEGORIES)assert.doesNotMatch(shopMarkup(s,'',()=>'',c.id),/data-buy-equipment/);
  for(const initial of [s,freshState(T)]){
    const html=equipmentPanelMarkup(initial,null);
    assert.equal((html.match(/data-equipment=/g)||[]).length,Object.keys(EQUIPMENT).length);
    assert.match(html,/data-buy-equipment="artillery"/);assert.match(html,/data-enhance-equipment="artillery"/);
    assert.doesNotMatch(html,/data-select-equipment|id="enhance-equipment"|data-buy-additional|추가 구매|equipment-preview/);
  }
});

test('list purchases preserve exact deficits, ownership, direct upgrades, scroll and cached drawings',()=>withCanvas(()=>{
  const s={...freshState(T),soldiers:240,gold:EQUIPMENT.artillery.cost},root=panel({military:['artillery']}),card=root.cards.get('artillery');
  const buy=card.querySelector('[data-buy-equipment]'),up=card.querySelector('[data-enhance-equipment]'),canvas=card.querySelector('[data-gun-preview]');
  renderEquipmentPanel(s,root,'artillery');assert.equal(buy.disabled,true);assert.match(card.querySelector('[data-gear-status]').textContent,/대위 진급/);
  const firstPaint=canvas.paintCount;
  s.soldiers=320;s.gold--;
  renderEquipmentPanel(s,root,'artillery');assert.equal(buy.disabled,true);assert.match(card.querySelector('[data-gear-status]').textContent,/1 G 부족/);
  assert.equal(canvas.paintCount,firstPaint);assert.equal(root.scrollTop,430);
  s.gold++;renderEquipmentPanel(s,root,'artillery');assert.equal(buy.disabled,false);assert.equal(up.hidden,true);
  assert.equal(buyEquipment(s,T,'artillery').ok,true);
  renderEquipmentPanel(s,root,'artillery');assert.equal(buy.hidden,true);assert.equal(up.hidden,false);
  assert.equal(buyEquipment(s,T,'artillery').reason,'owned');
  s.gold=MAX_GOLD;assert.equal(enhanceEquipment(s,T,'artillery').ok,true);
  assert.equal(setEquipmentDeployed(s,false,T,'artillery').ok,true);
  renderEquipmentPanel(s,root,'artillery');assert.equal(card.querySelector('[data-gear-level]').textContent,'Lv.1');
  assert.equal(card.querySelector('[data-gear-status]').textContent,'');assert.ok(canvas.paintCount>firstPaint);
  assert.equal(up.disabled,false);assert.equal(root.scrollTop,430);
  renderEquipmentPanel(s,root,'artillery',{active:false});assert.equal(up.disabled,true);assert.equal(buy.disabled,true);
}));

test('personal list upgrades update existing art only after level changes and keep maximum/locked/inactive guards',()=>{
  const s={...freshState(T),soldiers:1280,gold:MAX_GOLD},root=panel({personal:['commandBaton','generalSword']});
  const baton=root.cards.get('commandBaton'),sword=root.cards.get('generalSword'),art=baton.querySelector('[data-personal-art]');
  art.dataset.level='1';renderPersonalList(s,root);
  assert.equal(art.htmlWrites,0);assert.equal(baton.querySelector('[data-enhance-personal]').disabled,false);
  assert.equal(sword.querySelector('[data-enhance-personal]').disabled,true);
  assert.equal(enhancePersonalEquipment(s,T,'commandBaton').ok,true);renderPersonalList(s,root);
  assert.equal(art.htmlWrites,1);assert.equal(baton.querySelector('h3 small').textContent,'Lv.2');assert.equal(root.scrollTop,430);
  renderPersonalList(s,root);assert.equal(art.htmlWrites,1);
  s.personalLevels.commandBaton=30;renderPersonalList(s,root);assert.equal(baton.querySelector('[data-enhance-personal]').textContent,'최대 강화');
  s.personalLevels.commandBaton=1;renderPersonalList(s,root,{active:false});assert.equal(baton.querySelector('[data-enhance-personal]').disabled,true);
  assert.doesNotMatch(personalDetailMarkup(s,'commandBaton').body,/data-detail-action="enhance-personal"/);
  assert.match(personalDetailMarkup(s,'commandBaton').body,/강화 비용·능력표/);
});

test('military and personal gear retain distinct titles with the same direct-action row layout',()=>{
  const s={...freshState(T),soldiers:1280},military=equipmentPanelMarkup(s,'artillery','military'),personal=equipmentPanelMarkup(s,'artillery','personal');
  assert.match(military,/<h2 id="modal-title">군사 장비<\/h2>/);assert.match(personal,/<h2 id="modal-title">개인장비<\/h2>/);
  assert.doesNotMatch(military,/data-personal-equipment=/);assert.doesNotMatch(personal,/data-buy-equipment=|data-enhance-equipment=/);
  assert.match(personal,/data-enhance-personal="commandBaton"/);
  for(const html of [military,personal]){assert.match(html,/equipment-list-card/);assert.doesNotMatch(html,/data-panel=|data-equipment-category|panel-tabs|equipment-categories/);}
});
