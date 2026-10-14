import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/state.js';
import {createPersonalUpgradeUI} from '../src/personal-upgrade-ui.js';
import {personalStatus} from '../src/personal-equipment.js';

test('list enhancement updates the item without reopening or scrolling a detail dialog',()=>{
  const oldDocument=globalThis.document;
  globalThis.document={querySelector(){throw Error('list upgrade must not reopen a popup');},createElement(){throw Error('list upgrade must not create a popup');}};
  try {
    const state={...freshState(Date.now()),soldiers:81920,gold:1e15};
    const sounds=[],session={state,active:true,change(fn){return fn(state);}};
    const ui=createPersonalUpgradeUI(session,{ui:(...args)=>sounds.push(args)});
    const before=personalStatus(state,'generalSword').level;
    const result=ui.upgrade('generalSword');
    assert.equal(result.ok,true);
    assert.equal(personalStatus(state,'generalSword').level,before+1);
    assert.match(result.message,/강화 완료/);
    assert.equal(sounds.length,1);
    session.active=false;
    assert.equal(ui.upgrade('generalSword'),null);
    assert.equal(personalStatus(state,'generalSword').level,before+1);
    session.active=true;state.gold=0;
    assert.equal(ui.upgrade('generalSword').reason,'gold');
    assert.equal(personalStatus(state,'generalSword').level,before+1);
    assert.equal(ui.upgrade('unknown'),null);
  } finally {globalThis.document=oldDocument;}
});
