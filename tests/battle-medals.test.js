import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, parseSave, perSecond, perTap } from '../src/game.js';
import { BATTLE_ACHIEVEMENTS, FORMATION_ACHIEVEMENTS, reconcileAchievements, achievementProgress } from '../src/achievements.js';
import { COUNTRIES } from '../src/campaign.js';
import { achievementListMarkup } from '../src/achievement-markup.js';
import { medalSvg } from '../src/achievement-art.js';
const T=1800000000000;
test('combat medals use unique conquered regions and each country capital, never army power or old stages',()=>{
  assert.deepEqual(BATTLE_ACHIEVEMENTS.map(a=>a.required),[1,5,10,...COUNTRIES.map(c=>c.lastStage)]);
  const s={...freshState(T),soldiers:1000000,battleCleared:10};
  assert.deepEqual(reconcileAchievements(s),FORMATION_ACHIEVEMENTS.filter(a=>a.required<=s.soldiers).map(a=>a.id));
  for(const a of BATTLE_ACHIEVEMENTS)assert.equal(achievementProgress(s,a.id).current,0);
});
test('each conquest boundary awards once, preserves order and does not affect economic bonuses',()=>{
  const s=freshState(T);
  for(const [i,a] of BATTLE_ACHIEVEMENTS.entries()){
    s.campaignCleared=a.required-1;reconcileAchievements(s);
    assert.deepEqual(s.earnedAchievements,BATTLE_ACHIEVEMENTS.slice(0,i).map(a=>a.id));
    const previous=s.earnedAchievements, income=perSecond(s), tap=perTap(s,T);
    s.campaignCleared++;assert.deepEqual(reconcileAchievements(s),[a.id]);
    assert.notEqual(s.earnedAchievements,previous);assert.equal(previous.length,i);
    assert.deepEqual(reconcileAchievements(s),[]);
    assert.equal(perSecond(s),income);assert.equal(perTap(s,T),tap);
  }
});
test('existing version fifteen conquest saves receive earned medals on load while preserving all assets',()=>{
  for(const cleared of [0,1,4,5,9,10,19,20,39,40,59,60,79,80]){
    const old={...freshState(T),soldiers:80,gold:987654321,taps:93,battleCleared:10,campaignCleared:cleared,earnedAchievements:['squad','platoon'],swordActivatedAt:T-17000};
    const expected=[...old.earnedAchievements,...BATTLE_ACHIEVEMENTS.filter(a=>a.required<=cleared).map(a=>a.id)];
    const loaded=parseSave(JSON.stringify(old),T);
    assert.deepEqual(loaded,{...old,earnedAchievements:expected});
    assert.deepEqual(parseSave(JSON.stringify(loaded),T),loaded);
  }
});
test('old campaign-less saves start combat awards at zero and earned awards remain permanent',()=>{
  const old={...freshState(T),version:14,battleCleared:10,campaignCleared:80};
  assert.deepEqual(parseSave(JSON.stringify(old),T).earnedAchievements,[]);
  const s={...freshState(T),campaignCleared:80};reconcileAchievements(s);
  s.campaignCleared=0;
  for(const a of BATTLE_ACHIEVEMENTS){assert.equal(achievementProgress(s,a.id).ratio,1);assert.equal(achievementProgress(s,a.id).earned,true);}
  assert.deepEqual(reconcileAchievements(s),[]);
});
test('combat list explains region totals and country conditions with distinct detailed emblems',()=>{
  const s={...freshState(T),campaignCleared:19};reconcileAchievements(s);
  const html=achievementListMarkup(s,'conquer-serdin');
  assert.match(html,/대륙 정복 · 7종/);assert.match(html,/19 \/ 20/);
  assert.match(html,/재도전 승리는 중복 집계하지 않습니다/);
  for(const c of COUNTRIES)assert.ok(html.includes(`${c.name} 20개 지역과 수도 점령`));
  assert.doesNotMatch(html,/undefined|NaN/);
  const art=BATTLE_ACHIEVEMENTS.map(a=>medalSvg(a.id));
  assert.equal(new Set(art.map(svg=>svg.replace(/#[0-9a-f]{6}/g,'color'))).size,7);
});
