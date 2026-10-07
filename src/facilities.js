import { FACILITIES, FACILITY_BY_ID } from './facility-catalog.js';
import { RANKS, rankForArmy } from './ranks.js';
import { scaleMoney } from './money.js';
export { FACILITIES } from './facility-catalog.js';
export const ownedFacilities = state => FACILITIES.filter(f=>state.facilities?.includes(f.id));
export function facilityOffer(state,id) {
  const facility=Object.hasOwn(FACILITY_BY_ID,id)?FACILITY_BY_ID[id]:null;
  if(!facility) throw new RangeError('Unknown facility');
  const owned=state.facilities?.includes(id) ?? false;
  const required=RANKS.indexOf(facility.rank), rank=rankForArmy(state), locked=rank<required;
  const reason=owned?'owned':locked?'locked':state.gold<facility.cost?'gold':null;
  return {facility,cost:facility.cost,owned,locked,visible:owned||rank>=required-1,reason,canBuy:reason===null};
}
// Ownership arrays are replaced on purchase/loading. Cache once, never recompute totals per tap.
const bonuses=new WeakMap();
const empty=Object.freeze({passive:0,tap:0});
export function facilityBonus(state) {
  if(!state.facilities?.length)return empty;
  let bonus=bonuses.get(state.facilities);
  if(!bonus) {
    bonus=Object.freeze(ownedFacilities(state).reduce((sum,f)=>({passive:sum.passive+f.passive,tap:sum.tap+f.tap}),{...empty}));
    bonuses.set(state.facilities,bonus);
  }
  return bonus;
}
export function withFacilityIncome(state,amount,kind) {
  const bonus=facilityBonus(state)[kind];
  return bonus?scaleMoney(amount,100+bonus,100):amount;
}
export const facilityEffect = f => [f.passive?`초당 골드 +${f.passive}%`:null,f.tap?`터치 골드 +${f.tap}%`:null].filter(Boolean).join(' · ');
