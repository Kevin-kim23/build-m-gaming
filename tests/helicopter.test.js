import test from "node:test";
import assert from "node:assert/strict";
import { freshState, buyEquipment, enhanceEquipment, setEquipmentDeployed, perSecond, perTap, parseSave, MAX_GOLD } from "../src/game.js";
import { equipmentPurchaseOffer, equipmentStats, enhancementCost, HELICOPTER_STAGES } from "../src/equipment.js";
import { equipmentStoreMarkup } from "../src/equipment-panels.js";
import { createBattle, advanceBattle, defaultLoadout, equipmentCombatStats } from "../src/battle.js";
import { layoutFieldEquipment } from "../src/field-layout.js";
import { drawEquipment } from "../src/equipment-art.js";
const T = 1800000000000;
const army = (power=5120) => ({...freshState(T), soldiers:power-400, sergeants:40, ncoSchoolLevel:2, gold:MAX_GOLD, campaignCleared:80});

test("helicopter is hidden before lieutenant colonel, previews locked, buys once at colonel",()=>{
  assert.equal(equipmentPurchaseOffer(army(640),'helicopter').visible,false);
  assert.doesNotMatch(equipmentStoreMarkup(army(640)),/공격헬기/);
  for (const power of [1280,5119]) {
    const s=army(power), before=s.gold;
    assert.equal(equipmentPurchaseOffer(s,'helicopter').visible,true);
    assert.equal(buyEquipment(s,T,'helicopter').reason,'locked');assert.equal(s.gold,before);
  }
  const s=army();s.gold=44_999_999;
  assert.equal(buyEquipment(s,T,'helicopter').reason,'gold');assert.equal(s.equipment.helicopter,null);
  s.gold=45_000_000;assert.equal(buyEquipment(s,T,'helicopter').ok,true);assert.equal(s.gold,0);
  assert.deepEqual(s.equipment.helicopter,{level:0,deployed:true, count: 1 });
  assert.equal(buyEquipment(s,T,'helicopter').reason,'owned');
  const gated=army();gated.sergeants=39;assert.equal(buyEquipment(gated,T,'helicopter').reason,'locked');
});
test("helicopter upgrades through ten levels, settles prior income, stores and restores",()=>{
  const s=army(), base=perSecond(s), tap=perTap(s);s.gold=900_000_000;
  buyEquipment(s,T+1000,'helicopter');assert.equal(s.gold,900_000_000+base-45_000_000);
  assert.equal(perSecond(s),base+25000);assert.equal(perTap(s),tap+150000);
  assert.equal(enhancementCost(0,'helicopter'),11_250_000);
  for(let level=0;level<10;level++) {
    const previous=equipmentCombatStats('helicopter',level), balance=s.gold;
    const cost=enhancementCost(level,'helicopter');
    assert.equal(enhanceEquipment(s,T+1000,'helicopter').ok,true);assert.equal(s.gold,balance-cost);
    const next=equipmentCombatStats('helicopter',level+1);
    assert.ok(next.damage>previous.damage);assert.ok(next.intervalMs<previous.intervalMs);
  }
  assert.deepEqual(equipmentStats(10,'helicopter'),{passive:75000,tap:450000});
  assert.equal(enhanceEquipment(s,T+1000,'helicopter').reason,'max');
  setEquipmentDeployed(s,false,T+1000,'helicopter');assert.equal(perSecond(s),base);assert.equal(perTap(s),tap);
  assert.deepEqual(parseSave(JSON.stringify(s),T).equipment.helicopter,{level:10,deployed:false, count: 1 });
  assert.equal(new Set(HELICOPTER_STAGES).size,11);
});
test("v9 saves retain schools and assets; old versions cannot inject helicopter and v10 validates it",()=>{
  const old={...army(),version:9,ncoSchoolLevel:5,officerSchoolLevel:1,lieutenants:2};
  delete old.equipment.helicopter;
  old.equipment.tank={level:4,deployed:false};
  const loaded=parseSave(JSON.stringify(old),T);
  assert.equal(loaded.version, 16);assert.equal(loaded.ncoSchoolLevel,5);assert.equal(loaded.lieutenants,2);
  assert.deepEqual(loaded.equipment,{...Object.fromEntries(Object.entries(old.equipment).map(([id, gear]) => [id, gear ? {...gear, count: 1} : null])),helicopter:null});assert.equal(loaded.gold,old.gold);
  old.equipment.helicopter={level:10,deployed:true};
  assert.equal(parseSave(JSON.stringify(old),T).equipment.helicopter,null);
  for(const bad of [undefined,{}, {level:11,deployed:true},{level:1,deployed:1},{level:-1,deployed:true}]) {
    const s=army();s.equipment.helicopter=bad;assert.equal(parseSave(JSON.stringify(s),T),null);
  }
});
test("helicopter enters owned loadouts and fires automatically without changing existing enemy weapons",()=>{
  const s=army();assert.ok(!defaultLoadout(s).equipment.includes('helicopter'));
  buyEquipment(s,T,'helicopter');assert.ok(defaultLoadout(s).equipment.includes('helicopter'));
  let b=createBattle(s,3,{units:{},equipment:['helicopter']});
  assert.deepEqual(b.enemy.equipment.map(g=>g.id),['artillery','tank','selfPropelled']);
  const hp=b.enemy.hq.hp;
  for(let i=0;i<36;i++)b=advanceBattle(b,50);
  assert.equal(b.enemy.hq.hp,hp-equipmentCombatStats('helicopter',0,5120).damage);
  assert.equal(b.player.equipment[0].lastShotMs,1800);
});
test("four deployed equipment silhouettes fit narrow home fields",()=>{
  for(const width of [100,144,180,300]) {
    const items=layoutFieldEquipment(['artillery','tank','selfPropelled','helicopter'].map(id=>({id})),width,140);
    assert.equal(items.length,4);
    items.forEach((p,i)=>{assert.ok(p.x>=0&&p.x+p.width<=width);assert.ok(p.y+p.height<140);if(i)assert.ok(p.x>=items[i-1].x+items[i-1].width);});
  }
});
test("helicopter preview changes each enhancement and reuses the cached sprite",()=>{
  const previous=globalThis.document;let created=0;const surfaces=[];
  const make=()=>{const ops=[];const ctx={setTransform(){},fillRect(...args){ops.push([this.fillStyle,...args]);},clearRect(){},drawImage(){}};const canvas={width:220,height:124,getContext:()=>ctx,ops};surfaces.push(canvas);return canvas;};
  globalThis.document={createElement(){created++;return make();}};
  try {
    const target=make(), signatures=[];
    for(let level=0;level<=10;level++) {
      assert.equal(drawEquipment(target,level,'helicopter'),true);
      signatures.push(JSON.stringify(surfaces.at(-1).ops));
      assert.equal(drawEquipment(target,level,'helicopter'),false);
    }
    assert.equal(new Set(signatures).size,11);assert.equal(created,11);
    drawEquipment(make(),5,'helicopter');assert.equal(created,11);
  } finally {if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
