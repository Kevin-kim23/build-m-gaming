import test from 'node:test';
import assert from 'node:assert/strict';
import { drawScene } from '../src/art.js';
import { freshState } from '../src/game.js';

test('home labels remain separate from pixel-scaled artwork and refresh only with the scene', () => {
  const previous = globalThis.document;
  let canvasText = 0, updates = 0;
  const context = {fillRect(){},clearRect(){},drawImage(){},setTransform(){},fillText(){canvasText++;}};
  globalThis.document = {createElement(tag) {
    return tag === 'canvas' ? {width:0,height:0,getContext:()=>context} : {style:{},children:[],append(child){this.children.push(child);}};
  }};
  const layer = {children:[],replaceChildren(...children){this.children=children;updates++;}};
  const canvas = {clientWidth:320,clientHeight:366,getContext:()=>context};
  const army = {...freshState(1),soldiers:10000,sergeants:300,staffSergeants:200};
  for(const id of Object.keys(army.equipment).slice(0,4)) army.equipment[id]={level:10,deployed:true,count:1};
  try {
    drawScene(canvas,army,layer);
    assert.ok(layer.children.some(c=>c.textContent==='공격헬기'));
    assert.ok(layer.children.some(c=>c.textContent==='연대'));
    assert.equal(canvasText,0,'text must not lose strokes when pixel artwork is downsampled');
    assert.equal(drawScene(canvas,army,layer),false);
    assert.equal(updates,1);
    canvas.clientWidth=480;drawScene(canvas,army,layer);assert.equal(updates,2);
    army.ncoSchoolLevel=1;drawScene(canvas,army,layer);
    assert.ok(layer.children.some(c=>c.innerHTML?.includes('부사관학교 Lv.1')));
    army.ncoSchoolLevel=5;army.officerSchoolLevel=1;drawScene(canvas,army,layer);
    assert.equal(layer.children.filter(c=>c.className==='field-school').length,2);
    assert.ok(layer.children.some(c=>c.innerHTML?.includes('부사관학교 Lv.5')));
    const afterSchools=updates;assert.equal(drawScene(canvas,army,layer),false);assert.equal(updates,afterSchools);
    army.equipment.tank.count=2;drawScene(canvas,army,layer);
    assert.equal(layer.children.find(c=>c.textContent==='전차').children[0].textContent,'[2문]');
    for(const id of ['artillery','selfPropelled','helicopter'])army.equipment[id].deployed=false;
    drawScene(canvas,army,layer);
    assert.equal(layer.children.find(c=>c.textContent==='전차').children[0].textContent,'[2문]');
    drawScene(canvas,freshState(1),layer);assert.equal(layer.children.length,0);
  } finally {if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
