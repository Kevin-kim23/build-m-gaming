import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, createBattle, defaultLoadout, advanceBattle, deploy, UNIT_TRAITS, equipmentCombatStats, BATTLE_RULES } from '../src/battle.js';
import { stageEnemyType } from '../src/battle-balance.js';
import { chooseEnemyDeployment, enemyTargetScore } from '../src/battle-ai.js';
import { CONTINENTS } from '../src/campaign.js';
import { campaignDifficulty } from '../src/campaign-progression.js';
import { referenceArmy } from '../tools/campaign-sim.mjs';
import { stageTagsMarkup, battleDetailMarkup } from '../src/battle-markup.js';
import { deckBoardMarkup, freshDeckView } from '../src/loadout-deck.js';

function prepared(stageId=1,gear='tank') {
  const state=referenceArmy(STAGES[159]);state.campaignCleared=200;
  state.equipment[gear]={level:0,count:1,deployed:true};
  let battle=createBattle(state,stageId,{equipment:[gear]});
  battle.enemy.nextSpawnMs=Infinity;
  battle.enemy.turret.nextShotMs=battle.player.turret.nextShotMs=Infinity;
  battle.mana=100;
  battle.enemy.hq.hp=battle.enemy.hq.maxHp=1e18;
  return {state,battle};
}

test('unit damage is independent of both classes, side, and campaign country',()=>{
  for(const stageId of [1,22,80,160,200])for(const side of ['player','enemy'])for(const attacker of ['armor','air','firepower','support'])for(const target of ['armor','air','firepower','support']) {
    let {battle}=prepared(stageId);
    battle=deploy(battle,'tank');
    const unit=battle.player.units[0];
    Object.assign(unit,{cls:attacker,x:500,damage:100,nextShotMs:0,speed:0,hp:10000,maxHp:10000});
    const foe={...unit,uid:99,side:'enemy',dir:-1,cls:target,x:540,damage:0,nextShotMs:Infinity};
    battle.enemy.units=[foe];
    if(side==='enemy') {
      Object.assign(unit,{damage:0,nextShotMs:Infinity,cls:target});
      Object.assign(foe,{damage:100,nextShotMs:0,cls:attacker});
    }
    const result=advanceBattle(battle,50), hit=result[side==='player'?'enemy':'player'].units[0];
    assert.equal(10000-hit.hp,100,`${stageId} ${side} ${attacker} -> ${target}`);
  }
});

test('capital headquarters receive full ordinary and strike damage from every equipment class',()=>{
  for(const stageId of [20,40,60,80,100,120,140,160,180,200]) {
    for(const cls of ['armor','air','firepower']) {
      let {battle}=prepared(stageId);battle=deploy(battle,'tank');
      Object.assign(battle.player.units[0],{cls,x:1000,damage:100,nextShotMs:0});
      battle.enemy.hq.hp=battle.enemy.hq.maxHp=10000;
      assert.equal(10000-advanceBattle(battle,50).enemy.hq.hp,100);
    }
    const {battle}=prepared(stageId,'icbm');
    const expected=equipmentCombatStats('icbm',0).damage*BATTLE_RULES.strikeMultiplier;
    battle.enemy.hq.hp=battle.enemy.hq.maxHp=expected*100;
    const result=deploy(battle,'icbm');
    assert.ok(Math.abs(battle.enemy.hq.hp-result.enemy.hq.hp-expected)<expected*1e-10);
  }
});

test('recommended equipment does not change when only the selected stage changes',()=>{
  const state=referenceArmy(STAGES[159]);
  const expected=defaultLoadout(state);
  for(const stage of STAGES)assert.deepEqual(defaultLoadout(state,stage.id),expected);
});

test('enemy decisions preserve threatened lanes and readiness but ignore category labels',()=>{
  const battle={elapsedMs:20000,stageId:20,player:{units:[{lane:2,cls:'armor',damage:100,intervalMs:1000,hp:100,x:800}]},enemy:{units:[],spawned:0,mana:100,ready:{}}};
  const legacyRules={air:'armor',armor:'firepower',firepower:'air'};
  const first=chooseEnemyDeployment(battle,['tank','helicopter'],UNIT_TRAITS,legacyRules);
  assert.equal(first.lane,2);
  for(const cls of ['armor','air','firepower']) {
    battle.player.units[0].cls=cls;
    assert.deepEqual(chooseEnemyDeployment(battle,['tank','helicopter'],UNIT_TRAITS,legacyRules),first);
    assert.equal(enemyTargetScore({cls}, {cls:'armor',hp:1000,x:700},40,legacyRules),960);
  }
  battle.enemy.ready[first.id]=30000;
  assert.notEqual(chooseEnemyDeployment(battle,['tank','helicopter'],UNIT_TRAITS).id,first.id);
  battle.enemy.mana=0;
  assert.equal(chooseEnemyDeployment(battle,['tank','helicopter'],UNIT_TRAITS),null);
});

test('cards, stage chips and details retain roles and mana without matchup claims',()=>{
  const state=referenceArmy(STAGES[159]);
  for(const stage of [STAGES[6],STAGES[19],STAGES[59],STAGES[159]]) {
    const card=deckBoardMarkup(state,freshDeckView(['tank']));
    assert.doesNotMatch(card+stageTagsMarkup(stage)+battleDetailMarkup(state,stage).body,/상성|유리|불리|약화|방어 장갑|피해 -40%|gear-tile mini (good|bad)/);
    assert.match(card,/마나 24/);
    assert.doesNotMatch(card.replaceAll('공중요새',''),/화력|기갑|공중|지원|cls-/,'deck cards share one look with no class labels');
    assert.equal(Object.hasOwn(stageEnemyType(stage.id),'counter'),false);
  }
});

test('all 200 stage names use continent-local numbers while internal IDs and difficulty stay intact',()=>{
  assert.deepEqual(CONTINENTS.map(c=>c.lastStage-c.firstStage+1),[80,80,40]);
  for(const continent of CONTINENTS)for(let id=continent.firstStage;id<=continent.lastStage;id++) {
    const stage=STAGES[id-1],local=id-continent.firstStage+1;
    assert.equal(stage.id,id);
    assert.equal(stage.name,`${continent.name} 스테이지 ${local}`);
    assert.equal(stage.shortName,`스테이지 ${local}`);
    assert.equal(stage.hqPower,campaignDifficulty(id).hqPower);
    assert.equal(stage.continentId,continent.id);
  }
});
