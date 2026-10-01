import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/state.js';
import {createPersonalUpgradeUI} from '../src/personal-upgrade-ui.js';

test('open personal details track rank and levels received from another window without redrawing each tick',()=>{
  const previous=global.document;
  let html='',renders=0;
  const wallet={textContent:''},hint={textContent:''},button={disabled:false};
  const dialog={open:false,setAttribute(){},addEventListener(){},showModal(){this.open=true;},
    set innerHTML(value){html=value;renders++;},get innerHTML(){return html;}};
  global.document={createElement:()=>dialog,body:{append(){}},querySelector(){
    const match=html.match(/data-personal-detail="([^"]+)" data-level="(\d+)"/);
    if(!dialog.open||!match)return null;
    return {dataset:{personalDetail:match[1],level:match[2]},querySelector:selector=>
      selector==='[data-personal-wallet]'?wallet:selector==='[data-personal-hint]'?hint:button};
  }};
  try{
    const s={...freshState(1000),soldiers:3000,sergeants:300,gold:50_000_000_000};
    const session={state:s,active:true};
    const ui=createPersonalUpgradeUI(session,{recruit(){}});
    ui.open('generalSword');assert.match(html,/준장 진급 시 자동 지급/);
    s.soldiers=7240;ui.sync();assert.match(html,/보유 중 · 준장 진급 보상/);
    s.personalLevels={...s.personalLevels,generalSword:2};ui.sync();
    assert.match(html,/장군검 <small>Lv.2/);assert.match(html,/성공 <strong>95%/);
    const count=renders;s.gold=0;ui.sync();assert.equal(button.disabled,true);
    s.gold=50_000_000_000;ui.sync();assert.equal(button.disabled,false);
    session.active=false;ui.sync();assert.equal(button.disabled,true);
    assert.equal(renders,count,'gold and lock changes must update fields, not entire markup');
    s.personalLevels={...s.personalLevels,generalSword:10};ui.sync();assert.match(html,/최대 레벨을 달성/);
  }finally{global.document=previous;}
});
