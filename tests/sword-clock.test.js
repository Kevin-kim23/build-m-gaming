import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, activateSword, parseSave } from '../src/game.js';
import { syncSwordControls } from '../src/sword-controls.js';
import { homeMarkup } from '../src/home-view.js';
const T=1800000000000;
const general=()=>({...freshState(T),soldiers:7240,sergeants:300,ncoSchoolLevel:1});
function controls(){
  let drawCount=0;
  const art={dataset:{},set innerHTML(value){drawCount++;}},label={textContent:'장군검 사용'},timer={hidden:true,textContent:''};
  const ring={attributes:{},ownerSVGElement:{hidden:true,toggleAttribute(name,value){this[name]=value;}},setAttribute(name,value){this.attributes[name]=value;}};
  const nodes={'[data-sword-art]':art,'[data-sword-label]':label,'[data-sword-time]':timer,'[data-sword-ring]':ring};
  const button={attributes:{},classList:{toggle(){}},querySelector:selector=>nodes[selector],setAttribute(name,value){this.attributes[name]=value;},set textContent(value){throw Error('Do not replace icon');}};
  return {button,ring,timer,label,root:{querySelectorAll:()=>[button]},draws:()=>drawCount};
}
test('clock erases clockwise from twelve and counts the actual remaining seconds without rebuilding art',()=>{
  const s=general(),c=controls();activateSword(s,T);
  for(const [ms,seconds,offset] of [[0,30,0],[7500,23,-25],[15000,15,-50],[22500,8,-75],[29999,1,-99.99666666666667]]){
    syncSwordControls(c.root,s,true,T+ms);
    assert.ok(Math.abs(Number(c.ring.attributes['stroke-dashoffset'])-offset)<1e-8);
    assert.equal(c.timer.textContent,`${seconds}초`);assert.equal(c.timer.hidden,false);
    assert.equal(c.ring.ownerSVGElement.hidden,false);assert.equal(c.button.disabled,true);
    assert.equal(c.button.attributes['aria-label'],`장군검 사용 중 · ${seconds}초 남음`);
  }
  assert.equal(c.draws(),1);assert.equal(c.label.textContent,'장군검 사용');
  const html=homeMarkup(s);
  assert.match(html,/stroke-dasharray="100 100" transform="rotate\(-90 24 24\)"/);
});
test('expiration retains a visible cooldown, reload resumes time, and disabled sessions cannot reactivate',()=>{
  const s=general(),c=controls();activateSword(s,T);
  const restored=parseSave(JSON.stringify(s),T+17000);
  syncSwordControls(c.root,restored,false,T+17000);
  assert.equal(c.timer.textContent,'13초');assert.equal(c.button.disabled,true);
  syncSwordControls(c.root,restored,true,T+30000);
  assert.equal(c.timer.hidden,false);assert.equal(c.timer.textContent,'570초');assert.equal(c.ring.ownerSVGElement.hidden,true);assert.equal(c.button.disabled,true);
  assert.match(c.button.attributes['aria-label'],/9:30/);
  syncSwordControls(c.root,restored,true,T+599001);
  assert.equal(c.timer.hidden,false);assert.equal(c.timer.textContent,'1초');
  syncSwordControls(c.root,restored,true,T+600000);assert.equal(c.button.disabled,false);
  assert.equal(c.timer.hidden,true);assert.equal(c.draws(),1);
});
