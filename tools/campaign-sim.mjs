// Deterministic planning model. Never touches a real save or simulates unaffordable extra copies.
import {pathToFileURL} from 'node:url';
import {freshState} from '../src/state.js';
import {RANKS,RANK_REQUIREMENTS,rankForArmy} from '../src/ranks.js';
import {EQUIPMENT} from '../src/equipment.js';
import {STAGES,createBattle,advanceBattle,deploy,BATTLE_RULES} from '../src/battle.js';

export function referenceArmy(stage,{power=stage.recommendedPower,level=stage.recommendedLevel}={}) {
  const s=freshState(1800000000000);
  s.sergeants=power>=RANK_REQUIREMENTS[RANKS.indexOf('준장')]?300:power>=640?40:0;
  s.soldiers=power-s.sergeants*10;s.campaignCleared=stage.id-1;
  s.ncoSchoolLevel=1;
  s.personalLevels.divisionFlag=Math.max(1,level-10);
  const rank=rankForArmy(s);
  for(const gear of Object.values(EQUIPMENT))if(rank>=RANKS.indexOf(gear.unlockRank))s.equipment[gear.id]={level:Math.min(level,rank<RANKS.indexOf('소장')?10:gear.maxLevel),count:1,deployed:true};
  return s;
}

export function simulateBattle(state,stageId,{policy='defend',deck}={}) {
  let b=createBattle(state,stageId,deck?{equipment:deck}:undefined),k=0,nextInput=0;
  while(b.status==='running') {
    if(policy!=='none'&&b.elapsedMs>=nextInput){
      // A human-sized decision interval; the model cannot respond every engine frame.
      nextInput=b.elapsedMs+500;
      const ready=b.deck.filter(c=>b.mana>=c.cost&&b.elapsedMs>=c.readyMs);
      if(ready.length){
        let lane=1,nearest=Infinity;
        if(policy==='defend')for(const foe of b.enemy.units)if(foe.x<nearest){nearest=foe.x;lane=foe.lane;}
        b=deploy(b,ready[k++%ready.length].id,lane);
      }
    }
    b=advanceBattle(b,100);
  }
  return b;
}

export function campaignReport(){return STAGES.map(stage=>{
  const state=referenceArmy(stage),b=simulateBattle(state,stage.id);
  return {id:stage.id,rank:stage.recommendedRank,power:stage.recommendedPower,level:stage.recommendedLevel,
    status:b.status,seconds:b.elapsedMs/1000,hp:Math.round(b.player.hq.hp/b.player.hq.maxHp*100),enemyHp:Math.round(b.enemy.hq.hp/b.enemy.hq.maxHp*100),deck:b.deck.map(c=>c.id)};
});}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(campaignReport(),null,2));
