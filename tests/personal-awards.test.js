import test from 'node:test';
import assert from 'node:assert/strict';
import { personalAwardsBetween, personalAwardMarkup, createPersonalAwardUI } from '../src/personal-awards.js';
import { RANKS } from '../src/ranks.js';
const rank = name => RANKS.indexOf(name);

test('personal awards cover all grants and multiple-rank promotions, without replaying existing gear',()=>{
  assert.deepEqual(personalAwardsBetween(rank('소령'),rank('중령')).map(i=>i.id),['commandBaton']);
  assert.deepEqual(personalAwardsBetween(rank('대령'),rank('준원수')).map(i=>i.id),['generalSword','divisionFlag','generalRevolver','marshalGlaive']);
  assert.deepEqual(personalAwardsBetween(rank('중령'),rank('중령')),[]);
  assert.deepEqual(personalAwardsBetween(rank('준원수'),rank('대원수')).map(item=>item.id),['admiralsCompass','strategicTablet','supremeSeal']);
  const html=personalAwardMarkup(personalAwardsBetween(rank('대령'),rank('준장')));
  assert.match(html,/장군검/);assert.match(html,/Lv.1/);assert.match(html,/30초 동안 터치 골드 2배/);
});

function fixture() {
  const events={},dialogs=[];
  const root={hidden:false,blocked:false,active:true,body:{appendChild(d){dialogs.push(d);}},
    querySelector(){return this.blocked?{}:null;},
    addEventListener(name,callback){events[name]=callback;},
    createElement(){return {open:false,innerHTML:'',shown:0,setAttribute(){},addEventListener(){},showModal(){this.open=true;this.shown++;},close(){this.open=false;events.close();}};},
  };
  return {root,events,dialogs,ui:createPersonalAwardUI({root,canShow:()=>root.active})};
}
test('award waits for promotion, pauses while hidden and never duplicates itself on close',()=>{
  const {root,events,dialogs,ui}=fixture();
  root.blocked=true;ui.award(rank('소령'),rank('중령'));assert.equal(dialogs.length,0);
  root.blocked=false;root.hidden=true;events.close();assert.equal(dialogs.length,0);
  root.hidden=false;ui.sync();assert.equal(dialogs.length,1);assert.equal(dialogs[0].shown,1);
  dialogs[0].close();assert.equal(dialogs[0].shown,1);
  ui.award(rank('소령'),rank('중령'));assert.equal(dialogs[0].open,false);
  ui.award(rank('대령'),rank('준장'));assert.equal(dialogs[0].shown,2);assert.match(dialogs[0].innerHTML,/장군검/);
});
test('new awards during an open popup are shown after confirmation',()=>{
  const {dialogs,ui}=fixture();ui.award(rank('소령'),rank('중령'));
  ui.award(rank('대령'),rank('소장'));assert.equal(dialogs[0].shown,1);
  dialogs[0].close();assert.equal(dialogs[0].shown,2);
  assert.match(dialogs[0].innerHTML,/장군검/);assert.match(dialogs[0].innerHTML,/사단기/);
  dialogs[0].close();assert.equal(dialogs[0].open,false);
});


test('returning while the session is inactive or the offline reward is open keeps awards queued',()=>{
  const {root,events,dialogs,ui}=fixture();
  root.active=false;ui.award(rank('대령'),rank('준장'));assert.equal(dialogs.length,0);
  root.active=true;root.blocked=true;ui.sync();assert.equal(dialogs.length,0);
  root.blocked=false;events.close();assert.equal(dialogs[0].shown,1);
  ui.sync();ui.sync();assert.equal(dialogs[0].shown,1);
});

test('a delayed close event cannot reopen or replace an already visible reward',()=>{
  const {root,events,dialogs,ui}=fixture();ui.award(rank('소령'),rank('중령'));
  ui.award(rank('대령'),rank('준장'));events.close();
  assert.equal(dialogs[0].shown,1);assert.match(dialogs[0].innerHTML,/지휘봉/);
  dialogs[0].close();assert.equal(dialogs[0].shown,2);assert.match(dialogs[0].innerHTML,/장군검/);
  events.close();assert.equal(dialogs[0].shown,2);
});
