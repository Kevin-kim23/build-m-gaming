import { FACILITIES, FACILITY_BY_ID, MAX_FACILITY_LEVEL, FACILITY_BONUS_STEP } from './facility-catalog.js';
import { RANKS, rankForArmy } from './ranks.js';
import { scaleMoney, compactMoney } from './money.js';
export { FACILITIES, MAX_FACILITY_LEVEL } from './facility-catalog.js';
function facilityType(id) {
  if(!Object.hasOwn(FACILITY_BY_ID,id))throw new RangeError('Unknown facility');
  return FACILITY_BY_ID[id];
}
function validLevel(level) {
  if(!Number.isInteger(level)||level<1||level>MAX_FACILITY_LEVEL)throw new RangeError('Invalid facility level');
  return level;
}
export function facilityLevel(state,id) {
  facilityType(id);
  return state.facilities?.includes(id)?validLevel(state.facilityLevels?.[id]??1):0;
}
export const ownedFacilities = state => FACILITIES.filter(f=>state.facilities?.includes(f.id))
  .map(f=>({...f,level:facilityLevel(state,f.id)}));
export function facilityOffer(state,id) {
  const facility=facilityType(id);
  const owned=state.facilities?.includes(id) ?? false;
  const required=RANKS.indexOf(facility.rank), rank=rankForArmy(state), locked=rank<required;
  const reason=owned?'owned':locked?'locked':state.gold<facility.cost?'gold':null;
  return {facility,cost:facility.cost,owned,locked,visible:true,reason,canBuy:reason===null};
}
const bonusScale = level => 100+FACILITY_BONUS_STEP*(validLevel(level)-1);
export function facilityStats(id,level=1) {
  const facility=facilityType(id),scale=bonusScale(level);
  return {passive:facility.passive*scale/100,tap:facility.tap*scale/100};
}
// Fixed catalog, 19 prices each. Exact rational geometric growth, rounded up to 1,000 G.
const prices = new Map(FACILITIES.map(f=>[f.id,Object.freeze(Array.from({length:MAX_FACILITY_LEVEL-1},(_,index)=>{
  const divisor=2n**BigInt(index+1)*1000n;
  const numerator=BigInt(f.cost)*3n*5n**BigInt(index);
  return compactMoney((numerator+divisor-1n)/divisor*1000n);
}))]));
export function facilityUpgradeCost(id,level) {
  facilityType(id);validLevel(level);
  return level===MAX_FACILITY_LEVEL?null:prices.get(id)[level-1];
}
export function facilityUpgradeOffer(state,id) {
  const facility=facilityType(id),level=facilityLevel(state,id);
  const cost=level?facilityUpgradeCost(id,level):null;
  const reason=!level?'unowned':cost===null?'max':state.gold<cost?'gold':null;
  return {facility,level,nextLevel:Math.min(MAX_FACILITY_LEVEL,level+1),maxLevel:MAX_FACILITY_LEVEL,
    cost,reason,canUpgrade:reason===null};
}
// Purchases and upgrades replace both records. Cache by identity, never sum percentages per tap.
const bonuses=new WeakMap();
const empty=Object.freeze({passive:0,tap:0});
const emptyEntry=Object.freeze({basis:empty,percent:empty});
function cachedBonus(state) {
  if(!state.facilities?.length)return emptyEntry;
  let entry=bonuses.get(state.facilities);
  if(!entry||entry.levels!==state.facilityLevels) {
    const basis={passive:0,tap:0};
    for(const f of ownedFacilities(state)){
      const scale=bonusScale(f.level);
      basis.passive+=f.passive*scale;basis.tap+=f.tap*scale;
    }
    entry={levels:state.facilityLevels,basis:Object.freeze(basis),
      percent:Object.freeze({passive:basis.passive/100,tap:basis.tap/100})};
    bonuses.set(state.facilities,entry);
  }
  return entry;
}
export const facilityBonus = state => cachedBonus(state).percent;
export function withFacilityIncome(state,amount,kind) {
  const bonus=cachedBonus(state).basis[kind];
  return bonus?scaleMoney(amount,10000+bonus,10000):amount;
}
export const facilityEffect = (f,level=f.level??1) => {
  const stats=facilityStats(f.id,level);
  return [stats.passive?`초당 골드 +${stats.passive}%`:null,stats.tap?`터치 골드 +${stats.tap}%`:null].filter(Boolean).join(' · ');
};
