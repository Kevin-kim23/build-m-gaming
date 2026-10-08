import { catalogVisible, rankForArmy, RANKS } from './ranks.js';
import { PERSONAL_EQUIPMENT, COMMAND_BATON, GENERAL_SWORD, DIVISION_FLAG, GENERAL_REVOLVER, MARSHAL_GLAIVE, ADMIRALS_COMPASS, STRATEGIC_TABLET, SUPREME_SEAL, personalIncomePercent, AUTO_TOUCH } from './personal-catalog.js';
import { scaleMoney } from './money.js';
export { PERSONAL_EQUIPMENT, COMMAND_BATON, GENERAL_SWORD, DIVISION_FLAG, GENERAL_REVOLVER, MARSHAL_GLAIVE, ADMIRALS_COMPASS, STRATEGIC_TABLET, SUPREME_SEAL, personalIncomePercent, AUTO_TOUCH } from './personal-catalog.js';

// Rank grants the item only; enhancement is persisted independently from promotions.
export function personalStatus(state,id) {
  const item=PERSONAL_EQUIPMENT[id];
  if(!item)throw new RangeError('Unknown personal equipment');
  const owned=rankForArmy(state)>=RANKS.indexOf(item.unlockRank);
  return {visible:catalogVisible(state,item.unlockRank),owned,level:owned?(state.personalLevels?.[id]??1):0};
}
export const commandBatonStatus = state=>personalStatus(state,COMMAND_BATON.id);
export const generalSwordStatus = state=>personalStatus(state,GENERAL_SWORD.id);
export const divisionFlagStatus = state=>personalStatus(state,DIVISION_FLAG.id);
export const generalRevolverStatus = state=>personalStatus(state,GENERAL_REVOLVER.id);
export const marshalGlaiveStatus = state=>personalStatus(state,MARSHAL_GLAIVE.id);
export function glaiveBonusPercent(state,rank=rankForArmy(state)) {
  return rank>=RANKS.indexOf(MARSHAL_GLAIVE.unlockRank)?
    MARSHAL_GLAIVE.passiveBonusPercent+((state.personalLevels?.marshalGlaive??1)-1)*MARSHAL_GLAIVE.passiveBonusStep:0;
}
export function personalIncomeBonus(state,id,rank=rankForArmy(state)) {
  const item=PERSONAL_EQUIPMENT[id];
  if(!item||item.incomeBonusPercent===undefined)throw new RangeError('Unknown personal income bonus');
  return rank>=RANKS.indexOf(item.unlockRank)?personalIncomePercent(id,state.personalLevels?.[id]??1):0;
}
const applyBonus = (income,bonus) => bonus?scaleMoney(income,100+bonus,100):income;
// Equipment-only bonuses run before troop income is combined; no battle statistics change.
export const withPersonalEquipmentIncome = (state,income) => income?applyBonus(income,personalIncomeBonus(state,STRATEGIC_TABLET.id)):income;
// One shared layer serves manual taps, revolver settlement and offline accrual.
export function withPersonalIncome(state,income,kind='passive') {
  if(!income)return income;
  const rank=rankForArmy(state);
  const specific=kind==='tap'?personalIncomeBonus(state,ADMIRALS_COMPASS.id,rank):glaiveBonusPercent(state,rank);
  return applyBonus(applyBonus(income,specific),personalIncomeBonus(state,SUPREME_SEAL.id,rank));
}
export const FLAG_ENHANCEMENT_LIMITS = Object.freeze(Array.from({length:DIVISION_FLAG.maxLevel+1},(_,level)=>10+level));
export function enhancementLimitForFlag(level) {
  if(!Number.isInteger(level)||level<0||level>DIVISION_FLAG.maxLevel)throw new RangeError('Invalid flag level');
  return FLAG_ENHANCEMENT_LIMITS[level];
}
export const generalSwordDuration = state=>GENERAL_SWORD.durationMs+Math.max(0,generalSwordStatus(state).level-1)*GENERAL_SWORD.durationStepMs;
export const generalRevolverDuration = state=>AUTO_TOUCH.durationMs+Math.max(0,generalRevolverStatus(state).level-1)*AUTO_TOUCH.durationStepMs;
export function autoTouchStatus(state,now=Date.now()) {
  const owned=generalRevolverStatus(state).owned,at=state.autoTouchActivatedAt??null;
  const elapsed=at===null?Infinity:Math.max(0,Math.max(now,state.lastAccrual??0)-at);
  const durationMs=at===null?generalRevolverDuration(state):(state.autoTouchDurationMs??AUTO_TOUCH.durationMs);
  const active=owned&&elapsed<durationMs,remainingMs=Math.max(0,AUTO_TOUCH.cooldownMs-elapsed);
  return {owned,active,canUse:owned&&remainingMs===0,remainingMs,durationMs,activeMs:active?durationMs-elapsed:0};
}
export const BULK_RECRUIT = Object.freeze(Object.fromEntries([
  'soldier','sergeant','staffSergeant','masterSergeant','sergeantMajor','lieutenant','firstLieutenant','captain','major','lieutenantColonel',
  'colonel','brigadierGeneral','majorGeneral','lieutenantGeneral','general',
  'juniorMarshal','minorMarshal','middleMarshal','grandMarshal','specialMarshal',
].map((id,i)=>[id,Object.freeze({level:i+1})])));
export function bulkRecruitAccess(state,type) {
  const rule=BULK_RECRUIT[type];
  if(!rule)return {visible:false,unlocked:false,requirement:'일괄 모집 미지원'};
  const baton=commandBatonStatus(state);
  return {visible:baton.level>=rule.level,unlocked:baton.level>=rule.level,requirement:`지휘봉 Lv.${rule.level} 필요`};
}
// Active windows snapshot their start-time level, so enhancement cannot extend a running skill.
export function swordSkillStatus(state,now=Date.now()) {
  const owned=generalSwordStatus(state).owned,at=state.swordActivatedAt??null;
  const elapsed=at===null?Infinity:Math.max(0,Math.max(now,state.lastAccrual??0)-at);
  const durationMs=at===null?generalSwordDuration(state):(state.swordDurationMs??GENERAL_SWORD.durationMs);
  const active=owned&&elapsed<durationMs,remainingMs=at===null?0:Math.max(0,GENERAL_SWORD.cooldownMs-elapsed);
  return {owned,active,canUse:owned&&remainingMs===0,activeMs:active?durationMs-elapsed:0,remainingMs,durationMs,multiplier:active?GENERAL_SWORD.tapMultiplier:1};
}
