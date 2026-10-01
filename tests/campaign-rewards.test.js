import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignBonusPercent, withCampaignIncome } from '../src/campaign-rewards.js';
import { freshState, perSecond, perTap, accrue, parseSave, MAX_GOLD, activateAutoTouch } from '../src/game.js';
import { recordBattleVictory } from '../src/battle-progress.js';
import { COUNTRIES } from '../src/campaign.js';
import { updateCountryBrief } from '../src/campaign-brief.js';

const T=1_800_000_000_000;
const state=()=>({...freshState(T),soldiers:5000,sergeants:300,staffSergeants:20,masterSergeants:10,sergeantMajors:10,lieutenants:10,firstLieutenants:10,captains:120,ncoSchoolLevel:5,officerSchoolLevel:3});
const victory=id=>({stageId:id,status:'victory',enemy:{hq:{hp:0}},player:{hq:{hp:1}}});

test('conquest adds one percent per unique region up to eighty, rounding combined income once',()=>{
  for(const cleared of [0,1,20,40,60,80]){
    const s={campaignCleared:cleared};
    assert.equal(campaignBonusPercent(s),cleared);
    assert.equal(withCampaignIncome(s,12345),12345+Math.floor(12345*cleared/100));
  }
  assert.equal(campaignBonusPercent({campaignCleared:81}),80);
  assert.equal(campaignBonusPercent({campaignCleared:-1}),0);
  for(const bad of [NaN,Infinity,.5,'20',null,undefined])assert.equal(campaignBonusPercent({campaignCleared:bad}),0);
});
test('troops and deployed copies receive passive bonuses, while stored equipment and touch income do not',()=>{
  const s=state();s.equipment.tank={level:10,count:3,deployed:true};s.equipment.artillery={level:10,count:2,deployed:false};
  const baseline=perSecond(s),tap=perTap(s,T);
  s.campaignCleared=20;
  assert.equal(perSecond(s),baseline+Math.floor(baseline*.2));
  assert.equal(perTap(s,T),tap);
  s.equipment.artillery.count=99;assert.equal(perSecond(s),baseline+Math.floor(baseline*.2));
  const noBonus=structuredClone(s);noBonus.campaignCleared=0;
  for(const x of [s,noBonus]){assert.equal(activateAutoTouch(x,T).ok,true);accrue(x,T+60000);}
  assert.equal(s.autoTouchTicks,200);
  assert.equal(s.gold-noBonus.gold,(perSecond(s)-perSecond(noBonus))*60);
});
test('first victory settles the old rate before raising it, without a gold award; replays never stack',()=>{
  const s=state(),old=perSecond(s);
  assert.equal(recordBattleVictory(s,victory(1),T+1000).firstClear,true);
  assert.equal(s.gold,old);assert.equal(s.campaignCleared,1);
  const updated=perSecond(s);assert.equal(updated,old+Math.floor(old/100));
  assert.equal(recordBattleVictory(s,victory(1),T+2000).firstClear,false);
  assert.equal(s.gold,old+updated);assert.equal(s.campaignCleared,1);
  assert.equal(recordBattleVictory(s,victory(2),T+2000).firstClear,true);
  assert.equal(s.gold,old+updated);assert.equal(campaignBonusPercent(s),2);
});
test('defeats and out-of-order victories cannot grant income or conquest progress',()=>{
  const s=state(),before=structuredClone(s);
  for(const b of [{...victory(1),status:'defeat'},victory(2),{...victory(1),enemy:{hq:{hp:1}}}]){
    assert.equal(recordBattleVictory(s,b,T+5000).ok,false);assert.deepEqual(s,before);
  }
});
test('existing version sixteen conquests apply retroactively and survive reload without changing assets',()=>{
  for(const cleared of [1,19,20,79,80]){
    const original={...state(),campaignCleared:cleared,gold:123456};
    const loaded=parseSave(JSON.stringify(original),T);assert.ok(loaded);
    assert.equal(loaded.version,16);assert.equal(loaded.gold,original.gold);assert.equal(loaded.soldiers,original.soldiers);
    assert.deepEqual(loaded.equipment,original.equipment);assert.equal(campaignBonusPercent(loaded),cleared);
    assert.equal(perSecond(loaded),perSecond(original));
    assert.deepEqual(parseSave(JSON.stringify(loaded),T),loaded);
  }
});
test('bonus accrual is consistent across fractional ticks, offline time, reloads, and wallet limits',()=>{
  const whole={...state(),campaignCleared:80},ticks=structuredClone(whole);
  accrue(whole,T+10000);
  for(let i=1;i<=100;i++)accrue(ticks,T+i*100);
  assert.equal(ticks.gold,whole.gold);assert.equal(ticks.incomeRemainder,whole.incomeRemainder);
  const restored=parseSave(JSON.stringify(ticks),T+10000);
  accrue(restored,T+11000);assert.equal(restored.gold,perSecond(restored)*11);
  accrue(restored,T+11000);assert.equal(restored.gold,perSecond(restored)*11);
  restored.gold=MAX_GOLD-1;accrue(restored,T+12000);assert.equal(restored.gold,MAX_GOLD);assert.equal(restored.incomeRemainder,0);
  for(const id of ['helicopter','rocketLauncher','transport','fighter'])restored.equipment[id]={level:20,count:100000,deployed:true};
  restored.gold=0;assert.ok(Number.isSafeInteger(perSecond(restored)));
  accrue(restored,T+12000+Math.ceil(MAX_GOLD/perSecond(restored))*1000);
  assert.equal(restored.gold,MAX_GOLD);assert.equal(restored.incomeRemainder,0);
});
test('country details follow the viewed nation and explain locked entries outside the map',()=>{
  const nodes=Object.fromEntries(['title','detail','status','entry'].map(k=>['[data-country-'+k+']',{textContent:'',dataset:{},setAttribute(k,v){this[k]=v;}}]));
  const root={querySelector:()=>({querySelector:s=>nodes[s]})};
  for(const c of COUNTRIES){
    updateCountryBrief(root,{campaignCleared:0},c);
    assert.equal(nodes['[data-country-title]'].textContent,c.name);
    assert.ok(nodes['[data-country-detail]'].textContent.includes(c.powers.at(-1).toLocaleString('en-US')));
    assert.equal(nodes['[data-country-entry]'].disabled,c.index>0);
    assert.equal(nodes['[data-country-entry]'].dataset.country,c.id);
    updateCountryBrief(root,{campaignCleared:c.firstStage},c);
    assert.equal(nodes['[data-country-entry]'].disabled,false);
    assert.match(nodes['[data-country-status]'].textContent,/1\/20 점령/);
  }
});
