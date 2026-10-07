import { minMoney, multiplyMoney, MAX_GOLD } from './money.js';

// Pacing prices only. Existing armies, income, rank power and saved assets are unchanged.
export const RECRUIT_PRICE_FACTORS = Object.freeze({
  soldier:8, sergeant:12, staffSergeant:12, masterSergeant:12, sergeantMajor:12,
  lieutenant:10, firstLieutenant:10, captain:10, major:10, lieutenantColonel:10,
  colonel:12, brigadierGeneral:12, majorGeneral:12, lieutenantGeneral:12, general:12,
});
export const NCO_SCHOOL_COSTS = Object.freeze([150_000,15_000_000,195_000_000,1_950_000_000,15_000_000_000]);
export function pacedRecruitCost(base,owned,type) {
  // Keep the first four recruits approachable, then raise the price in four-recruit steps through the early squads.
  const factor=type==='soldier'?Math.min(RECRUIT_PRICE_FACTORS.soldier,1+Math.floor(owned/4)):RECRUIT_PRICE_FACTORS[type];
  return minMoney(MAX_GOLD,multiplyMoney(base,factor));
}
