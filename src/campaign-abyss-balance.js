import {ABYSS_HQ} from './campaign-abyss-hq.js';
import {CONSTELLATION_POWERS} from './constellation-officers.js';
// Fixed third-continent balance. The last 20 are future-growth siege objectives.
export function abyssDifficulty(id){
 const n=id-161;
 const anchors=[...CONSTELLATION_POWERS,CONSTELLATION_POWERS.at(-1)*4n];
 const section=Math.min(4,Math.floor(n/5));
 const power=n<20?anchors[section]+(anchors[section+1]-anchors[section])*BigInt(n%5)/5n:
   anchors[4]+(anchors[5]-anchors[4])*BigInt(n-19)/20n;
 const level=n<20?Math.min(50,32+Math.floor(n*18/19)):50;
 const enemyPower=8e13*Math.pow(1.12,n);
 return {recommendedPower:n===19?anchors[4]:power,recommendedLevel:level,
   hqPower:n<20?ABYSS_HQ[n]:3e17*Math.pow(1.12,n-20),
   enemyPower,enemyLevel:10,enemyModifier:1.1+n*.025,
   spawnMs:Math.max(1500,3000-n*35),enemyFirstSpawnMs:2000,
   longTerm:n>=20};
}
