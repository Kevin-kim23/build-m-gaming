import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameSession} from '../src/session.js';
import {SAVE_KEY,freshState} from '../src/state.js';
import {serializeSave} from '../src/money.js';
import {parseSave} from '../src/save.js';
const T=1800000000000;
function setup(){
  const values=new Map([[SAVE_KEY,serializeSave({...freshState(T),gold:55})]]);let fail=false;
  const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('quota');values.set(k,v);}};
  const session=createGameSession({storage,now:()=>T,setTimer:()=>1,clearTimer:()=>{}});session.start();
  return {session,values,fail:()=>{fail=true;}};
}
test('cloud restore preserves prior local record and large money without merging balances',()=>{
  const h=setup();assert.equal(h.session.restoreCloud(serializeSave({...freshState(T),gold:10n**27n})),true);
  assert.equal(h.session.state.gold,10n**27n);
  assert.equal(parseSave(h.values.get(SAVE_KEY+'-before-cloud-restore'),T).gold,55);
  assert.equal(parseSave(h.values.get(SAVE_KEY),T).gold,10n**27n);
});
test('invalid data, failed backup and inactive session cannot replace local progress',()=>{
  const h=setup();assert.equal(h.session.restoreCloud('{bad'),false);assert.equal(h.session.state.gold,55);
  h.fail();assert.equal(h.session.restoreCloud(serializeSave(freshState(T))),false);assert.equal(h.session.state.gold,55);
  h.session.pause();assert.equal(h.session.restoreCloud(serializeSave(freshState(T))),false);
});
