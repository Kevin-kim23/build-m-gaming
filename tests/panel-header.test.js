import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/game.js';
import {shopMarkup} from '../src/shop.js';
import {equipmentPanelMarkup} from '../src/equipment-panels.js';
import {renderRecruitPromotion} from '../src/panel-header.js';
import {UNITS} from '../src/units.js';
import {RANKS,LAST_RANK,RANK_REQUIREMENTS} from '../src/ranks.js';
import {fmt} from '../src/format.js';

// Track writes as well as visible text so the one-second refresh cannot
// silently rebuild the panel or rewrite unchanged accessibility/style values.
function promotionPanel() {
  let writes=0;
  const observed=(initial)=>new Proxy({...initial},{set(target,key,value){writes++;target[key]=value;return true;}});
  const node=()=>{
    let text='';const attributes={};
    return {
      get textContent(){return text;},set textContent(value){writes++;text=value;},
      getAttribute(name){return attributes[name]??null;},
      setAttribute(name,value){writes++;attributes[name]=value;},
      style:observed({width:''}),dataset:observed({tone:''}),
    };
  };
  const nodes=new Map(['[data-recruit-rank]','[data-recruit-remaining]','[data-recruit-percent]','[role="progressbar"]','[data-recruit-fill]'].map(selector=>[selector,node()]));
  const panel={querySelector:selector=>nodes.get(selector),set innerHTML(value){throw Error('promotion refresh must keep existing nodes');}};
  return {
    querySelector:selector=>selector==='[data-recruit-promotion]'?panel:null,
    get writes(){return writes;},get:selector=>nodes.get(selector),
    set innerHTML(value){throw Error('promotion refresh must keep the existing list');},
  };
}

test('all four gold-spending menus keep the title and wallet inside one sticky header',()=>{
  const state=freshState(1800000000000);
  for(const html of [shopMarkup(state,'',()=>''),shopMarkup(state,'',()=>'', 'facilities'),equipmentPanelMarkup(state,null),equipmentPanelMarkup(state,null,'personal')]) {
    const header=html.match(/<header class="panel-sticky-head">([\s\S]*?)<\/header>/)?.[1];
    assert.ok(header,'one sticky container must contain the title and balance');
    assert.match(header,/id="modal-title"/);
    assert.match(header,/class="shop-wallet"/);
    assert.match(header,/id="(?:shop|equipment)-gold"/);
    assert.equal((html.match(/class="panel-sticky-head"/g)??[]).length,1);
  }
});

test('only recruitment has a promotion gauge, below its title and above the list',()=>{
  const state=freshState(1800000000000),html=shopMarkup(state,'',()=>''),header=html.split('</header>')[0];
  assert.match(header,/군대 모집[\s\S]*data-recruit-promotion[\s\S]*일병 진급까지/);
  assert.match(header,/role="progressbar"[^>]*aria-valuenow="0"/);
  assert.match(header,/전력 4 남음/);
  for(const category of ['facilities','items','store'])assert.doesNotMatch(shopMarkup(state,'',()=>'',category),/data-recruit-promotion/);
  assert.doesNotMatch(shopMarkup(state,'',()=>'', 'store'),/shop-wallet|보유 골드/);
});

test('recruitment refresh updates remaining strength, percent, tone and next rank after a purchase',()=>{
  const state={...freshState(1800000000000),soldiers:2},root=promotionPanel();
  renderRecruitPromotion(state,root);
  assert.equal(root.get('[data-recruit-rank]').textContent,'일병 진급까지');
  assert.equal(root.get('[data-recruit-remaining]').textContent,'전력 2 남음');
  assert.equal(root.get('[data-recruit-percent]').textContent,'50%');
  assert.equal(root.get('[role="progressbar"]').getAttribute('aria-valuenow'),'50');
  assert.equal(root.get('[data-recruit-fill]').style.width,'50%');
  assert.equal(root.get('[data-recruit-fill]').dataset.tone,'green');
  state.soldiers=3;
  renderRecruitPromotion(state,root);
  assert.equal(root.get('[data-recruit-remaining]').textContent,'전력 1 남음');
  assert.equal(root.get('[data-recruit-percent]').textContent,'75%');
  assert.equal(root.get('[data-recruit-fill]').dataset.tone,'orange');
  state.soldiers=4;
  renderRecruitPromotion(state,root);
  assert.equal(root.get('[data-recruit-rank]').textContent,'상병 진급까지');
  assert.equal(root.get('[data-recruit-remaining]').textContent,'전력 6 남음');
  assert.equal(root.get('[data-recruit-percent]').textContent,'40%');
  assert.equal(root.get('[role="progressbar"]').getAttribute('aria-valuenow'),'40');
});

test('unchanged progress and income-only ticks make no extra DOM writes',()=>{
  const state={...freshState(1800000000000),soldiers:3},root=promotionPanel();
  renderRecruitPromotion(state,root);
  const firstWrites=root.writes;
  assert.ok(firstWrites>0,'first refresh populates the mounted nodes');
  for(let i=0;i<3;i++) {
    state.gold+=100;
    renderRecruitPromotion(state,root);
  }
  assert.equal(root.writes,firstWrites);
  assert.doesNotThrow(()=>renderRecruitPromotion(state,{querySelector:()=>null}));
});

test('highest-rank BigInt strength shows completion with an exact total instead of a nonexistent target',()=>{
  const state={...freshState(1800000000000),[UNITS.constellationMarshal.field]:64,soldiers:1},root=promotionPanel();
  const exactPower=BigInt(RANK_REQUIREMENTS[LAST_RANK])+1n;
  assert.ok(exactPower>BigInt(Number.MAX_SAFE_INTEGER));
  renderRecruitPromotion(state,root);
  assert.equal(root.get('[data-recruit-rank]').textContent,`${RANKS[LAST_RANK]} 진급 완료`);
  assert.equal(root.get('[data-recruit-remaining]').textContent,`총 전력 ${fmt(exactPower)}`);
  assert.equal(root.get('[data-recruit-percent]').textContent,'100%');
  assert.equal(root.get('[role="progressbar"]').getAttribute('aria-valuenow'),'100');
  assert.equal(root.get('[data-recruit-fill]').style.width,'100%');
  assert.equal(root.get('[data-recruit-fill]').dataset.tone,'red');
  const writes=root.writes;
  renderRecruitPromotion(state,root);
  assert.equal(root.writes,writes);
});
