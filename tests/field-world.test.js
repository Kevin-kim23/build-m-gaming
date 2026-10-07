import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/game.js';
import {FACILITIES} from '../src/facilities.js';
import {EQUIPMENT} from '../src/equipment.js';
import {fieldPages,layoutFieldWorld} from '../src/field-world.js';
import {createFieldGesture} from '../src/field-gesture.js';
import {createFieldNavigation} from '../src/field-navigation.js';
const full=()=>({...freshState(1),soldiers:90000000,sergeants:300,ncoSchoolLevel:5,officerSchoolLevel:5,advancedSchoolLevel:5,
  facilities:FACILITIES.map(f=>f.id),equipment:Object.fromEntries(Object.keys(EQUIPMENT).map(id=>[id,{level:20,count:1,deployed:true}]))});

test('the horizontal world grows only as items are acquired, including all nine equipment and ten facilities',()=>{
  assert.equal(fieldPages(freshState(1)).length,1);
  const s=full(),pages=fieldPages(s);assert.equal(pages.length,7);
  assert.deepEqual(pages.flatMap(p=>p.items).map(i=>i.id),[...Object.keys(EQUIPMENT),...FACILITIES.map(f=>f.id)]);
});

test('every sprite and label fits a horizontal page on narrow or short screens without overlap',()=>{
  for(const width of [144,160,180,240])for(const height of [90,110,160,240]) {
    const world=layoutFieldWorld(full(),width,height);
    assert.equal(world.equipment.length,9);assert.equal(world.facilities.length,10);
    for(const item of [...world.equipment,...world.facilities]){
      const page=Math.floor(item.x/width),localX=item.x-page*width;
      assert.ok(localX>=0&&localX+item.width<=width);
      assert.ok(item.y>=16&&item.y+item.height+14<=height-20,`${item.id} at ${width}x${height}`);
    }
    const items=[...world.equipment,...world.facilities];
    for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
      const a=items[i],b=items[j];
      assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height+14<=b.y||b.y+b.height+14<=a.y);
    }
    assert.ok(world.army.length>0);
    for(const school of world.schools)assert.ok(school.y+school.height+14<=height-22,'school labels stay above navigation');
  }
});

test('four independent fingers can tap; swipe, cancel, extra fingers and scroll cannot award gold',()=>{
  const g=createFieldGesture();for(let i=0;i<4;i++)assert.equal(g.down(i,20,20,0),true);
  assert.equal(g.down(4,20,20,0),false);
  for(let i=0;i<4;i++)assert.equal(g.up(i,22,21),true);
  assert.equal(g.up(4,20,20),false);
  g.down(1,20,20,1);g.down(2,20,20,1);g.move(1,50,20);
  assert.equal(g.up(1,20,20),false);assert.equal(g.up(2,20,20),false);
  g.down(1,20,20,2);g.cancel(1);assert.equal(g.up(1,20,20),false);
  g.down(1,20,20,3);g.scroll();assert.equal(g.up(1,20,20),false);
  g.down(1,20,20,4);g.clear();assert.equal(g.up(1,20,20),false);
});

function element(){const events={};return {events,disabled:false,scrollLeft:0,clientWidth:320,style:{setProperty(){}},parentElement:{},addEventListener(type,fn){events[type]=fn;},scrollTo({left}){this.scrollLeft=left;this.events.scroll?.();},setPointerCapture(){}};}
test('navigation preserves tap/keyboard access, swipes by mouse, and changes pages without awarding gold',()=>{
  const viewport=element(),zone=element(),previous=element(),next=element(),label=element();let earned=0;
  const ui=createFieldNavigation({viewport,zone,previous,next,label,earnTap:()=>earned++});
  ui.sync(full());assert.equal(zone.style.width,'2240px');assert.equal(previous.disabled,true);
  next.events.click();assert.equal(viewport.scrollLeft,320);assert.match(label.textContent,/장비 1/);assert.equal(earned,0);
  const event={pointerId:1,clientX:100,clientY:60,pointerType:'mouse',button:0,timeStamp:1};
  zone.events.pointerdown(event);zone.events.pointerup(event);assert.equal(earned,1);
  zone.events.pointerdown({...event,timeStamp:2});zone.events.pointermove({...event,clientX:50});zone.events.pointerup({...event,clientX:50});assert.equal(viewport.scrollLeft,370);assert.equal(earned,1);
  zone.events.click({detail:1});assert.equal(earned,1);zone.events.click({detail:0});assert.equal(earned,2);
  zone.disabled=true;zone.events.pointerdown(event);zone.events.pointerup(event);zone.events.click({detail:0});assert.equal(earned,2);
  zone.disabled=false;zone.events.pointerdown(event);ui.clear();zone.events.pointerup(event);assert.equal(earned,2);
});

test('resize keeps the same map region and a growing equipment catalog preserves the facilities page',()=>{
  const viewport=element(),zone=element(),previous=element(),next=element(),label=element();
  const ui=createFieldNavigation({viewport,zone,previous,next,label,earnTap:()=>{throw Error('navigation must not earn gold');}});
  const state=full();state.equipment.icbm.deployed=false;ui.sync(state);
  viewport.scrollLeft=960;viewport.events.scroll();assert.match(label.textContent,/시설 1/);
  state.equipment.icbm.deployed=true;ui.sync(state);assert.equal(viewport.scrollLeft,1280);assert.match(label.textContent,/시설 1/);
  viewport.clientWidth=400;ui.sync(state);assert.equal(viewport.scrollLeft,1600);assert.match(label.textContent,/시설 1/);
});
