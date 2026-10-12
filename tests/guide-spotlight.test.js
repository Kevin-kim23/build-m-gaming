import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuideSpotlight} from '../src/guide-spotlight.js';

test('spotlight batches layout, suspends for other dialogs and restores the original button',()=>{
  const oldResize=global.ResizeObserver,oldMutation=global.MutationObserver;
  const observers=[];
  class Observer {constructor(cb){this.cb=cb;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}}
  global.ResizeObserver=global.MutationObserver=Observer;
  const events=new Map(),queue=new Map();let serial=0,layouts=0,blocked=false;
  const rect={left:20,right:300,top:410,bottom:454,width:280,height:44};
  const element=()=>({style:{},textContent:'',addEventListener(){},removeAttribute(k){delete this[k];},setAttribute(k,v){this[k]=v;},getAttribute(k){return this[k]??null;}});
  const target={...element(),getClientRects:()=>[rect],getBoundingClientRect:()=>{layouts++;return rect;},scrollIntoView(){},focus(){doc.activeElement=this;}};
  target.setAttribute('aria-describedby','existing-help');
  const title=element(),text=element(),later={...element(),focus(){doc.activeElement=this;}},shades=Array.from({length:4},element),ring=element();
  const bubble={...element(),querySelector:s=>s==='h2'?title:text,getBoundingClientRect:()=>({height:180})};
  const root={...element(),open:false,matches(){return this.open;},showPopover(){this.open=true;},hidePopover(){this.open=false;},remove(){this.removed=true;},
    querySelectorAll:()=>shades,querySelector:s=>s==='.guide-ring'?ring:s==='.guide-dialogue'?bubble:later};
  const body={append(n){n.parentElement=this;}};
  const doc={body,hidden:false,createElement:()=>root,activeElement:null,
    querySelectorAll:()=>blocked?[{id:'promotion'}]:[],
    querySelector:s=>s==='#open-shop'?target:null,
    addEventListener(name,cb){events.set(name,cb);},removeEventListener(name){events.delete(name);}};
  const win={innerWidth:320,innerHeight:480,getComputedStyle:()=>({getPropertyValue:()=>0}),
    requestAnimationFrame(cb){queue.set(++serial,cb);return serial;},cancelAnimationFrame(id){queue.delete(id);},addEventListener(){},removeEventListener(){}};
  const flush=()=>{const jobs=[...queue.values()];queue.clear();jobs.forEach(cb=>cb());};
  try {
    const ui=createGuideSpotlight({doc,win,onLater(){}}),lesson={id:'school',ready:true,panel:'shop',text:'학교',title:'학교'};
    ui.sync(lesson);flush();assert.equal(root.open,true);assert.equal(target.getAttribute('aria-describedby'),'existing-help guide-dialogue-text');
    const count=layouts;
    for(let i=0;i<300;i++)ui.sync({...lesson});
    assert.equal(queue.size,0);assert.equal(layouts,count,'unchanged gold ticks must not measure layout');
    for(let i=0;i<30;i++)ui.refresh();assert.equal(queue.size,1);flush();
    blocked=true;ui.refresh();flush();assert.equal(root.open,false);assert.equal(target.getAttribute('aria-describedby'),'existing-help');
    blocked=false;ui.refresh();flush();assert.equal(root.open,true);
    ui.sync(lesson,false);flush();assert.equal(root.open,false);
    for(let i=0;i<300;i++)ui.refresh();assert.equal(queue.size,0,'inactive guides do not schedule frames on taps');
    ui.destroy();assert.equal(root.removed,true);assert.ok(observers.every(o=>o.disconnected));assert.equal(events.size,0);
  }finally{global.ResizeObserver=oldResize;global.MutationObserver=oldMutation;}
});
