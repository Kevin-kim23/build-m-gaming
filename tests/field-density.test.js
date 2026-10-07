import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/state.js';
import {layoutFieldWorld} from '../src/field-world.js';
import {FACILITIES} from '../src/facilities.js';
import {EQUIPMENT} from '../src/equipment.js';
const full=()=>({...freshState(1),soldiers:5242880-3000,sergeants:300,ncoSchoolLevel:5,officerSchoolLevel:5,advancedSchoolLevel:5,
 facilities:FACILITIES.map(f=>f.id),equipment:Object.fromEntries(Object.keys(EQUIPMENT).map(id=>[id,{level:20,count:1,deployed:true}]))});
test('a small base stays one screen and contains army, school, equipment and facility together',()=>{
 const s={...freshState(1),soldiers:1280,ncoSchoolLevel:1,facilities:['kitchen']};s.equipment.artillery={level:0,count:1,deployed:true};
 const w=layoutFieldWorld(s,160,240);assert.equal(w.width,160);
 for(const kind of ['army','schools','equipment','facilities'])assert.ok(w[kind].length>0&&w[kind].every(i=>i.x+i.width<=160));
});
test('full marshal base uses available height and grows in small width steps, not category pages',()=>{
 const w=layoutFieldWorld(full(),160,330);assert.ok(w.width<=240,'22 assets must not become seven screens');
 assert.ok(w.width>=160);assert.equal((w.width-160)%8,0);
 for(const kind of ['army','schools','equipment','facilities'])assert.ok(w[kind].some(i=>i.x+i.width<=160),kind+' visible initially');
 const taller=layoutFieldWorld(full(),160,400);assert.ok(taller.width<=w.width);
});
test('all artwork and measured label boxes stay inside the world and do not overlap',()=>{
 for(const width of [144,160,180,240])for(const height of [90,110,160,240,330]){
 const w=layoutFieldWorld(full(),width,height),items=[...w.army,...w.schools,...w.equipment,...w.facilities];
 assert.equal(w.equipment.length,9);assert.equal(w.facilities.length,10);assert.equal(w.schools.length,3);assert.ok(w.army.length>0);
 for(const a of items)assert.ok(a.x>=0&&a.y>=30&&a.x+a.boxWidth<=w.width&&a.y+a.boxHeight<=height-8,a.id);
 for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const a=items[i],b=items[j];assert.ok(a.x+a.boxWidth<=b.x||b.x+b.boxWidth<=a.x||a.y+a.boxHeight<=b.y||b.y+b.boxHeight<=a.y,a.id+'/'+b.id);}
 }
});
