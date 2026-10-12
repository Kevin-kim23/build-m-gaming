import {facilityBonus} from './facilities.js';
import {campaignBonusPercent} from './campaign-rewards.js';
import {equipmentIncome} from './equipment.js';
import {rankForArmy} from './ranks.js';
import {glaiveBonusPercent,personalIncomeBonus,ADMIRALS_COMPASS,STRATEGIC_TABLET,SUPREME_SEAL} from './personal-equipment.js';

// Display percentages only. Money still follows the existing exact, sequential calculation.
// Combine whole-income personal multipliers without mistaking equipment-only income for all income.
const combinedPercent=(first,second)=>((100+first)*(100+second)-10000)/100;
export function incomeEffects(state) {
  const rank=rankForArmy(state),facility=facilityBonus(state),gear=equipmentIncome(state);
  const seal=personalIncomeBonus(state,SUPREME_SEAL.id,rank);
  const glaive=glaiveBonusPercent(state,rank);
  const compass=personalIncomeBonus(state,ADMIRALS_COMPASS.id,rank);
  const tablet=personalIncomeBonus(state,STRATEGIC_TABLET.id,rank);
  const effect=(label,percent,description='')=>({label,percent,description});
  const personal=(specific,name)=>effect('개인장비',combinedPercent(specific,seal),
    [specific?`${name} +${specific}%`:'',seal?`총사령관 인장 +${seal}%`:''].filter(Boolean).join(' × '));
  const equipment=kind=>effect('장비 수입',gear[kind]>0?tablet:0,'전략 지휘패: 배치한 군사 장비의 수입에만 적용');
  return {
    passive:[effect('시설',facility.passive),personal(glaive,'언월도'),effect('점령',campaignBonusPercent(state)),equipment('passive')].filter(e=>e.percent>0),
    tap:[effect('시설',facility.tap),personal(compass,'제독의 나침반'),equipment('tap')].filter(e=>e.percent>0),
  };
}
