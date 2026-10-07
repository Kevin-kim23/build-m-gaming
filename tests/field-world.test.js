import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/game.js';
import {FACILITIES} from '../src/facilities.js';
import {EQUIPMENT} from '../src/equipment.js';
import {layoutFieldWorld} from '../src/field-world.js';
import {createFieldGesture} from '../src/field-gesture.js';
import {createFieldNavigation} from '../src/field-navigation.js';
const full=()=>({...freshState(1),soldiers:90000000,sergeants:300,ncoSchoolLevel:5,officerSchoolLevel:5,advancedSchoolLevel:5,
  facilities:FACILITIES.map(f=>f.id),equipment:Object.fromEntries(Object.keys(EQUIPMENT).map(id=>[id,{level:20,count:1,deployed:true}]))});

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

function element(){const events={};return {events,disabled:false,scrollLeft:0,clientWidth:320,clientHeight:400,style:{setProperty(){}},parentElement:{},addEventListener(type,fn){events[type]=fn;},scrollTo({left}){this.scrollLeft=left;this.events.scroll?.();},setPointerCapture(){}};}
test('continuous scrolling retains tap/keyboard access and never rewards a swipe',()=>{
  const viewport=element(),zone=element(),hint=element();let earned=0;
  const ui=createFieldNavigation({viewport,zone,hint,earnTap:()=>earned++});
  const world=ui.sync(full());assert.equal(zone.style.width,`${world.width*2}px`);assert.equal(hint.hidden,false);
  zone.events.keydown({key:'ArrowRight',preventDefault(){}});assert.equal(viewport.scrollLeft,80);assert.equal(earned,0);
  const event={pointerId:1,clientX:100,clientY:60,pointerType:'mouse',button:0,timeStamp:1};
  zone.events.pointerdown(event);zone.events.pointerup(event);assert.equal(earned,1);
  zone.events.pointerdown({...event,timeStamp:2});zone.events.pointermove({...event,clientX:50});zone.events.pointerup({...event,clientX:50});assert.equal(viewport.scrollLeft,130);assert.equal(earned,1);
  zone.events.click({detail:1});assert.equal(earned,1);zone.events.click({detail:0});assert.equal(earned,2);
  zone.disabled=true;zone.events.pointerdown(event);zone.events.pointerup(event);zone.events.click({detail:0});assert.equal(earned,2);
  zone.disabled=false;zone.events.pointerdown(event);ui.clear();zone.events.pointerup(event);assert.equal(earned,2);
});
test('layout changes retain a valid scroll offset and a small army needs no scrolling',()=>{
  const viewport=element(),zone=element(),hint=element();const ui=createFieldNavigation({viewport,zone,hint,earnTap(){}});
  ui.sync(full());viewport.scrollLeft=100;ui.sync(full());assert.equal(viewport.scrollLeft,100);
  viewport.clientWidth=480;ui.sync(full());assert.ok(viewport.scrollLeft<=Number.parseFloat(zone.style.width)-480);
  ui.sync(freshState(1));assert.equal(viewport.scrollLeft,0);assert.equal(hint.hidden,true);assert.equal(zone.style.width,'480px');
});
