import test from 'node:test';
import assert from 'node:assert/strict';
import {createIncomeHud} from '../src/income-hud.js';
import {freshState} from '../src/state.js';
import {RANKS,RANK_REQUIREMENTS} from '../src/ranks.js';
const T=1800000000000;
function harness(){
  let renders=0,writes=0;
  const doc={createElement:()=>({})},nodes={};
  for(const id of ['#passive-effects','#tap-effects','#tap-sword-effect'])nodes[id]={hidden:true,children:[],ownerDocument:doc,
    replaceChildren(...children){renders++;this.children=children;},
    set textContent(text){writes++;this.text=text;}};
  return {ui:createIncomeHud({querySelector:id=>nodes[id]}),nodes,get renders(){return renders;},get writes(){return writes;}};
}
test('HUD formats fractional effects and avoids rebuilding on unchanged state or taps',()=>{
  const h=harness(),s=freshState(T);s.facilities=['kitchen'];s.facilityLevels={kitchen:20};
  h.ui.refresh(s);const renders=h.renders;
  assert.match(h.nodes['#passive-effects'].children[0].textContent,/시설 \+11\.55%/);
  for(let i=0;i<300;i++){s.gold++;s.taps++;h.ui.refresh(s);h.ui.syncSword(s,T);}
  assert.equal(h.renders,renders);assert.equal(h.writes,0);
  s.facilityLevels={kitchen:1};h.ui.refresh(s);
  assert.equal(h.nodes['#passive-effects'].children[0].textContent,'시설 +3%');
  s.facilities=[];h.ui.refresh(s);assert.equal(h.nodes['#passive-effects'].hidden,true);
});
test('sword appears only on tap income while active, clears on expiry and does not rebuild static effects',()=>{
  const h=harness(),s={...freshState(T),soldiers:RANK_REQUIREMENTS[RANKS.indexOf('준장')]-3000,sergeants:300,swordActivatedAt:T};
  h.ui.refresh(s);const renders=h.renders;
  h.ui.syncSword(s,T);assert.equal(h.nodes['#tap-sword-effect'].text,'장군검 +100%');assert.equal(h.nodes['#tap-sword-effect'].hidden,false);
  for(let i=0;i<300;i++)h.ui.syncSword(s,T+i);
  assert.equal(h.writes,1);assert.equal(h.renders,renders);
  h.ui.syncSword(s,T+30000);assert.equal(h.nodes['#tap-sword-effect'].hidden,true);assert.equal(h.writes,2);
  s.swordActivatedAt=T+600000;h.ui.syncSword(s,T+600000);assert.equal(h.nodes['#tap-sword-effect'].hidden,false);
});
