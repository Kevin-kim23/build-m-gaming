import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,activateSword,activateAutoTouch} from '../src/game.js';
import {homeMarkup} from '../src/home-view.js';
import {homeItemStatus,createHomeItemControls} from '../src/home-quick-items.js';
import {swordSkillStatus,autoTouchStatus} from '../src/personal-equipment.js';
import {achievementListMarkup} from '../src/achievement-markup.js';
const T=1800000000000;

test('six direct home menus, battle and quick blocks remain available without a medal shelf',()=>{
  const html=homeMarkup(freshState(T));
  const menu=html.match(/<nav class="home-tabs"[\s\S]*?<\/nav>/)[0];
  assert.equal((menu.match(/<button /g)||[]).length,6);
  for(const id of ['recruit','facilities','equipment','personal','shop','items'])assert.match(menu,new RegExp('id="open-'+id+'"'));
  assert.match(html,/id="open-battle"/);assert.doesNotMatch(html,/medal-shelf|id="medal-list"/);
  assert.ok(html.indexOf('class="field-tools"')>html.indexOf('</button></div>'));
  assert.ok(html.indexOf('class="field-tools"')<html.indexOf('class="home-dock"'));
  assert.doesNotMatch(achievementListMarkup(freshState(T),null,[],false),/data-toggle-medal|홈에 획득/);
});

test('item blocks distinguish unavailable, owned, active and expired potion/auto states',()=>{
  const s=freshState(T);
  assert.equal(homeItemStatus(s,'red',T).action,'offer');
  assert.equal(homeItemStatus(s,'auto',T).action,'offer');
  s.potions.red={count:1,startedAt:T,expiresAt:T+60000};
  assert.equal(homeItemStatus(s,'red',T+30000).label,'0:30');
  assert.equal(homeItemStatus(s,'red',T+60000).label,'1개');
  s.potions.red.count=0;
  const empty=homeItemStatus(s,'red',T+30000);
  assert.equal(empty.active,true);assert.equal(empty.action,'offer');
  s.homeAutoTap={owned:true,enabled:false,source:'test'};
  assert.equal(homeItemStatus(s,'auto',T).label,'OFF');
  s.homeAutoTap.enabled=true;assert.equal(homeItemStatus(s,'auto',T).label,'ON');
});

test('quick controls route offers without granting items and respect inactive sessions',()=>{
  const s=freshState(T),calls=[],label={textContent:''};
  const button={dataset:{homeItem:'red'},classList:{toggle(){}},attrs:{},
    addEventListener(type,handler){this.click=handler;},getAttribute(key){return this.attrs[key];},
    setAttribute(key,value){this.attrs[key]=value;},querySelector(){return label;}};
  let writable=true;
  const controls=createHomeItemControls({querySelectorAll:()=>[button]},{
    state:()=>s,writable:()=>writable,use:id=>{calls.push('use:'+id);return {ok:true};},
    openOffer:id=>calls.push('offer:'+id),onSuccess:()=>calls.push('sound'),
  });
  controls.sync(T);button.click();assert.deepEqual(calls,['offer:red']);
  assert.equal(s.potions.red.count,0);
  s.potions.red.count=1;button.click();assert.deepEqual(calls,['offer:red','use:red','sound']);
  writable=false;controls.sync(T);button.click();assert.equal(button.disabled,true);assert.equal(calls.length,3);
});

test('rank removal does not alter skill cooldowns or permit duplicate activation',()=>{
  const s={...freshState(T),soldiers:81920};
  assert.equal(activateSword(s,T).ok,true);assert.equal(activateAutoTouch(s,T).ok,true);
  assert.equal(activateSword(s,T).reason,'cooldown');assert.equal(activateAutoTouch(s,T).reason,'cooldown');
  assert.equal(swordSkillStatus(s,T+30000).active,false);
  assert.equal(autoTouchStatus(s,T+60000).active,false);
});
