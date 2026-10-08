import {RANKS,RANK_REQUIREMENTS} from './ranks.js';

// Rank milestones keep all 80 regions connected to the recruit/equipment progression.
export const CAMPAIGN_MILESTONES=Object.freeze([
  [1,'대위',0,.8,6500], [6,'소령',2,1.4,6000], [12,'중령',4,2,5500],
  [20,'대령',6,2.8,5000], [26,'준장',7,3.5,4800], [32,'소장',8,4.5,4600],
  [40,'중장',10,6,4500], [46,'대장',12,8,4300], [52,'준원수',14,14,4100],
  [60,'소원수',15,17,4000], [66,'중원수',16,32,4000], [72,'대원수',18,70,3800],
  [80,'특전원수',20,150,3600],
].map(([stage,rank,level,hqFactor,spawnMs])=>Object.freeze({stage,rank,power:RANK_REQUIREMENTS[RANKS.indexOf(rank)],level,hqFactor,spawnMs})));

export function campaignDifficulty(id) {
  if(!Number.isInteger(id)||id<1||id>80)throw new RangeError('Unknown campaign stage');
  const index=CAMPAIGN_MILESTONES.findLastIndex(m=>m.stage<=id),from=CAMPAIGN_MILESTONES[index];
  const to=CAMPAIGN_MILESTONES[index+1]??from,t=to===from?0:(id-from.stage)/(to.stage-from.stage);
  const mix=key=>from[key]+(to[key]-from[key])*t;
  const power=Math.round(from.power*(to.power/from.power)**t);
  const level=Math.floor(mix('level')),capital=id%20===0;
  // Tough armored formations already delay the siege. Offset their HQ health so
  // unlocking a new late-game weapon still helps within the same time target.
  const archetype=(id-1)%3;
  const siegeFactor=id>=46&&id<66&&archetype===0?(id>=60?.4:.7):id>=52&&id<60&&archetype===2?.85:1;
  return {recommendedPower:power,recommendedLevel:level,
    hqPower:Math.round(power*mix('hqFactor')*siegeFactor*(capital?(id===20?2.2:1.9):1)),enemyPower:power,
    enemyLevel:Math.min(10,level),enemyModifier:.45+(id-1)/79*.45,
    spawnMs:Math.round(mix('spawnMs')),enemyFirstSpawnMs:id<=5?5500:2500};
}
