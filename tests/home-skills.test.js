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
test('revolver shows a clockwise countdown ring like the sword while it is active',()=>{
  const label={textContent:'리볼버 사용'},timer={hidden:true,textContent:''};
  const ring={attributes:{},ownerSVGElement:{hidden:true,toggleAttribute(name,value){this[name]=value;}},setAttribute(k,v){this.attributes[k]=v;}};
  const nodes={'[data-revolver-label]':label,'[data-revolver-time]':timer,'[data-revolver-ring]':ring};
  const button={attributes:{},classList:{toggle(){}},querySelector:s=>nodes[s]??null,
    setAttribute(k,v){this.attributes[k]=v;},set textContent(v){throw Error('icon replaced');}};
  const root={querySelectorAll:()=>[button]},s=army();
  syncRevolverControls(root,s,true,T);assert.equal(ring.ownerSVGElement.hidden,true);
  activateAutoTouch(s,T);
  for(const [ms,offset] of [[0,0],[15000,-25],[30000,-50],[45000,-75],[59999,-99.99833333333333]]){
    syncRevolverControls(root,s,true,T+ms);
    assert.equal(ring.ownerSVGElement.hidden,false);
    assert.ok(Math.abs(Number(ring.attributes['stroke-dashoffset'])-offset)<1e-8,`${ms}ms`);
  }
  // Cooldown after the one-minute run: no ring, the cooldown text stays.
  syncRevolverControls(root,s,true,T+60000);assert.equal(ring.ownerSVGElement.hidden,true);assert.equal(timer.textContent,'29:00');
  assert.match(homeMarkup(army()),/data-revolver-ring cx="24" cy="24" r="21" pathLength="100" stroke-dasharray="100 100" transform="rotate\(-90 24 24\)"/);
});
