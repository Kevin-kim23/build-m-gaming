import { compactMoney } from './money.js';
import {
  GALACTIC_CORPS_SIZE, GALACTIC_FIELD_ARMY_SIZE, GALACTIC_ARMY_GROUP_SIZE,
  GALACTIC_ALLIED_ARMY_SIZE, GALACTIC_GRAND_ALLIED_ARMY_SIZE,
} from './formation-sizes.js';

const ranks = ['은하 준장','은하 소장','은하 중장','은하 대장','은하 원수'];
const unlockRanks = ranks;
const ids = ['galacticBrigadier','galacticMajorGeneral','galacticLieutenantGeneral','galacticGeneral','galacticMarshal'];
const sizes = [GALACTIC_CORPS_SIZE,GALACTIC_FIELD_ARMY_SIZE,GALACTIC_ARMY_GROUP_SIZE,GALACTIC_ALLIED_ARMY_SIZE,GALACTIC_GRAND_ALLIED_ARMY_SIZE];
const colors = ['#624077','#694484','#74498f','#805197','#8c58a1'];
const academyCosts = [120n,240n,400n,640n,900n].map(value => value * 50_000_000_000_000_000n);

// Recruit only at the same player rank; 448 current-rank troops bridge an eightfold promotion.
// Price grows ×3.5 while income grows ×2, keeping later ranks progressively costly.
// Exact integer ratios keep even the 56th marshal recruit below the wallet limit.
export const GALACTIC_OFFICERS = Object.freeze(ranks.map((name, i) => {
  const base = 120_000_000_000_000_000n * 7n ** BigInt(i) / 2n ** BigInt(i);
  return Object.freeze({
    id:ids[i], name, field:ids[i]+'s', school:'galactic', schoolLevel:i+1,
    unlockRank:unlockRanks[i], recruitRankPower:sizes[i], power:sizes[i]/64,
    passive:350_000_000_000*2**i, tap:2_400_000_000_000*2**i,
    price:Object.freeze([base,base*8n/1000n,base/10000n].map(compactMoney)),
    academyCost:compactMoney(academyCosts[i]), color:colors[i],
    insigniaKind:'galactic', marks:i+1, width:18, height:27,
  });
}));
