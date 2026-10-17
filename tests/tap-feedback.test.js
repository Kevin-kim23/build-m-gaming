import test from 'node:test';
import assert from 'node:assert/strict';
import {tapFeedback} from '../src/tap-feedback.js';

function fixture() {
  const originalDocument=globalThis.document, originalTimeout=globalThis.setTimeout;
  const children=[],timers=[],animations=[],query={matches:false};
  let cancelled=0,mediaQueries=0;
  const view={matchMedia(){mediaQueries++;return query;}};
  const zone={ownerDocument:{defaultView:view},getBoundingClientRect:()=>({width:320,height:400,left:10,top:20}),
    querySelectorAll:s=>children.filter(n=>n.className.split(' ').includes(s.slice(1))),appendChild:n=>children.push(n)};
  const gold={animate(frames,options){animations.push({frames,options});return {cancel(){cancelled++;}};},
    get offsetWidth(){throw Error('Wallet layout must not be forced.');}};
  globalThis.document={createElement:()=>({style:{},attrs:{},setAttribute(k,v){this.attrs[k]=v;},remove(){const i=children.indexOf(this);if(i>=0)children.splice(i,1);}})};
  globalThis.setTimeout=fn=>{timers.push(fn);return timers.length;};
  return {zone,gold,children,timers,animations,query,get cancelled(){return cancelled;},get mediaQueries(){return mediaQueries;},
    restore(){globalThis.document=originalDocument;globalThis.setTimeout=originalTimeout;}};
}

test('rapid taps bound transient effects, replace wallet animation and remove every effect',()=>{
  const f=fixture();try {
    for(let i=0;i<80;i++)tapFeedback(f.zone,f.gold,{detail:1,clientX:100,clientY:120},9007199254740993n);
    assert.equal(f.zone.querySelectorAll('.gold-float').length,15);
    assert.equal(f.zone.querySelectorAll('.tap-impact').length,6);
    assert.equal(f.cancelled,79);assert.equal(f.mediaQueries,1);
    assert.ok(f.children.every(n=>n.attrs['aria-hidden']==='true'));
    assert.ok(f.animations.every(a=>a.options.duration<=300 && !a.options.iterations));
    for(const end of f.timers)end();assert.equal(f.children.length,0);
  } finally {f.restore();}
});

test('a changed motion preference is respected without listener duplication or moving effects',()=>{
  const f=fixture();try {
    for(let i=0;i<4;i++)tapFeedback(f.zone,f.gold,{detail:0},1);
    f.query.matches=true;
    const impacts=f.zone.querySelectorAll('.tap-impact').length;
    tapFeedback(f.zone,f.gold,{detail:0},2);
    assert.equal(f.zone.querySelectorAll('.tap-impact').length,impacts);
    const labels=f.zone.querySelectorAll('.gold-float');assert.equal(labels.length,1);
    assert.ok(labels[0].className.includes('gold-float-still'));
    assert.equal(labels[0].style.left,'160px');
    const last=f.animations.at(-1);assert.ok(last.frames.every(k=>!k.transform));
    assert.deepEqual(last.frames[0],last.frames.at(-1));assert.equal(f.mediaQueries,1);
  } finally {f.restore();}
});

test('edge taps stay in the field and feedback works without the animation API',()=>{
  const f=fixture();try {
    tapFeedback(f.zone,{}, {detail:1,clientX:-100,clientY:1000},1);
    const label=f.zone.querySelectorAll('.gold-float')[0];
    assert.equal(label.style.left,'40px');assert.equal(label.style.top,'375px');
    assert.equal(label.textContent,'+1 G');
  } finally {f.restore();}
});
