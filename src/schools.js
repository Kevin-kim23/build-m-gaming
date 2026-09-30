import { rankForArmy, RANKS } from './ranks.js';
import { OFFICER_GRADES } from './officer-progression.js';

export const SCHOOLS = Object.freeze({
  nco: Object.freeze({id:'nco',name:'부사관학교',field:'ncoSchoolLevel',maxLevel:5,
    costs:Object.freeze([30_000,300_000,3_000_000,15_000_000,60_000_000]),
    effects:Object.freeze(['하사 모집','중사 모집','상사 모집','원사 모집','사관학교 건설 공개'])}),
  officer: Object.freeze({id:'officer',name:'사관학교',field:'officerSchoolLevel',maxLevel:OFFICER_GRADES.length,
    costs:Object.freeze(OFFICER_GRADES.map(grade=>grade.academyCost)),
    effects:Object.freeze(OFFICER_GRADES.map(grade=>grade.name+' 모집')),
    recommendedRanks:Object.freeze(OFFICER_GRADES.map(grade=>grade.recommendedRank))}),
});
export function schoolOffer(state,id) {
  const school=SCHOOLS[id];
  if(!school) throw new RangeError('Unknown school');
  const level=state[school.field]??0, max=level>=school.maxLevel;
  const visible=id==='nco'||(state.ncoSchoolLevel??0)>=5||level>0;
  const locked=id==='officer'&&((state.ncoSchoolLevel??0)<5||rankForArmy(state)<RANKS.indexOf('소장'));
  const cost=max?0:school.costs[level];
  const reason=max?'max':locked?'locked':state.gold<cost?'gold':null;
  return {school,level,nextLevel:max?level:level+1,cost,visible,reason,canBuy:reason===null,
    requirement:id==='officer'?'부사관학교 Lv.5 · 소장 이상':'골드를 모아 단계별로 건설·확장',
    effect:school.effects[max?level-1:level]};
}
// Honor ranks/units that were already available before schools existed.
export function legacySchoolLevel(state) {
  const rank=rankForArmy(state);
  if((state.staffSergeants??0)>0||rank>=RANKS.indexOf('소령')) return 2;
  if((state.sergeants??0)>0||rank>=RANKS.indexOf('소위')) return 1;
  return 0;
}
