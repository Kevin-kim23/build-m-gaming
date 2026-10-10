import test from 'node:test';
import assert from 'node:assert/strict';
import { GALACTIC_EQUIPMENT } from '../src/galactic-equipment.js';
import { drawEquipment, drawEquipmentOnGround } from '../src/equipment-art.js';
import { unitSprite } from '../src/unit-sprites.js';
import { galacticEquipmentSprite, drawOverheadGalacticEquipment } from '../src/galactic-equipment-art.js';

function canvas(){
  const ops=[],draws=[],c={setTransform(){},clearRect(){},fillRect(...rect){ops.push([this.fillStyle,...rect]);},drawImage(...args){draws.push(args);}};
  return {width:330,height:186,ops,draws,getContext:()=>c};
}
function bounds(ops,width,height,id){
  for(const [,x,y,w,h] of ops)assert.ok([x,y,w,h].every(Number.isFinite)&&x>=0&&y>=0&&w>0&&h>0&&x+w<=width&&y+h<=height,`${id}: ${x},${y},${w},${h}`);
}
test('all five galactic weapons retain original distinct home and overhead shapes at all31 enhancements',()=>{
  const previous=globalThis.document;globalThis.document={createElement:canvas};
  try{
    const homes=new Set(),overheads=new Set();
    for(const id of Object.keys(GALACTIC_EQUIPMENT)){
      const upgrades=new Set(),battleUpgrades=new Set();
      for(let level=0;level<=30;level++){
        const portrait=canvas();assert.equal(drawEquipment(portrait,level,id),true);
        const asset=portrait.draws.at(-1)[0];bounds(asset.ops,110,62,`${id}+${level}`);
        assert.equal(drawEquipment(portrait,level,id),false);
        const ground=canvas();drawEquipmentOnGround(ground.getContext('2d'),level,0,0,48,26,id);
        assert.equal(ground.draws[0][0],asset,'shop and field reuse one cached source');
        const ally=unitSprite(id,'player',level),enemy=unitSprite(id,'enemy',level);
        assert.equal(unitSprite(id,'player',level),ally);
        bounds(ally.ops,56,68,id);bounds(enemy.ops,56,68,id);
        assert.notDeepEqual(ally.ops,enemy.ops);
        assert.ok(ally.ops.some(([color])=>color==='#688768'));
        assert.ok(enemy.ops.some(([color])=>color==='#bc8480'));
        upgrades.add(JSON.stringify(asset.ops));battleUpgrades.add(JSON.stringify(ally.ops));
        if(level===0){homes.add(JSON.stringify(asset.ops));overheads.add(JSON.stringify(ally.ops));}
      }
      assert.equal(upgrades.size,31);assert.equal(battleUpgrades.size,31);
    }
    assert.equal(homes.size,5);assert.equal(overheads.size,5);
    assert.throws(()=>galacticEquipmentSprite(0,'unknown'),/Unknown/);
    assert.throws(()=>drawOverheadGalacticEquipment(canvas().getContext('2d'),0,{},'unknown'),/Unknown/);
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('redesigned missile and orbital cannon remain bounded and readable in both battle palettes at every level',()=>{
  const previous=globalThis.document;globalThis.document={createElement:canvas};
  try{
    for(const side of ['player','enemy'])for(let level=0;level<=30;level++){
      const missile=unitSprite('icbm',side,level),cannon=unitSprite('orbitalAssault',side,level);
      bounds(missile.ops,56,68,'missile');bounds(cannon.ops,56,68,'orbital cannon');
      assert.notDeepEqual(missile.ops,cannon.ops);
      assert.ok(missile.ops.some(([color])=>color==='#ac654a'),'warhead has its own copper warning band');
      assert.ok(cannon.ops.some(([,x,y,w,h])=>y<=3&&w>=18&&h>=6),'wide cannon muzzle differs from a narrow rocket nose');
      assert.equal(unitSprite('icbm',side,level),missile);assert.equal(unitSprite('orbitalAssault',side,level),cannon);
    }
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
