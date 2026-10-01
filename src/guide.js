import { armyPower, recruitOffer } from './game.js';
import { UNITS } from './units.js';
import { SCHOOLS } from './schools.js';
import { fmtGoldCost } from './format.js';
import { RANK_DEFINITIONS, rankForArmy, promotionProgress } from './ranks.js';
import { visibleEquipment, equipmentOf, equipmentPurchaseOffer, EQUIPMENT } from './equipment.js';

// First-five-minutes guide. The step is derived from the game state alone, so nothing is
// saved: it advances by itself and stays silent for established saves.
export const GUIDE_STEPS = Object.freeze(['tap', 'first-recruit', 'promote', 'grow', 'school', 'equipment']);

const NCO_RANK = RANK_DEFINITIONS.findIndex((r) => r.name === '하사');
const step = (id, text, target = null, pulse = false) => ({ id, text, target, pulse });

export function guideStep(state) {
  const soldier = recruitOffer(state, 'soldier'), canRecruit = state.gold >= soldier.cost;
  if (armyPower(state) === 0)
    return canRecruit
      ? step('first-recruit', '골드가 모였어요! 상점에서 일반병을 모집해 보세요.', 'shop', true)
      : step('tap', `화면을 터치해 골드를 모으세요. 첫 병사는 ${fmtGoldCost(soldier.cost)}G예요.`);
  const rank = rankForArmy(state);
  if (rank === 0)
    return step('promote', `병사는 가만히 있어도 골드를 벌어 줘요. ${RANK_DEFINITIONS[1].name} 진급까지 ${promotionProgress(state).text}`, 'shop', canRecruit);
  if (rank < NCO_RANK)
    return step('grow', `병사를 계속 모집하세요. 일반병 1명마다 초당 +${UNITS.soldier.passive}G, 터치 +${UNITS.soldier.tap}G가 더해져요.`, 'shop', canRecruit);
  if ((state.ncoSchoolLevel ?? 0) === 0) {
    const cost = SCHOOLS.nco.costs[0];
    return step('school', `부사관학교를 지으면 하사를 모집할 수 있어요. 상점 → 군사학교 (${fmtGoldCost(cost)}G)`, 'school', state.gold >= cost);
  }
  const first = visibleEquipment(state)[0];
  if (first && !Object.keys(EQUIPMENT).some((id) => equipmentOf(state, id)))
    return step('equipment', '새 장비가 공개됐어요. 상점 → 장비 구매에서 수입을 더 올려 보세요.', 'equipment', equipmentPurchaseOffer(state, first.id).canBuy);
  return null;
}
