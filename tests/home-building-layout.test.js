import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/game.js';
import {FORMATIONS} from '../src/formations.js';
import {fieldArmy} from '../src/field-layout.js';
import {layoutHomeField} from '../src/home-field-layout.js';
import {SCHOOLS} from '../src/schools.js';
import {EQUIPMENT,deployedEquipment} from '../src/equipment.js';
import {UNITS,armyPower,troopIncome} from '../src/units.js';

const viewports=[[160,120],[160,156],[180,220],[206,300],[320,240]];
function stateFor({soldiers=0,school=0,gear=0,maximum=false}={}) {
  const state=freshState(1000);state.soldiers=soldiers;
  if(maximum)state[Object.values(UNITS).at(-1).field]=64;
  let remaining=school;
  for(const definition of Object.values(SCHOOLS)){
    state[definition.field]=Math.min(remaining,definition.maxLevel);
    remaining-=state[definition.field];
  }
  state.equipment=Object.fromEntries(Object.keys(EQUIPMENT).slice(0,gear)
    .map(id=>[id,{level:10,count:1,deployed:true}]));
  return state;
}

// Snapshot of the former layout's size calculation, independent of new placement.
function previousHeadquartersSize(state,width,height,schoolLevel) {
  const largest=fieldArmy(state).largest,count=deployedEquipment(state).length;
  const columns=Math.max(1,Math.min(7,Math.ceil(count/3))),rows=Math.ceil(count/columns);
  const armyHeight=Math.max(1,height-Math.min(42,height*.24)-5
    -(schoolLevel?Math.min(30,height*.16):0)-(count?Math.min(rows*25,height*.30):0)-6);
  const scale=Math.min((width-20)/largest.width,Math.max(1,armyHeight-12)/largest.height,1.65);
  return {width:largest.width*scale,height:largest.height*scale};
}

function footprint(item,kind) {
  const width=kind==='army'?(item.labelWidth??item.boxWidth):(item.boxWidth??item.width);
  const x=kind==='army'?(item.labelX??item.x):item.x+(item.width-width)/2;
  return {x,y:item.y,width,height:kind==='equipment'?item.height+9:(item.boxHeight??item.height)};
}
function overlaps(a,b) {
  return a.x<b.x+b.width-.01&&b.x<a.x+a.width-.01&&a.y<b.y+b.height-.01&&b.y<a.y+a.height-.01;
}

test('headquarters keeps exactly 70% of its former width and height for every formation and viewport',()=>{
  const soldierCounts=FORMATIONS.filter(f=>!UNITS[f.id]&&Number.isSafeInteger(f.size)).map(f=>f.size);
  for(const soldiers of soldierCounts)for(const school of [0,1,15,30])for(const gear of [0,1,17]){
    const state=stateFor({soldiers,school,gear});
    for(const [width,height] of viewports){
      const old=previousHeadquartersSize(state,width,height,school),world=layoutHomeField(state,width,height);
      const headquarters=world.army[0];assert.equal(world.army.length,1);
      assert.ok(Math.abs(headquarters.width-old.width*.7)<1e-9);
      assert.ok(Math.abs(headquarters.height-old.height*.7)<1e-9);
      assert.ok(headquarters.x+headquarters.width/2<width/2);
      if(school){
        const campus=world.schools[0];
        assert.ok(campus.x>width/2);
        assert.ok(campus.width<=width*.3);
        assert.ok(Math.abs(campus.y-Math.max(headquarters.y,headquarters.y+headquarters.height-campus.height))<1e-9);
      }
    }
  }
});

test('early troops, the academy and the largest headquarters fit without label, action or gear overlap',()=>{
  for(const soldiers of [0,1,4,8,19,20,40,79,80,320,1280])for(const school of [0,1,15,30])for(const gear of [0,1,17]){
    for(const maximum of [false,true]){
      const state=stateFor({soldiers,school,gear,maximum});
      for(const [width,height] of viewports){
        const world=layoutHomeField(state,width,height);
        assert.equal(world.width,width);assert.equal(world.height,height);
        assert.equal(world.schools.length,school?1:0);assert.equal(world.facilities.length,0);
        assert.equal(world.equipment.length,gear);
        const boxes=['army','schools','equipment'].flatMap(kind=>world[kind].map(item=>footprint(item,kind==='schools'?'school':kind)));
        for(const box of boxes){
          assert.ok(box.x>=0&&box.y>=42,JSON.stringify(box));
          assert.ok(box.x+box.width<=width+.01&&box.y+box.height<=height+.01,JSON.stringify(box));
        }
        for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)
          assert.equal(overlaps(boxes[i],boxes[j]),false,JSON.stringify({soldiers,school,gear,maximum,width,height,a:boxes[i],b:boxes[j]}));
        if(!maximum&&soldiers<20){
          assert.equal(world.army.reduce((sum,item)=>sum+item.count,0),soldiers);
          for(const unit of world.army)assert.ok(unit.width<=UNITS[unit.id].width&&unit.height<=UNITS[unit.id].height);
        }
      }
    }
  }
});

test('condensing the home is presentation only and preserves all ownership and income',()=>{
  const state=stateFor({soldiers:19,school:30,gear:17,maximum:true});
  state.sergeants=321;state.staffSergeants=432;
  const before=structuredClone(state),power=armyPower(state),passive=troopIncome(state,'passive'),tap=troopIncome(state,'tap');
  for(const [width,height] of viewports)layoutHomeField(state,width,height);
  assert.deepEqual(state,before);assert.equal(armyPower(state),power);
  assert.equal(troopIncome(state,'passive'),passive);assert.equal(troopIncome(state,'tap'),tap);
});

 test('two secondary buildings sit side by side above the academy, smaller than the campus',()=>{
  const size=id=>FORMATIONS.find(f=>f.id===id).size;
  for(const [width,height] of viewports)for(const gear of [0,17]){
    const s=stateFor({soldiers:3*size('corps')+3*size('division')+2*size('regiment'),school:15,gear});
    const w=layoutHomeField(s,width,height),[main,a,b]=w.army,campus=w.schools[0];
    assert.equal(a.y,b.y);assert.ok(a.x>main.x+main.width);
    assert.ok(a.x+a.width<b.x);
    for(const item of [a,b]){
      assert.ok(item.y+item.boxHeight<=campus.y);
      assert.ok(item.width<=campus.width);
    }
    assert.ok(campus.y+campus.boxHeight<=height);
  }
 });

test('academy keeps the same readable footprint at early and late ranks',()=>{
 for(const [width,height] of [[160,220],[180,250],[240,300]]){
  const early=layoutHomeField(stateFor({soldiers:20,school:1}),width,height).schools[0];
  for(const soldiers of [20,80,320,81920])for(const school of [1,5,10,15,30]){
   const campus=layoutHomeField(stateFor({soldiers,school}),width,height).schools[0];
   assert.equal(campus.width,early.width);assert.equal(campus.height,early.height);
   assert.ok(campus.width>=width*.23);
  }
 }
});
