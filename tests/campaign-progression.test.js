import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,perSecond,parseSave} from '../src/game.js';
import {battleAccess,createBattle,STAGES,stageEnemyType} from '../src/battle.js';
import {campaignDifficulty,CAMPAIGN_MILESTONES} from '../src/campaign-progression.js';
import {EQUIPMENT,equipmentLevelLimit} from '../src/equipment.js';
import {RANKS,rankForArmy} from '../src/ranks.js';
import {referenceArmy,simulateBattle} from '../tools/campaign-sim.mjs';
import {battleGoldReward,battleRewardSeconds,battleStars} from '../src/campaign-rewards.js';
import {battleRewardPreview} from '../src/battle-reward-view.js';
import {recordBattleVictory} from '../src/battle-progress.js';
import {MAX_GOLD,serializeSave,exact} from '../src/money.js';
const T=1800000000000;
const win=id=>({stageId:id,status:'victory',elapsedMs:160000,enemy:{hq:{hp:0}},player:{hq:{hp:10,maxHp:100}}});

test('entry requires captain rank and known military gear; home storage does not prevent combat',()=>{
  const s={...freshState(T),soldiers:319};
  assert.equal(battleAccess(s).reason,'rank');s.equipment.artillery={level:0,count:1,deployed:true};
  assert.throws(()=>createBattle(s,1),/locked/);s.soldiers=320;
  assert.equal(battleAccess(s).unlocked,true);assert.equal(createBattle(s,1).deck[0].id,'artillery');
  s.equipment.artillery.deployed=false;assert.equal(battleAccess(s).unlocked,true);
  s.equipment={unknown:{level:20}};assert.equal(battleAccess(s).reason,'equipment');
  assert.throws(()=>createBattle(s,1),/locked/);
  assert.equal(battleAccess({...freshState(T),soldiers:4}).visible,true);
});

test('all eighty recommendations have legal rank, gear and upgrades, and reach special marshal exactly',()=>{
  assert.equal(STAGES[0].recommendedPower,320);assert.equal(STAGES[0].recommendedRank,'대위');
  assert.equal(STAGES[79].recommendedPower,335544320);assert.equal(STAGES[79].recommendedRank,'특전원수');
  for(const m of CAMPAIGN_MILESTONES)assert.equal(STAGES[m.stage-1].recommendedPower,m.power);
  for(const s of STAGES){
    const army=referenceArmy(s),rank=rankForArmy(army);
    assert.equal(RANKS[rank],s.recommendedRank);
    for(const [id,gear]of Object.entries(army.equipment))if(gear){
      assert.ok(rank>=RANKS.indexOf(EQUIPMENT[id].unlockRank));assert.ok(gear.level<=equipmentLevelLimit(army));assert.equal(gear.count,1);
    }
    for(const id of stageEnemyType(s.id).pool)assert.ok(rank>=RANKS.indexOf(EQUIPMENT[id].unlockRank));
    if(s.id>1)assert.ok(s.recommendedPower>STAGES[s.id-2].recommendedPower);
  }
  for(const id of [0,81,1.5,'1',NaN])assert.throws(()=>campaignDifficulty(id),RangeError);
});

test('reference defense with one decision per half-second fits 45–90s ordinary and 90–150s capital targets',()=>{
  for(const stage of STAGES){
    const s=referenceArmy(stage),before=serializeSave(s),b=simulateBattle(s,stage.id);
    assert.equal(b.status,'victory',`stage ${stage.id}`);
    assert.ok(b.elapsedMs>=(stage.capital?90000:45000)&&b.elapsedMs<=(stage.capital?150000:90000),`stage ${stage.id}: ${b.elapsedMs/1000}s`);
    assert.equal(serializeSave(s),before);
  }
});

test('not deploying cannot conquer any capital and the final capital resists a previous-rank force',()=>{
  for(const id of [1,20,40,60,80])assert.notEqual(simulateBattle(referenceArmy(STAGES[id-1]),id,{policy:'none'}).status,'victory');
  for(const id of [20,40,60,80])assert.equal(simulateBattle(referenceArmy(STAGES[id-1]),id,{policy:'center'}).status,'defeat','ignoring side lanes must have a cost');
  const final=STAGES[79];
  assert.notEqual(simulateBattle(referenceArmy(final,{power:final.recommendedPower/4}),80).status,'victory');
});

test('first capitals give four times normal loot; replays never repeat the capital bonus',()=>{
  assert.equal(battleRewardSeconds(true,1),900);assert.equal(battleRewardSeconds(true,20),3600);
  assert.equal(battleRewardSeconds(false,20),30);
  const s=referenceArmy(STAGES[19]);s.gold=0;
  const quote=battleRewardPreview(s,STAGES[19]),first=recordBattleVictory(s,win(20),T);
  assert.equal(first.gold,quote.gold);assert.equal(first.gold,perSecond(s)*3600);
  const before=s.campaignCleared,replay=recordBattleVictory(s,win(20),T);
  assert.equal(replay.firstClear,false);assert.equal(replay.gold,perSecond(s)*30);assert.equal(s.campaignCleared,before);
  assert.equal(parseSave(serializeSave(s),T).campaignCleared,20);
});

test('reward arithmetic, star bonuses and the wallet limit stay exact above safe numbers',()=>{
  for(const rate of [1,Number.MAX_SAFE_INTEGER-1,Number.MAX_SAFE_INTEGER,9007199254740993n,MAX_GOLD-1n]){
    for(const id of [1,20,80])for(const stars of [1,2,3]){
      const expected=exact(rate)*BigInt(id===1?900:3600)*BigInt([100,125,150][stars-1])/100n;
      assert.equal(exact(battleGoldReward(rate,true,0,stars,id)),expected>MAX_GOLD?MAX_GOLD:expected);
      assert.equal(battleGoldReward(rate,true,MAX_GOLD-1n,stars,id),1);
    }
  }
  for(const id of [0,81,2.5,'20'])assert.throws(()=>battleRewardSeconds(true,id),RangeError);
  const battle={...win(20),elapsedMs:120000,player:{hq:{hp:100,maxHp:100}}};
  assert.equal(battleStars(battle),3);assert.equal(battleStars({...battle,elapsedMs:120001}),2);
  assert.equal(battleStars({...battle,stageId:19}),2);
});
