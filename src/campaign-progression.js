import {abyssDifficulty} from './campaign-abyss-balance.js';
import {CAMPAIGN_HQ} from './campaign-hq.js';
import {RANKS,RANK_REQUIREMENTS} from './ranks.js';
import {CAMPAIGN_STAGE_COUNT} from './campaign-constants.js';

// Preserve Astera's eighty regions; the second continent follows galactic ranks.
export const CAMPAIGN_MILESTONES=Object.freeze([
  [1,'대위',0,.8,6500], [6,'소령',2,1.4,6000], [12,'중령',4,2,5500],
  [20,'대령',6,2.8,5000], [26,'준장',7,3.5,4800], [32,'소장',8,4.5,4600],
  [40,'중장',10,6,4500], [46,'대장',12,8,4300], [52,'준원수',14,14,4100],
  [60,'소원수',15,17,4000], [66,'중원수',16,32,4000], [72,'대원수',18,70,3800],
  [80,'대원수',20,150,3600],
  [81,'부사령관',20,155,3600], [100,'은하 준장',22,210,3500],
  [120,'은하 소장',24,260,3400], [130,'은하 중장',26,320,3300],
  [140,'은하 대장',28,390,3200], [160,'은하 원수',30,470,3100],
].map(([stage,rank,level,hqFactor,spawnMs])=>Object.freeze({stage,rank,power:RANK_REQUIREMENTS[RANKS.indexOf(rank)]*(stage===80?2:1),level,hqFactor,spawnMs})));

export function campaignDifficulty(id) {
  if(!Number.isInteger(id)||id<1||id>CAMPAIGN_STAGE_COUNT)throw new RangeError('Unknown campaign stage');
  if(id>160)return abyssDifficulty(id);
  const index=CAMPAIGN_MILESTONES.findLastIndex(m=>m.stage<=id),from=CAMPAIGN_MILESTONES[index];
  const to=CAMPAIGN_MILESTONES[index+1]??from,t=to===from?0:(id-from.stage)/(to.stage-from.stage);
  const mix=key=>from[key]+(to[key]-from[key])*t;
  const power=Math.round(from.power*(to.power/from.power)**t);
  const level=Math.floor(mix('level'));
  // Fixed siege HP is measured with the recommended equipment, not a hard rank gate.
  return {recommendedPower:power,recommendedLevel:level,
    hqPower:CAMPAIGN_HQ[id-1],enemyPower:power,
    enemyLevel:Math.min(10,level),enemyModifier:id<=80?.45+(id-1)/79*.45:.9+(id-81)/79*.18,
    spawnMs:Math.round(mix('spawnMs')),enemyFirstSpawnMs:id<=5?5500:2500};
}
