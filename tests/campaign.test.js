import { SAVE_VERSION } from '../src/state.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES,countryProgress,campaignStages } from '../src/campaign.js';
import { countryRegions,inside,clampCamera,countryCamera,campaignHomeCamera } from '../src/campaign-geometry.js';
import { campaignMarkup } from '../src/campaign-map.js';
import { freshState,parseSave } from '../src/game.js';
import {MAX_ARMY_POWER} from '../src/state.js';
import { UNITS,armyPower } from '../src/units.js';
import { EQUIPMENT } from '../src/equipment.js';
import { createBattle } from '../src/battle.js';
import {referenceArmy,simulateBattle} from '../tools/campaign-sim.mjs';
import { recordBattleVictory } from '../src/battle-progress.js';
import { isFortress } from '../src/battle-balance.js';
import { RANKS,rankForArmy } from '../src/ranks.js';
const T=1_800_000_000_000;
test('wide landscape maps start centered on the next country after width clamping',()=>{
  for(const aspect of [3,3.8,5])for(const cleared of [20,40]){
    const camera=campaignHomeCamera(cleared,aspect),country=COUNTRIES[cleared/20];
    assert.ok(Math.abs(camera.y+camera.height/2-country.label[1])<1);
    assert.ok(camera.width<=2600);assert.equal(camera.width/camera.height,aspect);
  }
});
function army(power,level=6,copies=1){
 const s=referenceArmy({id:1,recommendedPower:power,recommendedLevel:level});s.campaignCleared=80;
 for(const gear of Object.values(s.equipment))if(gear)gear.count=copies;
 return s;
}
function simulate(state,id,policy='cycle'){return simulateBattle(state,id,{policy:policy==='cycle'?'defend':policy});}

test('four original countries each contain twenty ordered, progressively stronger regions',()=>{
  assert.equal(COUNTRIES.length,10);assert.equal(campaignStages.length,200);
  assert.equal(new Set(campaignStages.map(s=>s.name)).size,200);
  for(const country of COUNTRIES){
    const stages=campaignStages.filter(s=>s.countryId===country.id);assert.equal(stages.length,20);
    assert.equal(stages.at(-1).capital,true);assert.equal(stages.filter(s=>s.capital).length,1);
    for(let i=1;i<20;i++){assert.ok(stages[i].recommendedPower>stages[i-1].recommendedPower);assert.ok(stages[i].enemyPower*stages[i].enemyModifier>stages[i-1].enemyPower*stages[i-1].enemyModifier);}
  }
  assert.equal(campaignStages[19].recommendedPower,5120);assert.ok(campaignStages.at(-1).recommendedPower<=MAX_ARMY_POWER);
});
test('only conquest of all twenty regions unlocks the next country, including replays and final completion',()=>{
  const state={...army(81920),campaignCleared:0};
  for(let cleared=0;cleared<=160;cleared++){
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
test('every recommended force can win by deploying available equipment to defend threatened lanes',()=>{
  for(const stage of campaignStages.slice(0,160)){
    const state={...referenceArmy(stage),campaignCleared:160},before=structuredClone(state);
    assert.equal(RANKS[rankForArmy(state)],stage.recommendedRank);
    const result=simulate(state,stage.id);
    assert.equal(result.status,'victory',`${stage.enemyName} ${stage.region}`);
    assert.ok(result.elapsedMs<180000);assert.deepEqual(state,before);
  }
});
test('first capital targets colonel strength without hard power gates; preparation and investment matter',()=>{
  const ordinary=simulate(army(5120),20);assert.equal(ordinary.status,'victory');
  assert.ok(ordinary.elapsedMs>=60000&&ordinary.elapsedMs<=120000);
  for(const power of [640,1280])assert.notEqual(simulate(army(power,3),20).status,'victory');
  assert.ok(simulate(army(3840),20).elapsedMs>=ordinary.elapsedMs);
  const early=simulate(army(2560),20);
  assert.ok(early.elapsedMs>=ordinary.elapsedMs);
  // Removing category resistance allows a sufficiently enhanced early army to clear slowly.
  assert.equal(simulate(army(1280,6),20).status,'victory');
  assert.notEqual(simulate(army(81920),20,'none').status,'victory');
  // Higher investment can intentionally beat the recommendation early.
  assert.equal(simulate(army(5120,10),20).status,'victory');
  assert.equal(createBattle({...army(1280),campaignCleared:19},20).status,'running');
});
test('legacy combat records are preserved without skipping any new conquest region',()=>{
  for(const version of [7,8,9,10,11,12,13,14]){
    const old={...freshState(T),version,battleCleared:10,campaignCleared:80,gold:1234567,soldiers:5000,sergeants:300};
    const migrated=parseSave(JSON.stringify(old),T);assert.ok(migrated);
    assert.equal(migrated.version,SAVE_VERSION);assert.equal(migrated.battleCleared,10);assert.equal(migrated.campaignCleared,0);
    assert.equal(migrated.gold,old.gold);assert.equal(migrated.soldiers,old.soldiers);
  }
  for(const cleared of [0,19,20,39,40,59,60,79,80]){
    const current={...army(81920),campaignCleared:cleared},loaded=parseSave(JSON.stringify(current),T);
    assert.equal(loaded.campaignCleared,cleared);assert.equal(armyPower(loaded),armyPower(current));assert.deepEqual(loaded.equipment,current.equipment);assert.deepEqual(parseSave(JSON.stringify(loaded),T),loaded);
  }
  for(const invalid of [-1,201,.5,'20',null,undefined])assert.equal(parseSave(JSON.stringify({...freshState(T),campaignCleared:invalid}),T),null);
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
test('the conquest road exposes every stage of the continent, lock reasons, replay and correct capital information',()=>{
  for(const c of COUNTRIES){
    const state={...army(c.powers[19]),campaignCleared:c.lastStage-1};
    const html=campaignMarkup(state,c.id,c.lastStage),total=c.continentId==='erebus'?40:80;
    assert.equal((html.match(/class="road-stop /g)??[]).length,total);
    assert.match(html,new RegExp(`class="road-stop frontier capital selected" data-region="${c.lastStage}"`));
    assert.match(html,new RegExp(campaignStages[c.lastStage-1].name));assert.match(html,/최종 수도전/);assert.match(html,/data-stage="[0-9]+"[^>]*>출격</);
    assert.doesNotMatch(html,/undefined|NaN/);
    assert.ok(html.includes('data-locate'));
    assert.ok(!html.includes('data-zoom')&&!html.includes('data-pan')&&!html.includes('data-world'));
  }
});

test('higher-rank support and air gear remain usable when replaying the first capital',()=>{
  for(const power of [20480,40960,81920]){
    const s=army(power);s.equipment.transport={level:8,count:1,deployed:false};
    if(power>=81920)s.equipment.fighter={level:8,count:1,deployed:false};
    const before=structuredClone(s);
    assert.equal(simulate(s,20).status,'victory',String(power));
    assert.deepEqual(s,before,'combat leaves owned gear and home deployment unchanged');
  }
});

test('finishing a nation continues on the same road, and the last nation of a continent unlocks the next continent tab',()=>{
  for(const c of COUNTRIES){
    const unfinished=campaignMarkup({...army(81920),campaignCleared:c.lastStage-1},c.id,c.firstStage);
    const completed=campaignMarkup({...army(81920),campaignCleared:c.lastStage},c.id,c.firstStage);
    assert.match(completed,/다시 출격/);
    const next=COUNTRIES[c.index+1];
    if(!next)continue;
    if(next.continentId===c.continentId){
      assert.match(completed,new RegExp(`class="road-stop frontier[^"]*" data-region="${next.firstStage}"`),`${next.id} opens on the same road`);
      assert.match(unfinished,new RegExp(`class="road-stop locked[^"]*" data-region="${next.firstStage}"`));
    }else{
      assert.match(unfinished,new RegExp(`data-continent="${next.continentId}"[^>]*disabled`));
      assert.doesNotMatch(completed,new RegExp(`data-continent="${next.continentId}"[^>]*disabled`));
    }
  }
});

test('earlier nations stay reachable on the road for replays, including while the current nation is unfinished',()=>{
  for(const c of COUNTRIES.filter(c=>c.index%4!==0&&c.continentId!=='erebus'||c.id==='mordrath')){
    const previous=COUNTRIES[c.index-1];
    const html=campaignMarkup({...army(81920),campaignCleared:c.firstStage-1},c.id,c.firstStage);
    assert.match(html,new RegExp(`class="road-stop occupied capital" data-region="${previous.lastStage}"`),`${previous.id} capital replay from ${c.id}`);
  }
});

test('country capitals connect colonel, lieutenant general, minor marshal and special marshal',()=>{
  const veloc=campaignStages.filter(s=>s.countryId==='veloc');
  assert.equal(veloc[0].recommendedPower,5747);assert.equal(veloc.at(-1).recommendedPower,81920);assert.equal(veloc.at(-1).recommendedRank,'중장');
  assert.equal(campaignStages.filter(s=>s.countryId==='istra').at(-1).recommendedRank,'소원수');
  assert.equal(campaignStages.filter(s=>s.countryId==='norgard').at(-1).recommendedRank,'대원수');
  for(let i=1;i<campaignStages.length;i++)assert.ok(campaignStages[i].recommendedPower>campaignStages[i-1].recommendedPower);
});
test('strategy matters: never sending equipment cannot take any capital fortress, while sending it wins',()=>{
  for(const stage of campaignStages.filter(s=>s.capital&&s.id<=160)){
    const state={...referenceArmy(stage),campaignCleared:160};
    assert.equal(simulate(state,stage.id).status,'victory',stage.name);
    assert.notEqual(simulate(state,stage.id,'none').status,'victory',stage.name);
  }
});
test('capital fortresses retain their existing headquarters and twenty-stage cadence',()=>{
  for(const stage of campaignStages.filter(s=>s.capital)){
    assert.ok(stage.hqPower>0);
    assert.equal(isFortress(stage.id),true);
  }
  assert.equal(isFortress(19),false);assert.equal(isFortress(20),true);assert.equal(isFortress(21),false);
});
