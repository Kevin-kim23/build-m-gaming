import test from 'node:test';
import assert from 'node:assert/strict';
import { RANKS } from '../src/ranks.js';
import { createPersonalAwardUI } from '../src/personal-awards.js';

let moduleNumber = 0;
async function fixture(run) {
  const prior = {document:global.document,setTimeout:global.setTimeout,clearTimeout:global.clearTimeout};
  const dialogs = [], rootEvents = new Map(), pending = new Map();
  let nextTimer = 0;
  const root = {
    hidden:false,
    body:{appendChild(dialog){dialogs.push(dialog);}},
    addEventListener(type, listener){rootEvents.set(type, listener);},
    querySelector(){return dialogs.find(dialog => dialog.className === 'promotion-layer' && dialog.open) ?? null;},
    createElement() {
      const listeners = new Map();
      return {
        open:false, shown:0, listeners, attributes:{}, style:{setProperty(){}},
        classList:{toggle(){}}, setAttribute(name,value){this.attributes[name]=value;},
        addEventListener(type,listener){assert.ok(!listeners.has(type));listeners.set(type,listener);},
        showModal(){this.open=true;this.shown++;},
        close(){if (!this.open) return;this.open=false;rootEvents.get('close')?.();listeners.get('close')?.();},
      };
    },
  };
  function dispatch(dialog,type,values={}) {
    const event={key:'',repeat:false,prevented:false,stopped:false,target:{closest:()=>null},
      preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...values};
    dialog.listeners.get(type)?.(event);
    return event;
  }
  global.document=root;
  global.setTimeout=(callback,ms)=>{pending.set(++nextTimer,{callback,ms});return nextTimer;};
  global.clearTimeout=id=>pending.delete(id);
  const api=await import(`../src/promotion.js?dismiss-test=${moduleNumber++}`);
  try { await run({root,dialogs,pending,dispatch,...api}); }
  finally { api.hidePromotion();Object.assign(global,prior); }
}

test('every rank, including enlisted badges, dismisses from any point only after the click completes', async()=>{
  await fixture(({dialogs,pending,dispatch,showPromotion})=>{
    for (const [rank,name] of RANKS.entries()) {
      showPromotion(rank,()=>'<span>계급장</span>');
      const layer=dialogs[0];
      assert.match(layer.innerHTML,/data-dismiss-promotion/,`${name}: accessible skip button`);
      assert.equal(dispatch(layer,'pointerdown',{pointerId:1}).stopped,true);
      assert.equal(layer.open,true,`${name}: no close on pointerdown`);
      assert.equal(dispatch(layer,'pointerup',{pointerId:1}).stopped,true);
      assert.equal(layer.open,true,`${name}: no close on pointerup before click`);
      const click=dispatch(layer,'click');
      assert.equal(layer.open,false,`${name}: click on badge or empty space closes`);
      assert.equal(click.prevented,true);assert.equal(click.stopped,true);
      assert.equal(pending.size,0);
    }
    assert.equal(dialogs.length,1,'reuse one dialog, without accumulating listeners');
  });
});

test('keyboard dismissal waits for a matching key release, ignores held keys and supports Escape', async()=>{
  await fixture(({dialogs,pending,dispatch,showPromotion})=>{
    for (const key of ['Enter',' ']) {
      showPromotion(3,()=>'<span>계급장</span>');
      const layer=dialogs[0];
      dispatch(layer,'keyup',{key});assert.equal(layer.open,true,'do not consume the release of the purchase key');
      dispatch(layer,'keydown',{key,repeat:true});
      dispatch(layer,'keyup',{key});assert.equal(layer.open,true,'held purchase key cannot skip the new promotion');
      const down=dispatch(layer,'keydown',{key});
      assert.equal(down.prevented,true);assert.equal(down.stopped,true);assert.equal(layer.open,true);
      const up=dispatch(layer,'keyup',{key});
      assert.equal(up.prevented,true);assert.equal(up.stopped,true);assert.equal(layer.open,false);
      assert.equal(pending.size,0);
    }
    showPromotion(3,()=>'<span>계급장</span>');
    const cancel=dispatch(dialogs[0],'cancel');
    assert.equal(cancel.prevented,true);assert.equal(dialogs[0].open,false);assert.equal(pending.size,0);
  });
});

test('skipping promotion opens the queued personal award once and consumes the input before the reward', async()=>{
  await fixture(({root,dialogs,pending,dispatch,showPromotion})=>{
    const awards=createPersonalAwardUI({root});
    showPromotion(RANKS.indexOf('중령'),()=>'<span>계급장</span>');
    awards.award(RANKS.indexOf('소령'),RANKS.indexOf('중령'));
    assert.equal(dialogs.length,1,'reward waits behind the promotion');
    const event=dispatch(dialogs[0],'click');
    assert.equal(event.stopped,true);assert.equal(event.prevented,true);
    assert.equal(dialogs.length,2);assert.equal(dialogs[1].open,true);assert.equal(dialogs[1].shown,1);
    assert.match(dialogs[1].innerHTML,/지휘봉/);assert.equal(pending.size,0);
    dispatch(dialogs[0],'click');awards.sync();
    assert.equal(dialogs[1].shown,1);assert.equal(dialogs[1].open,true);
    dialogs[1].close();awards.sync();assert.equal(dialogs[1].open,false);
  });
});
