import test from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES,countryProgress,campaignStages } from '../src/campaign.js';
import { countryRegions,inside,clampCamera,countryCamera,campaignHomeCamera } from '../src/campaign-geometry.js';
import { campaignMarkup } from '../src/campaign-map.js';
import { freshState,parseSave,MAX_SOLDIERS } from '../src/game.js';
import { UNITS,armyPower } from '../src/units.js';
import { EQUIPMENT } from '../src/equipment.js';
import { createBattle,advanceBattle,fireVolley } from '../src/battle.js';
import { recordBattleVictory } from '../src/battle-progress.js';
import { RANKS,rankForArmy,GENERAL_MIN_SOLDIERS } from '../src/ranks.js';
const T=1_800_000_000_000;
test('wide landscape maps start centered on the next country after width clamping',()=>{
  for(const aspect of [3,3.8,5])for(const cleared of [20,40]){
    const camera=campaignHomeCamera(cleared,aspect),country=COUNTRIES[cleared/20];
    assert.ok(Math.abs(camera.y+camera.height/2-country.label[1])<1);
    assert.ok(camera.width<=2600);assert.equal(camera.width/camera.height,aspect);
  }
});
function army(power,level=8,copies=1){
  const state={...freshState(T),soldiers:0,sergeants:300,campaignCleared:80,ncoSchoolLevel:5,officerSchoolLevel:power>=655360?5:power>=327680?4:power>=20480?3:0};
  const roster=Object.values(UNITS).slice(2,power>=655360?10:power>=327680?9:power>=20480?8:5);
  for(const u of roster)state[u.field]=10;
  const shortage=GENERAL_MIN_SOLDIERS-(power-armyPower(state));
  if(shortage>0){const strongest=roster.at(-1);state[strongest.field]-=Math.ceil(shortage/strongest.power);}
  state.soldiers=power-armyPower(state);
  for(const [i,id]of ['artillery','tank','selfPropelled','helicopter','rocketLauncher'].entries())state.equipment[id]={level,count:copies,deployed:i>0};
  return state;
}
function simulate(state,id,taps=2){
  let battle=createBattle(state,id),nextTap=0;
  while(battle.status==='running'){
    if(taps>0&&battle.elapsedMs>=nextTap){battle=fireVolley(battle);nextTap+=1000/taps;}
    battle=advanceBattle(battle,50);
  }return battle;
}
test('four original countries each contain twenty ordered, progressively stronger regions',()=>{
  assert.equal(COUNTRIES.length,4);assert.equal(campaignStages.length,80);
  assert.equal(new Set(campaignStages.map(s=>s.name)).size,80);
  for(const country of COUNTRIES){
    const stages=campaignStages.filter(s=>s.countryId===country.id);assert.equal(stages.length,20);
    assert.equal(stages.at(-1).capital,true);assert.equal(stages.filter(s=>s.capital).length,1);
    for(let i=1;i<20;i++){assert.ok(stages[i].recommendedPower>stages[i-1].recommendedPower);assert.ok(stages[i].hqPower>stages[i-1].hqPower);assert.ok(stages[i].enemyPower*stages[i].enemyModifier>stages[i-1].enemyPower*stages[i-1].enemyModifier);}
  }
  assert.equal(campaignStages[19].recommendedPower,81920);assert.ok(campaignStages.at(-1).recommendedPower<=MAX_SOLDIERS);
});
test('only conquest of all twenty regions unlocks the next country, including replays and final completion',()=>{
  const state={...army(81920),campaignCleared:0};
  for(let cleared=0;cleared<=80;cleared++){
    state.campaignCleared=cleared;
    for(const [i,c]of COUNTRIES.entries()){
      const p=countryProgress(state,c.id);assert.equal(p.unlocked,cleared>=i*20);assert.equal(p.complete,cleared>=(i+1)*20);assert.equal(p.cleared,Math.max(0,Math.min(20,cleared-i*20)));
    }
  }
  state.campaignCleared=19;assert.throws(()=>createBattle(state,21),RangeError);
  const result=simulate(state,20);assert.equal(result.status,'victory');assert.equal(recordBattleVictory(state,result).ok,true);
  assert.equal(countryProgress(state,'veloc').unlocked,true);assert.equal(createBattle(state,21).stageId,21);
  assert.equal(recordBattleVictory(state,result).firstClear,false);assert.equal(state.campaignCleared,20);
});
test('every recommended force can win its region with two taps per second and stated equipment',()=>{
  for(const stage of campaignStages){
    const state=army(stage.recommendedPower,stage.id<=20?8:10,stage.id<=20?1:3),before=structuredClone(state);
    assert.equal(RANKS[rankForArmy(state)],stage.recommendedRank);
    const result=simulate(state,stage.id);
    assert.equal(result.status,'victory',`${stage.enemyName} ${stage.region}`);
    assert.ok(result.elapsedMs<180000);assert.deepEqual(state,before);
  }
});
test('first capital targets corps strength without hard power gates; preparation and investment matter',()=>{
  const ordinary=simulate(army(81920),20);assert.equal(ordinary.status,'victory');
  assert.ok(ordinary.elapsedMs>=25000&&ordinary.elapsedMs<=55000);
  assert.ok(ordinary.player.hq.hp/ordinary.player.hq.maxHp>.15&&ordinary.player.hq.hp/ordinary.player.hq.maxHp<.5);
  for(const power of [20480,40960,61440])assert.equal(simulate(army(power),20).status,'defeat');
  assert.equal(simulate(army(40960,10),20,6.67).status,'defeat');
  assert.equal(simulate(army(81920),20,0).status,'defeat');
  // Higher investment and skill can intentionally beat the recommendation early.
  assert.equal(simulate(army(61440,10,4),20,6).status,'victory');
  assert.equal(createBattle({...army(20480),campaignCleared:19},20).status,'running');
});
test('legacy combat records are preserved without skipping any new conquest region',()=>{
  for(const version of [7,8,9,10,11,12,13,14]){
    const old={...freshState(T),version,battleCleared:10,campaignCleared:80,gold:1234567,soldiers:5000,sergeants:300};
    const migrated=parseSave(JSON.stringify(old),T);assert.ok(migrated);
    assert.equal(migrated.version,19);assert.equal(migrated.battleCleared,10);assert.equal(migrated.campaignCleared,0);
    assert.equal(migrated.gold,old.gold);assert.equal(migrated.soldiers,old.soldiers);
  }
  for(const cleared of [0,19,20,39,40,59,60,79,80]){
    const current={...army(81920),campaignCleared:cleared},loaded=parseSave(JSON.stringify(current),T);
    assert.equal(loaded.campaignCleared,cleared);assert.equal(armyPower(loaded),armyPower(current));assert.deepEqual(loaded.equipment,current.equipment);assert.deepEqual(parseSave(JSON.stringify(loaded),T),loaded);
  }
  for(const invalid of [-1,81,.5,'20',null,undefined])assert.equal(parseSave(JSON.stringify({...freshState(T),campaignCleared:invalid}),T),null);
});
test('country geometry produces twenty cached regions with interior labels and no territorial gaps',()=>{
  for(const country of COUNTRIES){
    const regions=countryRegions(country.id);assert.equal(regions.length,20);assert.equal(countryRegions(country.id),regions);
    for(const r of regions){assert.ok(inside(r.point,country.polygon));assert.ok(inside(r.point,r.polygon));assert.ok(r.polygon.length>=3);}
    for(let x=113.7;x<900;x+=31.7)for(let y=111.3;y<2330;y+=37.9)if(inside([x,y],country.polygon))assert.equal(regions.filter(r=>inside([x,y],r.polygon)).length,1);
  }
});
test('camera bounds prevent empty-ocean traps at desktop and phone aspect ratios',()=>{
  for(const aspect of [.5,.75,1,1.8])for(const c of COUNTRIES){
    const camera=countryCamera(c,aspect);assert.ok(camera.width>=360&&camera.width<=2600);
    for(const r of countryRegions(c.id))assert.ok(r.point[0]>=camera.x&&r.point[0]<=camera.x+camera.width&&r.point[1]>=camera.y&&r.point[1]<=camera.y+camera.height);
    for(const x of [-1e6,1e6])for(const y of [-1e6,1e6]){
      const pan=clampCamera({...camera,x,y});assert.ok(Number.isFinite(pan.x)&&Number.isFinite(pan.y));assert.ok(pan.x<=1320&&pan.y<=2580&&pan.x+pan.width>=-320&&pan.y+pan.height>=-100);
    }
  }
});
test('region UI exposes all twenty regions, lock reasons, replay, next-country and correct capital information',()=>{
  for(const c of COUNTRIES){
    const state={...army(c.powers[19]),campaignCleared:c.lastStage-1};
    const html=campaignMarkup(state,c.id,c.lastStage);
    assert.equal((html.match(/class="region-hit /g)??[]).length,20);
    assert.match(html,new RegExp(c.names[19]));assert.match(html,/최종 수도전/);assert.match(html,/진격 준비/);
    assert.doesNotMatch(html,/undefined|NaN/);
    for(const control of ['data-world','data-zoom="in"','data-zoom="out"','data-locate'])assert.ok(html.includes(control));
  }
});

test('supply support preserves the first-capital corps target with ordinary one-copy investment',()=>{
  for(const power of [20480,40960,61440,81920]){
    const s=army(power);s.equipment.transport={level:8,count:1,deployed:false};
    if(power>=81920)s.equipment.fighter={level:8,count:1,deployed:false};
    assert.equal(simulate(s,20).status,power>=81920?'victory':'defeat',String(power));
  }
});

test('completed country maps offer a direct northern route only to the next unlocked country',()=>{
  for(const c of COUNTRIES){
    assert.doesNotMatch(campaignMarkup({campaignCleared:c.lastStage-1},c.id,c.lastStage),/class="atlas-next-country"/);
    const completed=campaignMarkup({...army(81920),campaignCleared:c.lastStage},c.id,c.firstStage);
    if(c.index<3){
      const next=COUNTRIES[c.index+1];
      assert.match(completed,new RegExp('class="atlas-next-country" data-country="'+next.id+'"'));
      assert.match(completed,new RegExp('다음 나라 · '+next.name));
      assert.ok(completed.indexOf('class="atlas-next-country"')<completed.indexOf('class="atlas-window"'));
      assert.match(completed,/다시 도전/);
    }else assert.doesNotMatch(completed,/class="atlas-next-country"/);
  }
  assert.doesNotMatch(campaignMarkup({campaignCleared:80}),/class="atlas-next-country"/);
});

test('upper countries provide a southern route to the conquered previous country, including while unfinished',()=>{
  for(const c of COUNTRIES){
    for(const cleared of [c.firstStage-1,c.lastStage]){
      const html=campaignMarkup({...army(81920),campaignCleared:cleared},c.id,c.firstStage);
      const route=html.match(/<button class="atlas-previous-country"[^>]*>[\s\S]*?<\/button>/)?.[0];
      if(c.index===0){assert.equal(route,undefined);continue;}
      const previous=COUNTRIES[c.index-1];
      assert.ok(route,`${c.id} after ${cleared} clears needs a return route`);
      assert.ok(route.includes(`data-country="${previous.id}"`));
      assert.ok(route.includes(`이전 나라 · ${previous.name}`));
      assert.ok(html.indexOf(route)>html.indexOf('</svg>\n  <div class="atlas-compass"'));
    }
  }
  assert.ok(!campaignMarkup({campaignCleared:80}).includes('class="atlas-previous-country"'));
  assert.ok(!campaignMarkup({campaignCleared:19},'veloc',21).includes('class="atlas-previous-country"'));
});
