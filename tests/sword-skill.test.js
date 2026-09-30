import { personalMarkup } from "../src/personal-panels.js";
import test from "node:test";
import assert from "node:assert/strict";
import {freshState,activateSword,tapGold,perTap,perSecond,accrue,parseSave,SAVE_KEY,MAX_GOLD} from "../src/game.js";
import {swordSkillStatus} from "../src/personal-equipment.js";
import {createBattle,fireVolley} from "../src/battle.js";
import {createGameSession} from "../src/session.js";
import {syncSwordControls} from "../src/sword-controls.js";
import {personalIcon} from "../src/personal-art.js";
const T=1800000000000;
const general=()=>({...freshState(T),soldiers:7240,sergeants:300,ncoSchoolLevel:1,gold:1000});
test('skill activates once, doubles only home taps for exactly thirty seconds and recharges at ten minutes',()=>{
  const s=general(),base=perTap(s,T),income=perSecond(s);
  assert.equal(activateSword(s,T).ok,true);assert.equal(s.swordActivatedAt,T);
  assert.equal(activateSword(s,T).reason,'cooldown');assert.equal(perTap(s,T),base*2);
  assert.equal(tapGold(s,T),base*2);assert.equal(perSecond(s),income);
  assert.equal(perTap(s,T+29999),base*2);assert.equal(perTap(s,T+30000),base);
  assert.equal(activateSword(s,T+599999).reason,'cooldown');
  assert.equal(activateSword(s,T+600000).ok,true);assert.equal(perTap(s,T+600000),base*2);
});
test('locked ranks and malformed activation times cannot start skill, cap still applies',()=>{
  for(const patch of [{soldiers:4999},{sergeants:299},{soldiers:5000}]) {
    const s={...general(),...patch};assert.equal(activateSword(s,T).reason,'locked');assert.equal(s.swordActivatedAt,null);
  }
  for(const now of [NaN,Infinity,-1,1.2]){const s=general();assert.equal(activateSword(s,now).reason,'time');assert.equal(s.swordActivatedAt,null);}
  const s=general();activateSword(s,T);s.gold=MAX_GOLD-1;assert.equal(tapGold(s,T),1);assert.equal(s.gold,MAX_GOLD);
});
test('reload, offline income and clock rollback cannot extend or resurrect a saved boost',()=>{
  const s=general(),income=perSecond(s);activateSword(s,T);
  let restored=parseSave(JSON.stringify(s),T+15000);assert.equal(swordSkillStatus(restored,T+15000).activeMs,15000);
  accrue(restored,T+30000);assert.equal(restored.gold,1000+income*30);
  assert.equal(swordSkillStatus(restored,T).active,false);assert.equal(swordSkillStatus(restored,T).remainingMs,570000);
  restored=parseSave(JSON.stringify(restored),T+600000);assert.equal(swordSkillStatus(restored,T+600000).canUse,true);
});
test('schema ten gains unused skill; schema eleven validates and preserves timestamps',()=>{
  const old={...general(),version:10};delete old.swordActivatedAt;
  const migrated=parseSave(JSON.stringify(old),T);assert.equal(migrated.version, 16);assert.equal(migrated.swordActivatedAt,null);
  assert.equal(migrated.gold,old.gold);assert.equal(migrated.sergeants,300);
  old.swordActivatedAt=T;assert.equal(parseSave(JSON.stringify(old),T).swordActivatedAt,null);
  for(const bad of [undefined,-1,1.5,'12',{},100000000000001]) {
    assert.equal(parseSave(JSON.stringify({...general(),swordActivatedAt:bad}),T),null);
  }
  const s=general();activateSword(s,T);assert.equal(parseSave(JSON.stringify(s),T).swordActivatedAt,T);
});
test('skill never changes automatic income or infantry damage in battle',()=>{
  const s=general(),initial=createBattle(s,1),income=perSecond(s);
  activateSword(s,T);const boosted=createBattle(s,1);
  assert.deepEqual(fireVolley(boosted),fireVolley(initial));assert.equal(perSecond(s),income);
});
test('activation saves cooldown immediately; restart cannot activate again; inactive sessions cannot use it',()=>{
  let now=T;const values=new Map([[SAVE_KEY,JSON.stringify(general())]]),writes=[];
  const storage={getItem:k=>values.get(k)??null,setItem(k,v){writes.push(k);values.set(k,v);}};
  const session=createGameSession({storage,now:()=>now,setTimer:()=>1,clearTimer:()=>{}});
  assert.equal(session.change(s=>activateSword(s,now)),undefined);
  session.start();assert.equal(session.change(s=>activateSword(s,now)).ok,true);
  assert.deepEqual(writes,[SAVE_KEY+'-backup',SAVE_KEY]);
  assert.equal(parseSave(values.get(SAVE_KEY),now).swordActivatedAt,T);
  session.pause();now+=20000;session.start();
  assert.equal(session.change(s=>activateSword(s,now)).reason,'cooldown');
  assert.equal(swordSkillStatus(session.state,now).activeMs,10000);session.pause();
});
test('skill buttons update at expiry and recharge without recreating markup',()=>{
  const button={textContent:'',hidden:false,disabled:false,classList:{toggle(){}}};const root={querySelectorAll:()=>[button]};
  const s=general();syncSwordControls(root,s,true,T);assert.equal(button.disabled,false);
  activateSword(s,T);syncSwordControls(root,s,true,T+29000);assert.match(button.textContent,/1초 남음/);
  syncSwordControls(root,s,true,T+30000);assert.match(button.textContent,/9:30/);assert.equal(button.disabled,true);
  syncSwordControls(root,s,true,T+600000);assert.equal(button.disabled,false);
  syncSwordControls(root,s,false,T+600000);assert.equal(button.disabled,true);
});
test('ceremonial pixel drawings are detailed, distinct and cached by level',()=>{
  const sword=personalIcon('sword'),baton=personalIcon('baton',1),upgraded=personalIcon('baton',2);
  for(const svg of [sword,baton,upgraded]){assert.match(svg,/0 0 192 256/);assert.ok((svg.match(/<rect/g)??[]).length>100);assert.doesNotMatch(svg,/<image|https?:/);}
  assert.notEqual(baton,upgraded);assert.notEqual(baton,sword);assert.equal(personalIcon('sword'),sword);
});

test('owned sword card retains valid article attributes and exactly one skill button',()=>{
  const html=personalMarkup(general());
  assert.match(html,/<article class="personal-item" data-personal-equipment="generalSword">/);
  assert.equal((html.match(/data-use-sword/g)??[]).length,1);
  assert.equal((html.match(/<button class="sword-skill-button"/g)??[]).length,1);
});
