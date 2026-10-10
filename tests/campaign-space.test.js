import test from 'node:test';
import assert from 'node:assert/strict';
import {CONTINENTS,COUNTRIES,campaignStages,countryProgress,continentForProgress} from '../src/campaign.js';
import {CAMPAIGN_STAGE_COUNT} from '../src/campaign-constants.js';
import {campaignMarkup} from '../src/campaign-map.js';
import {campaignHomeCamera} from '../src/campaign-geometry.js';
import {mapDefs,oceanArt,countryLand} from '../src/campaign-art.js';
import {campaignBonusPercent,regionIncomePercent,withCampaignIncome} from '../src/campaign-rewards.js';
import {RANKS,RANK_REQUIREMENTS} from '../src/ranks.js';
import {FORMATIONS} from '../src/formations.js';
import {createBattle} from '../src/battle.js';
import {referenceArmy,simulateBattle} from '../tools/campaign-sim.mjs';
import {exact} from '../src/money.js';

test('a second original continent has four sequential nations and eighty uniquely named regions',()=>{
  assert.equal(CONTINENTS.length,2);assert.equal(campaignStages.length,CAMPAIGN_STAGE_COUNT);
  for(const continent of CONTINENTS){
    const countries=COUNTRIES.filter(c=>c.continentId===continent.id);
    assert.equal(countries.length,4);assert.equal(countries[0].firstStage,continent.firstStage);assert.equal(countries.at(-1).lastStage,continent.lastStage);
    assert.deepEqual(countries.map(c=>c.localIndex),[0,1,2,3]);
    for(const c of countries)assert.equal(c.names.length,20);
  }
  assert.equal(countryProgress({campaignCleared:79},'elysia').unlocked,false);
  assert.equal(countryProgress({campaignCleared:80},'elysia').unlocked,true);
  assert.equal(countryProgress({campaignCleared:99},'varkion').unlocked,false);
  assert.equal(countryProgress({campaignCleared:100},'varkion').unlocked,true);
  assert.equal(continentForProgress(79).id,'astera');assert.equal(continentForProgress(80).id,'aetherion');
});

test('space capital targets span galactic brigadier to galactic marshal and use the matching HQ',()=>{
  for(const [id,rank] of [[81,'부사령관'],[100,'은하 준장'],[120,'은하 소장'],[130,'은하 중장'],[140,'은하 대장'],[160,'은하 원수']]){
    const stage=campaignStages[id-1];
    assert.equal(stage.recommendedRank,rank);assert.equal(stage.recommendedPower,RANK_REQUIREMENTS[RANKS.indexOf(rank)]);
    assert.equal(stage.theme,'space');assert.equal(stage.formationId,FORMATIONS.find(f=>f.size<=stage.recommendedPower).id);
    assert.ok(Number.isSafeInteger(stage.recommendedPower));assert.ok(Number.isFinite(stage.hqPower)&&stage.hqPower>0);
  }
  for(let i=80;i<160;i++)assert.ok(campaignStages[i].recommendedPower>campaignStages[i-1].recommendedPower);
});

test('continent navigation shows four nations, locked entry, direct crossing and a return route',()=>{
  const before=campaignMarkup({campaignCleared:79});
  assert.match(before,/data-continent="aetherion"[^>]*disabled/);
  const space=campaignMarkup({campaignCleared:80});
  assert.match(space,/에테리온 대륙/);assert.match(space,/data-map-theme="space"/);
  assert.equal((space.match(/class="nation-tab /g)??[]).length,4);assert.doesNotMatch(space,/coast-serdin/);
  const earth=campaignMarkup({campaignCleared:160},null,null,null,'astera');
  assert.match(earth,/아스테라 대륙/);assert.match(earth,/4\/4 점령/);assert.doesNotMatch(earth,/coast-elysia/);
  assert.match(campaignMarkup({campaignCleared:80},'norgard',80),/data-country="elysia"[^>]*>.*다음 대륙 · 에테리온/);
  assert.match(campaignMarkup({campaignCleared:80},'elysia',81),/data-country="norgard"[^>]*>.*이전 대륙 · 아스테라/);
  for(const aspect of [.5,1,3]){
    const cam=campaignHomeCamera(80,aspect,'aetherion');
    assert.ok(Math.abs(cam.y+cam.height/2-COUNTRIES[4].label[1])<1 || cam.height>1500);
  }
});

test('space map artwork is cached, scoped to its continent and all local paint references resolve',()=>{
  const countries=COUNTRIES.slice(4);
  const art=mapDefs('aetherion')+oceanArt('space')+countries.map(countryLand).join('');
  assert.equal(oceanArt('space'),oceanArt('space'));
  assert.doesNotMatch(art,/undefined|NaN|Infinity|coast-serdin/);
  assert.notEqual(oceanArt('space'),oceanArt('earth'));
  const ids=[...art.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
  for(const [,id]of art.matchAll(/url\(#([^)]*)\)/g))assert.ok(ids.includes(id),id);
  for(const c of countries)assert.equal(countryLand(c),countryLand(c));
});

test('original conquests keep one percent and space conquests add two percent without compounding',()=>{
  for(const id of [1,20,80])assert.equal(regionIncomePercent(id),1);
  for(const id of [81,100,160])assert.equal(regionIncomePercent(id),2);
  for(const id of [0,161,1.5])assert.throws(()=>regionIncomePercent(id),RangeError);
  for(const [count,bonus]of [[0,0],[80,80],[81,82],[100,120],[120,160],[140,200],[160,240],[999,240]]){
    assert.equal(campaignBonusPercent({campaignCleared:count}),bonus);
    const value=9007199254740993n;
    assert.equal(exact(withCampaignIncome({campaignCleared:count},value)),value*BigInt(100+bonus)/100n);
  }
});

test('space capitals reward appropriate forces and preparation without a hard rank attempt gate',()=>{
  for(const id of [100,120,140,160]){
    const stage=campaignStages[id-1],expected=simulateBattle(referenceArmy(stage),id);
    assert.equal(expected.status,'victory',String(id));
    assert.ok(expected.elapsedMs>=60000&&expected.elapsedMs<=120000,`${id}: ${expected.elapsedMs}ms`);
    const under=referenceArmy(stage,{power:stage.recommendedPower/4});
    assert.equal(createBattle(under,id).status,'running');
    const weak=simulateBattle(under,id);assert.ok(weak.status!=='victory'||weak.elapsedMs>120000,`quarter power ${id} must miss the recommended clear time`);
    const strong=simulateBattle(referenceArmy(stage,{power:stage.recommendedPower*2}),id);
    assert.equal(strong.status,'victory',`double power ${id}`);assert.ok(strong.elapsedMs<=expected.elapsedMs);
    assert.notEqual(simulateBattle(referenceArmy(stage),id,{policy:'none'}).status,'victory');
  }
});
