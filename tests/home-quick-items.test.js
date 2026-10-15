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
  assert.equal(homeItemStatus(s,'red',T+30000).time,'0:30');
  assert.equal(homeItemStatus(s,'red',T+60000).label,'×1');
  s.potions.red.count=0;
  const empty=homeItemStatus(s,'red',T+30000);
  assert.equal(empty.active,true);assert.equal(empty.action,'offer');
  s.homeAutoTap={owned:true,enabled:false,source:'test'};
  assert.equal(homeItemStatus(s,'auto',T).label,'OFF');
  s.homeAutoTap.enabled=true;assert.equal(homeItemStatus(s,'auto',T).label,'ON');
});

test('long booster timers and large inventories stay compact while accessibility keeps exact values',()=>{
  const s=freshState(T);
  s.potions.blue={count:12345,startedAt:T,expiresAt:T+8_820_000};
  const status=homeItemStatus(s,'blue',T);
  assert.equal(status.label,'×1.2만');
  assert.equal(status.time,'2:27:00');
  assert.match(status.aria,/보유 12345개/);
  assert.match(status.aria,/2시간 27분/);
  s.potions.blue={count:Number.MAX_SAFE_INTEGER,startedAt:T,expiresAt:100_000_000_000_000};
  const extreme=homeItemStatus(s,'blue',T);
  assert.equal(extreme.label,'×9007조');
  assert.ok(extreme.time.length<=9,extreme.time);
  assert.match(extreme.aria,/보유 9007199254740991개/);
  assert.match(extreme.aria,/시간/);
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

test('empty max is hidden but its last active dose stays visible until expiration',()=>{
 const s=freshState(T);
 assert.equal(homeItemStatus(s,'max',T).hidden,true);
 s.potions.max={count:1,startedAt:0,expiresAt:0};
 assert.equal(homeItemStatus(s,'max',T).hidden,false);
 s.potions.max={count:0,startedAt:T,expiresAt:T+60000};
 assert.equal(homeItemStatus(s,'max',T+30000).hidden,false);
 assert.equal(homeItemStatus(s,'max',T+60000).hidden,true);
 assert.equal(homeItemStatus(s,'red',T).hidden,false);
});
