import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {equipmentGrowth} from '../src/equipment-growth.js';
import {EQUIPMENT,equipmentStats,equipmentIncome,enhancementCost,additionalEquipmentCost} from '../src/equipment.js';
import {equipmentCombatPower,equipmentCombatStats,UNIT_TRAITS,BATTLE_RULES} from '../src/battle-balance.js';
import {freshState,enhanceEquipment,perSecond,perTap,accrue,tapGold,MAX_OFFLINE_MS} from '../src/game.js';
import {parseSave} from '../src/save.js';
import {MAX_GOLD,exact,serializeSave,subtractMoney} from '../src/money.js';
import {quietBattle,deployNow,until} from './lane-helpers.js';

const ids=Object.keys(EQUIPMENT),T=1_800_000_000_000;
const hash=value=>createHash('sha256').update(serializeSave(value)).digest('hex');
const army=()=>({...freshState(T),soldiers:10_000,sergeants:300,galacticBrigadiers:64,
  ncoSchoolLevel:5,officerSchoolLevel:5,advancedSchoolLevel:5,commandSchoolLevel:5,galacticSchoolLevel:5,gold:MAX_GOLD});

test('all purchase prices and 0–10 income, combat and upgrade costs match the pre-retrofit snapshot',()=>{
  // Captured from 0.76.36 before changing the curves; no new formula in this oracle.
  assert.equal(hash(ids.map(id=>[id,EQUIPMENT[id].cost,Array.from({length:11},(_,level)=>[
    equipmentStats(level,id),level<10?enhancementCost(level,id):null,equipmentCombatStats(id,level),
  ])])),'72b371b321aeb46faa7445574f9c654ebcb19c5fefe9ff17de91c74a04c9e3cc');
});

test('all enemy and legacy combat statistics remain exactly as captured before the player retrofit',()=>{
  assert.equal(hash(ids.map(id=>[id,Array.from({length:51},(_,level)=>equipmentCombatStats(id,level,1280,1,true,false))])),
    '64c34fa6d630a7c651df275c73724275c6ef354e06fbdc44ac05d6e327fd9cdd');
  assert.equal(hash(ids.map(id=>[id,Array.from({length:51},(_,level)=>equipmentCombatStats(id,level,1280,1,false,false))])),
    '41a25637c205fb33f10f657ee452742e1b41bb08ae366b5c1ec4027685285914');
});

test('shared late income rewards keep early upgrades modest and make old max-level gear useful',()=>{
  const expected=[[10,0n],[11,2000n],[20,1_000_000_000n],[30,200_000_000_000_000n],[40,360_000_000_000_000n],[50,550_000_000_000_000n]];
  for(const [level,bonus] of expected)for(const id of ids){
    const d=EQUIPMENT[id],stats=equipmentStats(level,id);
    for(const kind of ['passive','tap']){
      const legacy=exact(d[kind])+exact(d[kind+'Step'])*BigInt(level)+exact(d[kind])*3n*BigInt(level*level)/100n;
      assert.equal(exact(stats[kind]),legacy+bonus*BigInt(kind==='tap'?6:1));
    }
  }
  assert.ok(equipmentStats(11).passive<equipmentStats(10).passive*2,'first refit is not a late-game income jump');
  assert.ok(equipmentStats(50).passive>equipmentStats(50,'novaCannon').passive/4);
  assert.ok(equipmentStats(50).passive<equipmentStats(50,'novaCannon').passive);
  for(const invalid of [-1,51,1.2,NaN])assert.throws(()=>equipmentGrowth(invalid),RangeError);
});

test('retrofit prices rise monotonically, preserve original late floors, and remain payable',()=>{
  assert.equal(enhancementCost(10),518_400_000);
  assert.equal(exact(enhancementCost(19)),368_841_600_000_000n);
  assert.equal(exact(enhancementCost(29)),145_152_000_000_000_000_000n);
  assert.equal(exact(enhancementCost(49)),676_547_251_344_014_030_000n);
  for(const id of ids){
    let previous=0n;
    for(let level=0;level<50;level++){
      const cost=exact(enhancementCost(level,id));
      assert.ok(cost>previous&&cost<MAX_GOLD,`${id} to ${level+1}`);
      assert.ok(cost>=exact(equipmentGrowth(level+1).upgradeCost));previous=cost;
    }
    assert.equal(enhancementCost(50,id),null);
    assert.ok(exact(additionalEquipmentCost(id,50))<MAX_GOLD);
  }
});

test('at 20, 30 and 50, low-mana retrofits have proportionally lower total combat power',()=>{
  for(const level of [20,30,50]){
    const floor=equipmentGrowth(level).combatPerMana;
    for(const id of ['artillery','tank','selfPropelled','helicopter','fighter']){
      const power=equipmentCombatPower(id,level),perMana=power/UNIT_TRAITS[id].cost;
      assert.ok(perMana>=floor*.999&&perMana<=floor*1.2,`${id}+${level}: ${perMana}`);
      assert.ok(Number.isSafeInteger(power));
    }
    assert.ok(equipmentCombatPower('artillery',level)<equipmentCombatPower('tank',level));
    assert.ok(equipmentCombatPower('tank',level)<equipmentCombatPower('fighter',level));
    assert.ok(equipmentCombatPower('fighter',level)<equipmentCombatPower('orbitalAssault',level));
    assert.ok(equipmentCombatPower('artillery',level)<equipmentCombatPower('novaCannon',level)*.2);
  }
  for(const id of ids)for(let level=11;level<=50;level++){
    const current=equipmentCombatStats(id,level),previous=equipmentCombatStats(id,level-1);
    assert.ok(current.hp>previous.hp);
    assert.ok((current.healing??current.damage)>(previous.healing??previous.damage));
    assert.ok(current.intervalMs<=previous.intervalMs);
  }
  const transport=equipmentCombatStats('transport',50),oldEnemy=equipmentCombatStats('transport',50,1280,1,true,false);
  assert.equal(transport.damage,0);assert.equal(transport.healing,oldEnemy.healing);
  assert.equal(BATTLE_RULES.healPercent,.12);
});

test('a paid retrofit deducts exact large prices once and keeps existing records and purchase gates',()=>{
  const s=army();s.personalLevels.divisionFlag=40;s.equipment.artillery={level:29,count:1,deployed:true};
  const cost=enhancementCost(29);s.gold=subtractMoney(cost,1);
  const before=serializeSave(s);
  assert.equal(enhanceEquipment(s,T).reason,'gold');assert.equal(serializeSave(s),before);
  s.gold=cost;assert.equal(enhanceEquipment(s,T).level,30);assert.equal(s.gold,0);
  s.gold=MAX_GOLD-1n;
  const loaded=parseSave(serializeSave(s),T);
  assert.deepEqual(loaded.equipment,s.equipment);assert.equal(loaded.gold,s.gold);
  assert.equal(loaded.personalLevels.divisionFlag,40);
});

test('high-level transport HP follows its mana budget and real self-healing remains twelve percent',()=>{
  for(const level of [20,30,50]){
    const transport=equipmentCombatStats('transport',level),tank=equipmentCombatStats('tank',level);
    assert.ok(transport.hp>=tank.hp*.8&&transport.hp<=tank.hp*1.25);
    assert.ok(transport.hp*BATTLE_RULES.healPercent<tank.hp*.16);
    const s=army();s.campaignCleared=80;
    s.equipment.tank={level,count:1,deployed:true};s.equipment.transport={level,count:1,deployed:true};
    let battle=deployNow(quietBattle(s,1,['tank','transport']),'transport');
    const medic=battle.player.units[0];medic.hp=medic.maxHp*.5;
    battle=until(battle,medic.nextShotMs);
    assert.ok(Math.abs(battle.player.units[0].hp-medic.maxHp*.62)<medic.maxHp*1e-12);
    assert.equal(battle.player.units[0].damage,0);
  }
});

test('new income crosses safe integers exactly and eight-hour settlement still caps and pays once',()=>{
  const s=army();s.gold=0;
  s.equipment.novaCannon={level:50,count:1,deployed:true};
  const stats=equipmentStats(50,'novaCannon');assert.equal(stats.tap,9_904_800_000_000_000n);
  assert.equal(exact(equipmentIncome(s).tap),stats.tap);
  assert.ok(exact(perTap(s,T))>BigInt(Number.MAX_SAFE_INTEGER));
  const rate=exact(perSecond(s)),expected=rate*BigInt(MAX_OFFLINE_MS)/1000n;
  accrue(s,T+MAX_OFFLINE_MS*2);
  assert.equal(exact(s.gold),expected>MAX_GOLD?MAX_GOLD:expected);
  const restored=parseSave(serializeSave(s),s.lastAccrual);
  accrue(restored,s.lastAccrual);assert.equal(restored.gold,s.gold);
  restored.gold=MAX_GOLD-1n;assert.equal(tapGold(restored,restored.lastAccrual),1);assert.equal(restored.gold,MAX_GOLD);
});
