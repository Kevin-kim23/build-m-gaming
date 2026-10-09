import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, buyEquipment, enhanceEquipment, parseSave, accrue, perSecond, MAX_OFFLINE_MS } from '../src/game.js';
import { MAX_GOLD, exact, multiplyMoney, serializeSave } from '../src/money.js';
import { RANKS, RANK_REQUIREMENTS } from '../src/ranks.js';
import { armyPower } from '../src/units.js';
import { EQUIPMENT, equipmentPurchaseOffer, equipmentIncome, equipmentStats, enhancementCost, equipmentStage } from '../src/equipment.js';
import { BATTLE_RULES, UNIT_TRAITS, createBattle, defaultLoadout, deploy, equipmentCombatStats, advanceBattle } from '../src/battle.js';
import { equipmentRole } from '../src/equipment-tiles.js';
import { createGameAudio } from '../src/audio.js';
import { quietBattle, deployNow } from './lane-helpers.js';
const T=1_800_000_000_000;
const NEW=['carrier','flyingFortress','orbitalAssault'];
const army=(rank='대원수')=>({...freshState(T),soldiers:RANK_REQUIREMENTS[RANKS.indexOf(rank)]-3000,sergeants:300,gold:MAX_GOLD,ncoSchoolLevel:5});

test('late military preview one rank early and only the correct rank can purchase once with exact balances',()=>{
  for(const [id,hidden,preview,unlocked,cost] of [
    ['carrier','대장','준원수','소원수',45_000_000_000],
    ['flyingFortress','준원수','소원수','중원수',150_000_000_000],
    ['orbitalAssault','소원수','중원수','대원수',450_000_000_000],
  ]){
    assert.equal(EQUIPMENT[id].introducedVersion,27);
    assert.equal(equipmentPurchaseOffer(army(hidden),id).visible,true);
    const locked=army(preview),before=locked.gold;
    assert.equal(equipmentPurchaseOffer(locked,id).visible,true);
    assert.equal(buyEquipment(locked,T,id).reason,'locked');assert.equal(locked.gold,before);
    const s=army(unlocked);s.gold=cost-1;
    assert.equal(buyEquipment(s,T,id).reason,'gold');assert.equal(s.gold,cost-1);
    for(const gold of [Number.MAX_SAFE_INTEGER,MAX_GOLD-1n]){
      const next=army(unlocked);next.gold=gold;
      assert.deepEqual(buyEquipment(next,T,id),{ok:true,cost,deployed:true});
      assert.equal(exact(next.gold),exact(gold)-BigInt(cost));
      assert.deepEqual(next.equipment[id],{level:0,count:1,deployed:true});
      assert.equal(buyEquipment(next,T,id).reason,'owned');
      assert.equal(exact(next.gold),exact(gold)-BigInt(cost));
    }
  }
});

test('late military uses the same flag-gated twenty upgrades, independent prices and increasing income',()=>{
  for(const id of NEW){
    const s=army();buyEquipment(s,T,id);s.personalLevels.divisionFlag=10;
    let previous=equipmentStats(0,id),previousCost=0;
    for(let level=0;level<20;level++){
      const cost=enhancementCost(level,id),oldGold=s.gold;
      assert.ok(cost>previousCost);assert.equal(enhanceEquipment(s,T,id).level,level+1);
      assert.equal(exact(s.gold),exact(oldGold)-BigInt(cost));
      const next=equipmentStats(level+1,id);
      assert.ok(next.passive>previous.passive&&next.tap>previous.tap);
      assert.equal(typeof equipmentStage(id,level+1),'string');previous=next;previousCost=cost;
    }
    assert.deepEqual(previous,{passive:EQUIPMENT[id].passive*17,tap:EQUIPMENT[id].tap*17});
    assert.equal(enhanceEquipment(s,T,id).reason,'max');
    assert.deepEqual(parseSave(serializeSave(s),T).equipment[id],s.equipment[id]);
    s.personalLevels.divisionFlag=1;s.equipment[id].level=11;
    assert.equal(enhanceEquipment(s,T,id).reason,'max');
  }
});

test('every catalog type has battle mappings and the new trio fits the existing six-card deck',()=>{
  const s=army();s.campaignCleared=80;
  for(const id of Object.keys(EQUIPMENT)){
    s.equipment[id]={level:20,count:1,deployed:true};
    assert.ok(UNIT_TRAITS[id]);
  }
  const automatic=createBattle(s,80,defaultLoadout(s,80));
  assert.equal(automatic.deck.length,6);
  for(const card of automatic.deck)assert.ok(Number.isFinite(card.cost)&&card.cost<=BATTLE_RULES.manaMax);
  const chosen=createBattle(s,80,{equipment:NEW});assert.equal(chosen.deck.length,3);
  assert.match(equipmentRole('carrier'),/함재기/);assert.match(equipmentRole('flyingFortress'),/공중/);assert.match(equipmentRole('orbitalAssault'),/직격/);
});

test('carrier and fortress advance and shoot; orbital strike spends mana once and respects cooldown',()=>{
  for(const id of NEW){
    const s=army();s.campaignCleared=80;s.equipment[id]={level:0,count:1,deployed:false};
    let previous=equipmentCombatStats(id,0);
    for(let level=1;level<=20;level++){
      const next=equipmentCombatStats(id,level);assert.ok(next.damage>previous.damage);assert.ok(next.intervalMs<=previous.intervalMs);previous=next;
    }
    const base=quietBattle(s,80,[id]);base.enemy.hq.hp=base.enemy.hq.maxHp=1e15;
    const b=deployNow(base,id),stats=equipmentCombatStats(id,0,armyPower(s));
    assert.equal(b.mana,100-UNIT_TRAITS[id].cost);
    if(id==='orbitalAssault'){
      assert.equal(b.player.units.length,0);assert.ok(b.enemy.hq.hp<base.enemy.hq.hp);
      assert.ok(b.fx.some(f=>f.kind==='strike'&&f.id===id));
      b.mana=100;assert.equal(deploy(b,id),b,'cannot repeat while on cooldown');
    }else{
      const unit=b.player.units[0];assert.equal(unit.cls,'air');assert.equal(unit.damage,stats.damage);
      let next=advanceBattle(b,250);assert.ok(next.player.units[0].x>unit.x);
      next.player.units[0].x=1000-UNIT_TRAITS[id].range;next.player.units[0].nextShotMs=0;
      const fired=advanceBattle(next,50);assert.ok(fired.enemy.hq.hp<next.enemy.hq.hp);
      assert.ok(fired.fx.some(f=>f.kind==='shot'&&f.id===id));
    }
  }
});

test('full expanded military income and eight-hour offline settlement stay exact at maximum legacy quantities',()=>{
  const s=army();s.gold=0;
  for(const id of Object.keys(EQUIPMENT))s.equipment[id]={level:20,count:100000,deployed:true};
  const expected=Object.keys(EQUIPMENT).reduce((sum,id)=>{
    const stats=equipmentStats(20,id);sum.passive+=BigInt(stats.passive)*100000n;sum.tap+=BigInt(stats.tap)*100000n;return sum;
  },{passive:0n,tap:0n});
  assert.equal(Object.keys(EQUIPMENT).length,12,'recheck safe raw sums if the catalog grows');
  for(const kind of ['passive','tap'])assert.ok(expected[kind]<=BigInt(Number.MAX_SAFE_INTEGER),'raw equipment income must stay within safe integer range before personal multipliers');
  const income=equipmentIncome(s);assert.ok(Number.isSafeInteger(income.passive)&&Number.isSafeInteger(income.tap));
  assert.equal(exact(income.passive),expected.passive);assert.equal(exact(income.tap),expected.tap);
  const rate=perSecond(s),earned=multiplyMoney(rate,MAX_OFFLINE_MS/1000);
  accrue(s,T+MAX_OFFLINE_MS*2);assert.equal(exact(s.gold),earned<MAX_GOLD?exact(earned):MAX_GOLD);
  const loaded=parseSave(serializeSave(s),s.lastAccrual);assert.equal(loaded.gold,s.gold);
  for(const id of NEW)assert.deepEqual(loaded.equipment[id],s.equipment[id]);
  loaded.gold=MAX_GOLD-1n;accrue(loaded,loaded.lastAccrual+1000);assert.equal(loaded.gold,MAX_GOLD);
});

test('new heavy equipment has distinct synthesized attack signatures without audio files or excess voices',()=>{
  const signatures=[];
  for(const id of NEW){
    const frequencies=[];
    const context={currentTime:0,destination:{},resume:async()=>{},
      createGain:()=>({connect(){},disconnect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}}),
      createOscillator:()=>({connect(){},disconnect(){},frequency:{setValueAtTime(value){frequencies.push(value);}},start(){},stop(){}})};
    const audio=createGameAudio(()=>context);audio.battle(id==='orbitalAssault'?'strike':'shot',true,id);
    assert.ok(frequencies.length>=2);signatures.push(frequencies.join(','));
    for(let n=0;n<100;n++)audio.battle('shot',true,id);
    assert.equal(frequencies.length,12);audio.stop();
    audio.configure({enabled:false,active:true});audio.battle('shot',true,id);assert.equal(frequencies.length,12);
  }
  assert.equal(new Set(signatures).size,3);
});
