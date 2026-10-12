import fs from 'node:fs';
import {STAGES} from '../src/battle.js';
import {referenceArmy,simulateBattle} from './campaign-sim.mjs';
const rows=[];
for(const stage of STAGES.slice(160,180)){
 const s=referenceArmy(stage);let low=1,high=2e18,best;
 const target=105+(stage.id-161)*2;
 for(let i=0;i<28;i++){
  const hp=Math.round((low+high)/2),b=simulateBattle(s,stage.id,{hqPower:hp}),seconds=b.elapsedMs/1000;
  if(b.status==='victory'&&(!best||Math.abs(seconds-target)<Math.abs(best.seconds-target)))best={id:stage.id,hp,seconds};
  if(b.status==='victory'&&seconds<target)low=hp+1;else high=hp-1;
 }
 if(!best)throw Error('no win '+stage.id);rows.push(best);console.log(best);
}
fs.writeFileSync(new URL('../src/campaign-abyss-hq.js',import.meta.url),'// Fixed siege HP calibrated with the recommended single-copy deck.\nexport const ABYSS_HQ=Object.freeze('+JSON.stringify(rows.map(r=>r.hp))+');\n');
