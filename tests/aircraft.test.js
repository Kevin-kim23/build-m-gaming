import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../src/game.js';
import { advanceBattle, equipmentCombatStats, UNIT_TRAITS } from '../src/battle.js';
import { quietBattle, until, deployNow } from './lane-helpers.js';
import { drawEquipment } from '../src/equipment-art.js';
import { EQUIPMENT } from '../src/equipment.js';
const T=1_800_000_000_000;
function supplyBattle(level=0,count=1){
  const s={...freshState(T),soldiers:78920,sergeants:300,ncoSchoolLevel:1,campaignCleared:80};
  s.equipment.transport={level,count,deployed:true};s.equipment.tank={level:5,count:1,deployed:true};
  return quietBattle(s,1,['transport','tank']);
}
test('transport heals damaged friendly units by 12% on its interval, never overheals (the medic itself has no attack)',()=>{
  let b=deployNow(supplyBattle(),'tank');b=deployNow(b,'transport');
  const medic=b.player.units.find(u=>u.id==='transport'),maxHp=b.player.units.find(u=>u.id==='tank').maxHp;
  assert.equal(medic.damage,0);assert.ok(medic.healing>0);
  b.player.units.find(u=>u.id==='tank').hp=maxHp*.5;
  const wait=medic.nextShotMs;
  b=until(b,wait-50);assert.equal(b.player.units.find(u=>u.id==='tank').hp,maxHp*.5);
  b=advanceBattle(b,50);assert.ok(Math.abs(b.player.units.find(u=>u.id==='tank').hp-maxHp*.62)<1e-6);
  for(let i=0;i<600;i++)b=advanceBattle(b,50);
  assert.ok(b.player.units.every(u=>u.hp<=u.maxHp+1e-9),'no overheal');
});
test('transport counts and upgrades improve healing amount and rate',()=>{
  const one=equipmentCombatStats('transport',0,81920),three=equipmentCombatStats('transport',20,81920,3);
  assert.ok(three.healing>one.healing*3);assert.ok(three.intervalMs<one.intervalMs);
  assert.equal(UNIT_TRAITS.transport.kind,'heal');
});
test('fighter is an air unit whose attack scales with copies and every upgrade through twenty improves aircraft effects',()=>{
  for(const id of ['transport','fighter']){
    let before=equipmentCombatStats(id,0);
    for(let level=1;level<=20;level++){
      const after=equipmentCombatStats(id,level);assert.ok((after.healing??after.damage)>(before.healing??before.damage));
      assert.ok(after.intervalMs<=before.intervalMs);before=after;
    }
  }
  const s={...freshState(T),soldiers:78920,sergeants:300,campaignCleared:80};s.equipment.fighter={level:20,count:2,deployed:false};
  const b=deployNow(quietBattle(s,1,['fighter']),'fighter'),u=b.player.units[0],stats=equipmentCombatStats('fighter',20,81920,2);
  assert.equal(u.cls,'air');assert.equal(u.count,2);assert.equal(u.damage,stats.damage);assert.equal(u.intervalMs,stats.intervalMs);
});
test('all equipment stages have cached sprites and fit the preview including glowing upgrades',()=>{
  const previous=globalThis.document;
  const make=()=>{
    const ops=[],draws=[],ctx={setTransform(){},clearRect(){},fillRect(...args){ops.push([this.fillStyle,...args]);},drawImage(...args){draws.push(args);}};
    return {width:440,height:248,ops,draws,getContext:()=>ctx};
  };
  globalThis.document={createElement:make};
  try{
    for(const id of Object.keys(EQUIPMENT)){
      const sources=new Set(),signatures=new Set();
      for(let level=0;level<=20;level++){
        const target=make();drawEquipment(target,level,id);const [source,x,y,w,h]=target.draws.at(-1);
        assert.ok(x>=0&&y>=0&&x+w<=440&&y+h<=248);sources.add(source);
        signatures.add(JSON.stringify(source.ops));
        const again=make();drawEquipment(again,level,id);assert.equal(again.draws.at(-1)[0],source);
        if(['transport','fighter','railgunTank','icbm'].includes(id)||level>10)for(const [,x,y,w,h]of source.ops)assert.ok(x>=0&&y>=0&&w>=0&&h>=0&&x+w<=110&&y+h<=62,`${id} +${level} ${x},${y},${w},${h}`);
      }
      assert.equal(sources.size,21);assert.equal(signatures.size,21);
    }
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
