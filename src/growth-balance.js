import { minMoney, multiplyMoney, MAX_GOLD } from './money.js';

// Price multipliers apply independently to each type's headcount.
export const RECRUIT_PRICE_FACTORS = Object.freeze({
  soldier:8, administrator:1, driver:1, medic:1,
  sergeant:18, staffSergeant:18, masterSergeant:18, sergeantMajor:18, warrantOfficer:18,
  lieutenant:10, firstLieutenant:10, captain:10, major:10, lieutenantColonel:10,
  colonel:12, brigadierGeneral:12, majorGeneral:12, lieutenantGeneral:12, general:12,
});
export const NCO_SCHOOL_COSTS = Object.freeze([600_000,30_000_000,390_000_000,3_900_000_000,30_000_000_000]);
export function pacedRecruitCost(base,owned,type) {
  // Keep the first four recruits approachable, then raise the price in four-recruit steps through the early squads.
  const factor=type==='soldier'?Math.min(RECRUIT_PRICE_FACTORS.soldier,1+Math.floor(owned/4)):RECRUIT_PRICE_FACTORS[type];
  return minMoney(MAX_GOLD,multiplyMoney(base,factor));
}
