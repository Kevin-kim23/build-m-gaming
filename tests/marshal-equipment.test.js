import { SAVE_VERSION } from '../src/state.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,parseSave,perSecond,perTap,accrue,buyEquipment,enhanceEquipment,enhancePersonalEquipment,MAX_OFFLINE_MS} from '../src/game.js';
import {MAX_GOLD,serializeSave,exact,subtractMoney} from '../src/money.js';
import {RANKS,RANK_REQUIREMENTS} from '../src/ranks.js';
import {EQUIPMENT,equipmentPurchaseOffer,equipmentStats} from '../src/equipment.js';
import {personalStatus} from '../src/personal-equipment.js';
import {PERSONAL_EQUIPMENT} from '../src/personal-catalog.js';
import {personalDetailMarkup,personalLevelEffect} from '../src/personal-panels.js';
import {equipmentCombatStats,createBattle,BATTLE_RULES} from '../src/battle.js';
import {armyPower} from '../src/units.js';
import {quietBattle,deployNow} from './lane-helpers.js';
const T=1800000000000;
const army=(rank='준원수')=>({...freshState(T),soldiers:RANK_REQUIREMENTS[RANKS.indexOf(rank)]-3000,sergeants:300,gold:MAX_GOLD,ncoSchoolLevel:5});

test('enhancement control comes before growing descriptions, artwork and result text at every level',()=>{
  for(let level=1;level<10;level++){
    const s=army();s.personalLevels.commandBaton=level;
    const body=personalDetailMarkup(s,'commandBaton',{message:'강화 성공!'}).body;
    const index=body.indexOf('data-detail-action="enhance-personal"');
    assert.ok(index>=0&&index<body.indexOf('personal-item-effect'));
    assert.ok(index<body.indexOf('detail-art')&&index<body.indexOf('personal-upgrade-result'));
    assert.ok(index<body.indexOf('다음 능력'));
  }
});
test('railgun and ICBM preview one rank early, enforce ranks and use exact gold and automatic home deployment',()=>{
  for(const [id,hidden,preview,unlocked] of [['railgunTank','소장','중장','대장'],['icbm','중장','대장','준원수']]){
    assert.equal(equipmentPurchaseOffer(army(hidden),id).visible,true);
    const locked=army(preview),before=locked.gold;
    assert.equal(equipmentPurchaseOffer(locked,id).visible,true);
    assert.equal(buyEquipment(locked,T,id).reason,'locked');assert.equal(locked.gold,before);
    const s=army(unlocked);s.gold=EQUIPMENT[id].cost-1;
    assert.equal(buyEquipment(s,T,id).reason,'gold');s.gold=MAX_GOLD-1n;
    for(const old of ['artillery','tank','selfPropelled','helicopter'])s.equipment[old]={level:20,count:1,deployed:true};
    assert.deepEqual(buyEquipment(s,T,id),{ok:true,cost:EQUIPMENT[id].cost,deployed:true});
    assert.equal(s.gold,MAX_GOLD-1n-BigInt(EQUIPMENT[id].cost));
    s.personalLevels.divisionFlag=10;
    for(let level=0;level<20;level++)assert.equal(enhanceEquipment(s,T,id).level,level+1);
    assert.equal(enhanceEquipment(s,T,id).reason,'max');
    assert.deepEqual(parseSave(serializeSave(s),T).equipment[id],s.equipment[id]);
  }
});
test('glaive grants passive +120% at marshal, +20 points per paid level, with no tap boost',()=>{
  assert.equal(personalStatus(army('중장'),'marshalGlaive').visible,false);
  assert.deepEqual(personalStatus(army('대장'),'marshalGlaive'),{visible:true,owned:false,level:0});
  const s=army(),base=s.soldiers+s.sergeants*75,tap=perTap(s,T);
  for(let level=1;level<=10;level++){
    s.personalLevels.marshalGlaive=level;
    assert.equal(perSecond(s),Math.floor(base*(220+20*(level-1))/100));
    assert.equal(perTap(s,T),tap);
    assert.match(personalLevelEffect('marshalGlaive',level),new RegExp('\\+'+(120+20*(level-1))+'%'));
  }
});
test('glaive combines with conquest and equipment; 8-hour income, cap and reload stay exact',()=>{
  const s=army();s.gold=0;s.campaignCleared=80;s.personalLevels.marshalGlaive=10;
  for(const id of ['fighter','railgunTank','icbm','transport'])s.equipment[id]={level:20,count:100000,deployed:true};
  const base=BigInt(s.soldiers+s.sergeants*75)+Object.entries(s.equipment).reduce((v,[id,g])=>v+(g?BigInt(equipmentStats(g.level,id).passive)*BigInt(g.count):0n),0n);
  const expected=(base+base*80n/100n)*4n;
  assert.equal(exact(perSecond(s)),expected);
  accrue(s,T+MAX_OFFLINE_MS*2);assert.equal(exact(s.gold),expected*BigInt(MAX_OFFLINE_MS)/1000n);
  const loaded=parseSave(serializeSave(s),s.lastAccrual);assert.equal(loaded.gold,s.gold);
  const before=loaded.gold;accrue(loaded,T);assert.equal(loaded.gold,before);
  loaded.gold=MAX_GOLD-1n;accrue(loaded,loaded.lastAccrual+1000);assert.equal(loaded.gold,MAX_GOLD);
});
test('glaive upgrades settle the old rate first and each paid step increases income',()=>{
  const s=army(),old=perSecond(s);s.gold=1_000_000_000_000;
  const result=enhancePersonalEquipment(s,T+1000,'marshalGlaive',()=>0);
  assert.equal(s.gold,subtractMoney(1_000_000_000_000+old,result.cost));
  const updated=perSecond(s),gold=s.gold;
  const next=enhancePersonalEquipment(s,T+1000,'marshalGlaive');
  assert.equal(next.success,true);assert.ok(perSecond(s)>updated);assert.equal(s.gold,subtractMoney(gold,next.cost));
});
test('v19 adds empty military slots and Lv.1 glaive while preserving all paid gear and active skills',()=>{
  const s=army();s.version=19;s.gold=MAX_GOLD-1n;
  for(const id of Object.keys(s.personalLevels))s.personalLevels[id]=7;
  delete s.personalLevels.marshalGlaive;delete s.equipment.railgunTank;delete s.equipment.icbm;
  s.equipment.tank={level:20,count:1,deployed:true};s.swordActivatedAt=T-1000;s.swordDurationMs=90000;
  s.autoTouchActivatedAt=T-900;s.autoTouchDurationMs=120000;s.autoTouchTicks=3;
  const next=parseSave(serializeSave(s),T);assert.equal(next.version,SAVE_VERSION);assert.equal(next.gold,s.gold);
  for(const id of Object.keys(s.personalLevels))assert.equal(next.personalLevels[id],PERSONAL_EQUIPMENT[id].introducedVersion<=19?7:1);
  assert.equal(next.personalLevels.marshalGlaive,1);assert.equal(next.equipment.icbm,null);assert.equal(next.equipment.railgunTank,null);
  for(const key of ['swordActivatedAt','swordDurationMs','autoTouchActivatedAt','autoTouchDurationMs','autoTouchTicks'])assert.equal(next[key],s[key]);
  assert.deepEqual(next.equipment.tank,s.equipment.tank);
  for(const patch of [{personalLevels:{...next.personalLevels,marshalGlaive:0}},{equipment:{...next.equipment,icbm:undefined}},{equipment:{...next.equipment,railgunTank:{level:31,count:1,deployed:false}}}])
    assert.equal(parseSave(serializeSave({...next,...patch}),T),null);
  s.equipment.icbm={level:20,count:1,deployed:false};s.personalLevels.marshalGlaive=10;
  assert.equal(parseSave(serializeSave(s),T).equipment.icbm,null);assert.equal(parseSave(serializeSave(s),T).personalLevels.marshalGlaive,1);
});
test('new equipment deploys with its own stats and every upgrade improves combat',()=>{
  assert.ok(equipmentCombatStats('icbm',0).damage>equipmentCombatStats('railgunTank',0).damage);
  assert.ok(equipmentCombatStats('icbm',0).intervalMs>equipmentCombatStats('railgunTank',0).intervalMs);
  for(const id of ['railgunTank','icbm']){
    let previous=equipmentCombatStats(id,0);
    for(let level=1;level<=20;level++){const stats=equipmentCombatStats(id,level);assert.ok(stats.damage>previous.damage);assert.ok(stats.intervalMs<=previous.intervalMs);previous=stats;}
    const s=army();s.equipment[id]={level:0,count:1,deployed:false};
    const quiet=quietBattle({...s,campaignCleared:80},1,[id]);quiet.enemy.hq.hp=quiet.enemy.hq.maxHp=1e15;
    const battle=deployNow(quiet,id),stats=equipmentCombatStats(id,0,armyPower({...s,campaignCleared:80}));
    if(id==='icbm'){
      // ICBM은 전진하지 않고 마나로 즉시 일제 타격: 적 기지에 1회 공격력의 배수만큼 직격한다.
      assert.equal(battle.player.units.length,0);
      const start=1e15;
      assert.ok(Math.abs(start-battle.enemy.hq.hp-stats.damage*BATTLE_RULES.strikeMultiplier)<start*1e-9);
    } else { assert.equal(battle.player.units[0].damage,stats.damage);assert.equal(battle.player.units[0].intervalMs,stats.intervalMs); }
  }
});
