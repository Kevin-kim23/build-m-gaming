import test from 'node:test';
import assert from 'node:assert/strict';
import { GALACTIC_EQUIPMENT } from '../src/galactic-equipment.js';
import { EQUIPMENT, enhancementCost, equipmentStats, equipmentIncome, equipmentPurchaseOffer } from '../src/equipment.js';
import { WEAPON_FX, drawWeaponShot, drawHeadquartersDestruction, weaponRecoil } from '../src/weapon-fx.js';
import { freshState } from '../src/state.js';
import { exact, MAX_GOLD, serializeSave } from '../src/money.js';
import { parseSave } from '../src/save.js';
import { RANK_DEFINITIONS } from '../src/ranks.js';

test('galaxy gear unlocks one per rank, retains exact affordable upgrade prices through40',()=>{
  assert.equal(Object.keys(GALACTIC_EQUIPMENT).length,5);
  for(const gear of Object.values(GALACTIC_EQUIPMENT)){
    const power=RANK_DEFINITIONS.find(r=>r.name===gear.unlockRank).required;
    const s={...freshState(),soldiers:power-3000,sergeants:300,gold:MAX_GOLD};
    assert.equal(equipmentPurchaseOffer(s,gear.id).canBuy,true);
    assert.equal(equipmentPurchaseOffer({...s,soldiers:s.soldiers-1},gear.id).reason,'locked');
    for(let level=0;level<40;level++){
      const cost=enhancementCost(level,gear.id);
      assert.ok(exact(cost)>0n&&exact(cost)<=MAX_GOLD);
      assert.equal(exact(cost)%10000n,0n);
      assert.ok(exact(equipmentStats(level,gear.id).tap)>0n);
    }
    assert.equal(enhancementCost(40,gear.id),null);
    s.equipment[gear.id]={level:30,count:100000,deployed:true};
    const expected=BigInt(equipmentStats(30,gear.id).tap)*100000n;
    assert.equal(exact(equipmentIncome(s).tap),expected>MAX_GOLD?MAX_GOLD:expected);
    assert.deepEqual(parseSave(serializeSave(s)).equipment[gear.id],s.equipment[gear.id]);
    assert.equal(equipmentPurchaseOffer({...s,equipment:{},gold:exact(gear.cost)-1n},gear.id).reason,'gold');
  }
});

function drawing(){const ops=[];const ctx=new Proxy({globalAlpha:1},{get(o,k){if(k in o)return o[k];return (...v)=>{assert.ok(v.every(x=>typeof x!=='number'||Number.isFinite(x)));ops.push([k,...v]);};},set(o,k,v){o[k]=v;return true;}});return {ctx,ops};}
test('every weapon has a distinct firing profile and finite draw/recoil states',()=>{
  assert.deepEqual(Object.keys(WEAPON_FX).sort(),Object.keys(EQUIPMENT).sort());
  assert.equal(new Set(Object.values(WEAPON_FX).map(p=>p.style)).size,Object.keys(EQUIPMENT).length);
  const signatures=new Set();
  for(const id of Object.keys(EQUIPMENT)){
    const {ctx,ops}=drawing();for(const age of [0,65,170,310,490,601])drawWeaponShot(ctx,{id,side:'player'},age,180,340,56);
    signatures.add(JSON.stringify(ops));assert.equal(weaponRecoil(id,-1),0);assert.equal(weaponRecoil(id,250),0);
  }
  assert.equal(signatures.size,Object.keys(EQUIPMENT).length);
  for(const reduced of [true,false]){const {ctx}=drawing();for(const age of [0,100,600,1500])drawHeadquartersDestruction(ctx,age,180,56,reduced);}
});
