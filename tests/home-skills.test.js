import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, activateAutoTouch } from '../src/game.js';
import { homeMarkup } from '../src/home-view.js';
import { syncRevolverControls } from '../src/sword-controls.js';
import { personalIcon } from '../src/personal-art.js';
const T=1800000000000;
const army=()=>({...freshState(T),soldiers:78920,sergeants:300});
test('home skills stay adjacent in one group and use stable short action names',()=>{
  const html=homeMarkup(army());
  assert.match(html,/<div class="home-skills"[^>]*>.*data-use-sword.*data-use-revolver.*<\/div><div class="field-theme-picker"/s);
  assert.match(html,/data-revolver-label>리볼버 사용<\/span>/);
  assert.match(personalIcon('revolver'),/viewBox="0 0 256 192"/);
});
test('revolver countdown never replaces its home icon or action name',()=>{
  const label={textContent:'리볼버 사용'},timer={hidden:true,textContent:''};
  const button={attributes:{},classList:{toggle(){}},querySelector:s=>s==='[data-revolver-label]'?label:s==='[data-revolver-time]'?timer:null,
    setAttribute(k,v){this.attributes[k]=v;},set textContent(v){throw Error('icon replaced');}};
  const root={querySelectorAll:()=>[button]},s=army();
  syncRevolverControls(root,s,true,T);assert.equal(label.textContent,'리볼버 사용');assert.equal(timer.hidden,true);assert.equal(button.disabled,false);
  activateAutoTouch(s,T);syncRevolverControls(root,s,true,T+12500);
  assert.equal(timer.textContent,'48초');assert.equal(timer.hidden,false);assert.equal(label.textContent,'리볼버 사용');assert.match(button.attributes['aria-label'],/리볼버 사용 중/);
  syncRevolverControls(root,s,true,T+60000);assert.equal(timer.textContent,'29:00');assert.equal(button.disabled,true);
  syncRevolverControls(root,s,false,T+1800000);assert.equal(button.disabled,true);assert.equal(timer.hidden,true);
});
