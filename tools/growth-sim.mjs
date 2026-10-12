// Planning model, not a prediction of human play. Runs only on an in-memory fresh save.
import {withPersonalIncome,withPersonalEquipmentIncome} from '../src/personal-equipment.js';
import {campaignBonusPercent} from '../src/campaign-rewards.js';
import {personalUpgradeOffer} from '../src/personal-enhancement.js';
import {PERSONAL_EQUIPMENT} from '../src/personal-catalog.js';
import {simulateBattle} from './campaign-sim.mjs';
import { FACILITIES, facilityOffer, facilityBonus, facilityLevel, facilityUpgradeOffer } from '../src/facilities.js';
import { pathToFileURL } from 'node:url';
import { freshState, recruitOffer, enhancePersonalEquipment, unitCost, perSecond, perTap, accrue, recruit, upgradeSchool, buyEquipment, enhanceEquipment, buildFacility, upgradeFacility } from '../src/game.js';
import { UNIT_LIST, unitAccess, armyPower } from '../src/units.js';
import { SCHOOLS, schoolOffer } from '../src/schools.js';
import { EQUIPMENT, equipmentStats, enhancementOffer, equipmentPurchaseOffer } from '../src/equipment.js';
import { RANKS, LAST_RANK, rankForArmy, GENERAL_MIN_SOLDIERS, GENERAL_MIN_SERGEANTS } from '../src/ranks.js';
import { addMoney, subtractMoney, multiplyMoney, minMoney, MAX_GOLD } from '../src/money.js';
import { prepareOfflineReward, claimOfflineReward } from '../src/offline-reward.js';
import { campaignStages } from '../src/campaign.js';
import { recordBattleVictory } from '../src/battle-progress.js';
import {battleAccess} from '../src/battle.js';

const START=1800000000000, DAY=86400;
// Simulation scoring alone uses Number approximations; wallet and purchases use game money functions.
export function simulateGrowth({minutes=7.5,tapsPerSecond=3,days=90,investmentHours=8,battles=false,facilities=true,facilityUpgrades=true}={}) {
  const state=freshState(START), milestones=[{rank:RANKS[0],day:0,activeMinutes:0}], unlocks=[];
  const duration=Math.round(minutes*60), interval=DAY/3;
  const tapWeight=tapsPerSecond*duration/interval;
  let elapsed=0,activeSeconds=0,actions=0;
  let passiveFactor=1,tapFactor=1,gearFactor=1;
  const effective=(passive,tap,gear=false)=>(passive*passiveFactor+tap*tapWeight*tapFactor)*(gear?gearFactor:1);
  function candidates() {
    const result=[], rank=rankForArmy(state),bonus=facilityBonus(state);
    const currentPassive=Number(perSecond(state)),currentTap=Number(perTap(state,START+elapsed*1000));
    // Include the same personal/conquest multipliers as real credited income.
    passiveFactor=(100+bonus.passive)/100*(100+campaignBonusPercent(state))/100*Number(withPersonalIncome(state,1000000))/1000000;
    tapFactor=(100+bonus.tap)/100*Number(withPersonalIncome(state,1000000,'tap'))/1000000;
    gearFactor=Number(withPersonalEquipmentIncome(state,1000000))/1000000;
    for(const u of UNIT_LIST) if(unitAccess(state,u).unlocked&&recruitOffer(state,u.id).reason!=='limit') {
      const cost=unitCost(state[u.field],u.id), gain=effective(u.passive,u.tap);
      result.push({kind:'unit',id:u.id,cost,score:Number(cost)/gain,apply:()=>recruit(state,START+elapsed*1000,u.id)});
    }
    for(const item of Object.values(PERSONAL_EQUIPMENT)) {
      const offer=personalUpgradeOffer(state,item.id);if(offer.reason==='locked'||offer.reason==='max')continue;
      const next={...state,personalLevels:{...state.personalLevels,[item.id]:offer.nextLevel}};
      let gain=Number(perSecond(next))-currentPassive+(Number(perTap(next,START+elapsed*1000))-currentTap)*tapWeight;
      // Flag investments include the income unlocked by the next upgrade of owned gear.
      if(item.id==='divisionFlag')for(const gear of Object.values(EQUIPMENT))if(state.equipment[gear.id]){
        const after=enhancementOffer(next,gear.id),before=enhancementOffer(state,gear.id);
        if(before.reason==='max'&&after.reason!=='max'){
          const a=equipmentStats(state.equipment[gear.id].level+1,gear.id),b=equipmentStats(state.equipment[gear.id].level,gear.id);
          gain+=effective(a.passive-b.passive,a.tap-b.tap,true)*Number(offer.cost)/(Number(offer.cost)+Number(after.cost));
        }
      }
      if(gain>0)result.push({kind:'personal',id:item.id,cost:offer.cost,score:Number(offer.cost)/gain,apply:()=>enhancePersonalEquipment(state,START+elapsed*1000,item.id)});
    }
    for(const school of Object.values(SCHOOLS)) {
      const offer=schoolOffer(state,school.id);
      if(offer.reason==='locked'||offer.reason==='max')continue;
      const unit=UNIT_LIST.find(u=>u.school===school.id&&u.schoolLevel===offer.nextLevel);
      // School ROI includes its first ten recruits. NCO Lv.5 is the prerequisite for officers.
      let cost=Number(offer.cost),gain=0;
      if(unit)for(let n=0;n<10;n++){cost+=Number(unitCost(n,unit.id));gain+=effective(unit.passive,unit.tap);}
      else if(rank>=RANKS.indexOf('소장')){const u=UNIT_LIST.find(u=>u.id==='lieutenant');cost+=Number(SCHOOLS.officer.costs[0])+Number(unitCost(0,u.id))*10;gain=effective(u.passive,u.tap)*10;}
      if(gain)result.push({kind:'school',id:school.id,cost:offer.cost,score:cost/gain,apply:()=>upgradeSchool(state,START+elapsed*1000,school.id)});
    }
    for(const gear of Object.values(EQUIPMENT)) {
      const owned=state.equipment[gear.id];
      if(owned&&!owned.deployed)continue;
      const offer=owned?enhancementOffer(state,gear.id):equipmentPurchaseOffer(state,gear.id);
      if(offer.reason==='locked'||offer.reason==='max'||offer.cost===null)continue;
      const after=equipmentStats(owned?owned.level+1:0,gear.id);
      const before=owned?equipmentStats(owned.level,gear.id):{passive:0,tap:0};
      const gain=effective(after.passive-before.passive,after.tap-before.tap,true);
      if(gain<=0)continue;
      result.push({kind:'gear',id:gear.id,cost:offer.cost,score:Number(offer.cost)/gain,apply:()=>{
        return owned?enhanceEquipment(state,START+elapsed*1000,gear.id):buyEquipment(state,START+elapsed*1000,gear.id);
      }});
    }
    if(facilities)for(const f of FACILITIES) {
      const level=facilityLevel(state,f.id),owned=level>0;
      if(owned&&!facilityUpgrades)continue;
      const offer=owned?facilityUpgradeOffer(state,f.id):facilityOffer(state,f.id);
      if(offer.reason==='locked'||offer.reason==='max'||offer.cost===null)continue;
      // The preview must not mutate either the live ownership or the cached level record.
      const next={...state,facilities:owned?[...state.facilities]:[...state.facilities,f.id],
        facilityLevels:{...state.facilityLevels,[f.id]:level+1}};
      const gain=Number(perSecond(next))-currentPassive+(Number(perTap(next,START+elapsed*1000))-currentTap)*tapWeight;
      if(gain>0)result.push({kind:'facility',id:f.id,cost:offer.cost,score:Number(offer.cost)/gain,
        apply:()=>(owned?upgradeFacility:buildFacility)(state,START+elapsed*1000,f.id)});
    }
    result.sort((a,b)=>a.score-b.score);
    // After investing in income that repays within one offline interval, work on mandatory headcounts.
    if(rank===RANKS.indexOf('대령')&&result[0]?.score>investmentHours*3600) {
      const mandatory=result.filter(c=>c.kind==='unit'&&((c.id==='soldier'&&state.soldiers<GENERAL_MIN_SOLDIERS)||(c.id==='sergeant'&&state.sergeants<GENERAL_MIN_SERGEANTS)));
      mandatory.sort((a,b)=>Number(a.cost)-Number(b.cost));
      if(mandatory[0])return mandatory[0];
    }
    // At late ranks, finish worthwhile income investments, then deliberately save
    // for power. Every tenth investment prioritizes power; ROI-only play buys excessive low ranks.
    if(rank>=RANKS.indexOf('은하단 준장')&&(actions%10===0||result[0]?.score>investmentHours*3600)){
      const academy=result.find(c=>c.kind==='school'&&['galactic','constellation'].includes(c.id));
      if(academy)return academy;
      const units=result.filter(c=>c.kind==='unit').sort((a,b)=>Number(UNIT_LIST.find(u=>u.id===b.id).power)-Number(UNIT_LIST.find(u=>u.id===a.id).power));
      if(units[0])return units[0];
    }
    return result[0];
  }
  function record() {
    const rank=rankForArmy(state);
    while(milestones.length<=rank)milestones.push({rank:RANKS[milestones.length],day:Math.round(elapsed/DAY*1000)/1000,activeMinutes:Math.round(activeSeconds/60)});
  }
  for(let visit=0;visit<days*3&&rankForArmy(state)<LAST_RANK;visit++) {
    elapsed=visit*interval;
    prepareOfflineReward(state,START+elapsed*1000);
    if(state.offlineReward)claimOfflineReward(state,state.offlineReward.id);
    accrue(state,START+elapsed*1000);
    const end=elapsed+duration;
    let failedStage=0;
    while(elapsed<end&&rankForArmy(state)<LAST_RANK) {
      const stage=campaignStages[state.campaignCleared];
      if(battles&&stage&&stage.id!==failedStage&&end-elapsed>=120&&armyPower(state)>=stage.recommendedPower&&battleAccess(state).unlocked){
        const battle=simulateBattle(state,stage.id);
        elapsed+=Math.ceil(battle.elapsedMs/1000);activeSeconds+=Math.ceil(battle.elapsedMs/1000);
        if(battle.status==='victory')recordBattleVictory(state,battle,START+elapsed*1000);else failedStage=stage.id;
        continue;
      }
      const choice=candidates();if(!choice)break;
      if(state.gold>=choice.cost) {
        const result=choice.apply();if(!result.ok)throw Error(`Simulation action failed: ${choice.kind}.${choice.id}: ${result.reason}`);
        if(choice.kind==='school')unlocks.push({school:choice.id,level:result.level,day:Math.round(elapsed/DAY*1000)/1000,income:perSecond(state)});
        record();if(++actions>300000)throw Error('Simulation action limit '+JSON.stringify({rank:RANKS[rankForArmy(state)],day:elapsed/DAY,last:choice.id,power:String(armyPower(state)),milestones:milestones.slice(-6)}));continue;
      }
      const rate=Number(perSecond(state))+Number(perTap(state,START+elapsed*1000))*tapsPerSecond;
      const step=Math.min(end-elapsed,Math.max(1,Math.ceil(Number(subtractMoney(choice.cost,state.gold))/Math.max(1,rate))));
      const touch=multiplyMoney(perTap(state,START+elapsed*1000),tapsPerSecond*step);
      elapsed+=step;activeSeconds+=step;accrue(state,START+elapsed*1000);
      state.gold=minMoney(MAX_GOLD,addMoney(state.gold,touch));state.taps+=tapsPerSecond*step;
    }
  }
  return {assumptions:{visitsPerDay:3,minutes,tapsPerSecond,days,investmentHours,ads:false,personalAwards:true,personalUpgrades:true,battles,facilities,facilityUpgrades:facilities&&facilityUpgrades,latePowerPurchaseEvery:10,incomeScoringIncludesPersonalAndConquest:true},milestones,unlocks,
    final:{rank:RANKS[rankForArmy(state)],power:armyPower(state),passive:String(perSecond(state)),tap:String(perTap(state)),schools:Object.fromEntries(Object.values(SCHOOLS).map(s=>[s.id,state[s.field]])),gold:String(state.gold),facilities:[...state.facilities],facilityLevels:{...state.facilityLevels},equipment:Object.entries(state.equipment).filter(([,gear])=>gear).map(([id,gear])=>({id,level:gear.level})),actions}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const minutes=Number(process.argv.find(arg=>arg.startsWith('--minutes='))?.split('=')[1]??7.5);
  console.log(JSON.stringify(simulateGrowth({minutes,battles:process.argv.includes('--battles')}),(_key,value)=>typeof value==='bigint'?value.toString():value,2));
}
