import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/state.js';
import {layoutFieldWorld} from '../src/field-world.js';
import {FACILITIES} from '../src/facilities.js';
import {EQUIPMENT} from '../src/equipment.js';
import {fieldArmy} from '../src/field-layout.js';
const full=()=>({...freshState(1),soldiers:5242880-3000,sergeants:300,ncoSchoolLevel:5,officerSchoolLevel:5,advancedSchoolLevel:5,
 facilities:FACILITIES.slice(0,10).map(f=>f.id),equipment:Object.fromEntries(Object.keys(EQUIPMENT).map(id=>[id,{level:20,count:1,deployed:true}]))});
test('a small base stays one screen and contains army, school, equipment and facility together',()=>{
 const s={...freshState(1),soldiers:1280,ncoSchoolLevel:1,facilities:['kitchen']};s.equipment.artillery={level:0,count:1,deployed:true};
 const w=layoutFieldWorld(s,160,240);assert.equal(w.width,160);
 for(const kind of ['army','schools','equipment','facilities'])assert.ok(w[kind].length>0&&w[kind].every(i=>i.x+i.width<=160));
});
test('full marshal base uses available height and grows in small width steps, not category pages',()=>{
 const w=layoutFieldWorld(full(),160,330);assert.ok(w.width<=240,'full catalogs must not become separate screens');
 assert.ok(w.width>=160);assert.equal((w.width-160)%8,0);
 for(const kind of ['army','schools','equipment','facilities'])assert.ok(w[kind].some(i=>i.x+i.width<=160),kind+' visible initially');
 const taller=layoutFieldWorld(full(),160,400);assert.ok(taller.width<=w.width);
});
test('expanded equipment catalog prefers modest vertical overflow to sprawling across many screens',()=>{
 for(const width of [144,160,180])for(const height of [320,330]) {
  const w=layoutFieldWorld(full(),width,height);
  assert.ok(w.width<=width*1.5,'a full base stays within one and a half horizontal screens');
  assert.ok(w.height<=height*1.5,'expanded catalog stays within one and a half vertical screens');
  assert.ok(w.army[0].width>=80,'headquarters must not shrink to make room');
  for(const kind of ['schools','facilities','equipment']) {
   const maxColumns=Math.floor((width*1.5-16)/44);
   assert.ok(new Set(w[kind].map(i=>i.y)).size<=Math.max(3,Math.ceil(w[kind].length/maxColumns)));
   assert.ok(w[kind].every(i=>i.boxWidth>=40),'name labels keep readable width');
  }
 }
});
test('all artwork and measured label boxes stay inside the world and do not overlap',()=>{
 for(const width of [144,160,180,240])for(const height of [90,110,160,240,330]){
 const w=layoutFieldWorld(full(),width,height),items=[...w.army,...w.schools,...w.equipment,...w.facilities];
 assert.equal(w.equipment.length,Object.keys(EQUIPMENT).length);assert.equal(w.facilities.length,10);assert.equal(w.schools.length,3);assert.ok(w.army.length>0);
 for(const a of items)assert.ok(a.x>=0&&a.y>=30&&a.x+a.boxWidth<=w.width&&a.y+a.boxHeight<=w.height-8,a.id);
 for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const a=items[i],b=items[j];assert.ok(a.x+a.boxWidth<=b.x||b.x+b.boxWidth<=a.x||a.y+a.boxHeight<=b.y||b.y+b.boxHeight<=a.y,a.id+'/'+b.id);}
 }
});

test('category bands keep troops above schools above facilities above equipment, adding rows for the expanded catalog',()=>{
 const w=layoutFieldWorld(full(),160,330);
 const kinds=['army','schools','facilities','equipment'];
 for(let i=0;i<kinds.length-1;i++)assert.ok(Math.max(...w[kinds[i]].map(x=>x.y+x.boxHeight))<Math.min(...w[kinds[i+1]].map(x=>x.y)),kinds[i]+' above '+kinds[i+1]);
 for(const kind of ['facilities','equipment'])assert.ok(new Set(w[kind].map(i=>i.y)).size>=2&&new Set(w[kind].map(i=>i.y)).size<=4);
 assert.ok(w.army[0].width>=w.facilities[0].width*1.6);
});

test('crowded support bands shrink by category and taller views can use three rows',()=>{
 const sparse={...full(),facilities:['kitchen'],equipment:{...freshState(1).equipment,artillery:{level:0,count:1,deployed:true}}};
 const few=layoutFieldWorld(sparse,160,330),many=layoutFieldWorld(full(),160,330),tall=layoutFieldWorld(full(),160,600);
 for(const kind of ['facilities','equipment']){assert.ok(many[kind][0].width<few[kind][0].width);assert.ok(new Set(tall[kind].map(x=>x.y)).size>=2&&new Set(tall[kind].map(x=>x.y)).size<=4);}
 assert.ok(many.army[0].width>=80,'headquarters keeps its large silhouette');
});

test('narrow galactic endgame adds an army row instead of shrinking the largest headquarters into a small icon',()=>{
 const s={...freshState(1),soldiers:5000,sergeants:300,galacticMarshals:250,
  ncoSchoolLevel:5,officerSchoolLevel:5,advancedSchoolLevel:5,commandSchoolLevel:5,galacticSchoolLevel:5,
  facilities:FACILITIES.map(f=>f.id),facilityLevels:Object.fromEntries(FACILITIES.map(f=>[f.id,20])),
  equipment:Object.fromEntries(Object.keys(EQUIPMENT).map(id=>[id,{level:30,count:1,deployed:true}]))};
 const expected=fieldArmy(s).groups;
 for(const width of [140,144,160,195,220,300]){
  const world=layoutFieldWorld(s,width,170),items=[...world.army,...world.schools,...world.facilities,...world.equipment];
  assert.equal(world.army[0].id,'galacticGrandAlliedArmy');
  assert.equal(world.army[0].width,84,'largest galactic building keeps its native display width');
  assert.ok(world.width<=width*1.5,'vertical growth preserves modest horizontal scrolling');
  assert.equal(world.schools.length,5);assert.equal(world.facilities.length,19);assert.equal(world.equipment.length,17);
  for(const group of expected)assert.equal(world.army.filter(f=>f.id===group.id).reduce((sum,f)=>sum+f.count,0),group.count,'compact labels preserve every visible formation count');
  for(const a of items)assert.ok(a.x>=0&&a.y>=30&&a.x+a.boxWidth<=world.width&&a.y+a.boxHeight<=world.height-8,a.id);
  for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
   const a=items[i],b=items[j];assert.ok(a.x+a.boxWidth<=b.x||b.x+b.boxWidth<=a.x||a.y+a.boxHeight<=b.y||b.y+b.boxHeight<=a.y,a.id+'/'+b.id);
  }
  if(width===140)assert.ok(new Set(world.army.map(f=>f.y)).size>=2,'lower commands get their own row');
 }
});
