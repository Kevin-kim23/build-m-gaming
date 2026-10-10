import {GALACTIC_GRAND_ALLIED_ARMY_SIZE} from './formation-sizes.js';
import {compactMoney} from './money.js';
export const CONSTELLATION_NAMES=Object.freeze(['은하단 준장','은하단 소장','은하단 중장','은하단 대장','은하단 원수']);
// Promotion thresholds grow sixteenfold; BigInt keeps boundaries exact.
export const CONSTELLATION_POWERS=Object.freeze(CONSTELLATION_NAMES.map((_,i)=>BigInt(GALACTIC_GRAND_ALLIED_ARMY_SIZE)*16n**BigInt(i+1)));
const ids=['constellationBrigadier','constellationMajorGeneral','constellationLieutenantGeneral','constellationGeneral','constellationMarshal'];
export const CONSTELLATION_OFFICERS=Object.freeze(CONSTELLATION_NAMES.map((name,i)=>{
 const base=7_000_000_000_000_000_000_000n*2n**BigInt(i);
 return Object.freeze({id:ids[i],name,field:ids[i]+'s',school:'constellation',schoolLevel:i+1,
 unlockRank:name,recruitRankPower:CONSTELLATION_POWERS[i],power:CONSTELLATION_POWERS[i]/64n,
 passive:11_200_000_000_000*2**i,tap:76_800_000_000_000*2**i,
 // Same-rank recruitment needs sixteen times as many troops; stretch price growth accordingly.
 price:Object.freeze([base,base/1600n,base/2560000n].map(compactMoney)),
 academyCost:compactMoney(50_000_000_000_000_000_000_000n*2n**BigInt(i)),
 color:'#254b76',insigniaKind:'galactic',marks:i+1,width:18,height:27});
}));
