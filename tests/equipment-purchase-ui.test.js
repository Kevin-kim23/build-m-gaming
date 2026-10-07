import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, buyEquipment, enhanceEquipment, setEquipmentDeployed } from '../src/game.js';
import { equipmentPanelMarkup, renderEquipmentPanel } from '../src/equipment-panels.js';
import { shopMarkup, SHOP_CATEGORIES } from '../src/shop.js';
import { EQUIPMENT } from '../src/equipment.js';
const T=1800000000000;
function element() {
  const c={clearRect(){},drawImage(){},fillRect(){},setTransform(){}};
  return {width:440,height:248,textContent:'',hidden:false,disabled:false,setAttribute(){},getContext:()=>c};
}
function panel() {
  const nodes=new Map();
  return {querySelector(selector){if(!nodes.has(selector))nodes.set(selector,element());return nodes.get(selector);},querySelectorAll(){return [];}};
}
test('military equipment is purchased and managed in its own tab, never in shop categories',()=>{
  const s={...freshState(T),soldiers:240};
  assert.deepEqual(SHOP_CATEGORIES.map(c=>c.id),['recruit','schools']);
  for(const c of SHOP_CATEGORIES)assert.doesNotMatch(shopMarkup(s,'',()=>'',c.id),/data-buy-equipment/);
  assert.match(equipmentPanelMarkup(s,'artillery'),/data-buy-equipment="artillery"/);
  assert.doesNotMatch(equipmentPanelMarkup(s,'artillery'),/equipment-to-shop|상점에서/);
  assert.doesNotMatch(equipmentPanelMarkup(freshState(T),null),/견인포|data-buy-equipment/);
});
test('purchase UI tracks rank lock, exact price deficit, owned management and a full yard',()=>{
  const previous=globalThis.document;globalThis.document={createElement:element};
  try {
    const s={...freshState(T),soldiers:240,gold:EQUIPMENT.artillery.cost},root=panel();
    const buy=root.querySelector('#purchase-equipment'),owned=root.querySelector('#owned-equipment');
    renderEquipmentPanel(s,root,'artillery');assert.equal(buy.disabled,true);assert.match(buy.textContent,/대위 해금/);
    s.soldiers=320;s.gold--;
    renderEquipmentPanel(s,root,'artillery');assert.equal(buy.disabled,true);assert.match(buy.textContent,/1 G 부족/);
    s.gold++;renderEquipmentPanel(s,root,'artillery');assert.equal(buy.disabled,false);assert.equal(owned.hidden,true);
    assert.equal(buyEquipment(s,T,'artillery').ok,true);
    renderEquipmentPanel(s,root,'artillery');assert.equal(buy.hidden,true);assert.equal(owned.hidden,false);
    assert.equal(buyEquipment(s,T,'artillery').reason,'owned');
    s.gold=1e14;assert.equal(enhanceEquipment(s,T,'artillery').ok,true);
    assert.equal(setEquipmentDeployed(s,false,T,'artillery').ok,true);
    renderEquipmentPanel(s,root,'artillery');assert.equal(root.querySelector('#equipment-level').textContent,'+1');
    assert.equal(root.querySelector('#equipment-deployed').textContent,'보관 중');
    s.soldiers=7240;s.sergeants=300;
    for(const id of ['artillery','tank','selfPropelled','helicopter'])s.equipment[id]={level:0,count:1,deployed:true};
    assert.equal(buyEquipment(s,T,'rocketLauncher').deployed,false);
    renderEquipmentPanel(s,root,'rocketLauncher');assert.equal(buy.hidden,true);
    assert.equal(root.querySelector('#toggle-equipment').disabled,true);
  } finally { if(previous===undefined)delete globalThis.document;else globalThis.document=previous; }
});
