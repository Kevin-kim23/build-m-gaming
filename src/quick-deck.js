import {compactGuidePower} from './power-format.js';
import {equipmentCombatPower} from './battle-balance.js';
import { UNIT_TRAITS, battleSlots, stageEnemyType, GEAR_CLASS, CLASS_NAMES } from './battle.js';
import { EQUIPMENT } from './equipment.js';
import { battleIcon } from './battle-icons.js';

// 작전 지도 아래쪽의 "출전 덱": 장비 카드(그림+이름+마나 배지)를 눌러 고르고 바로 전투를 시작한다(클래시 로얄식).
// 카드 그림은 화면에 붙인 뒤 battle-ui의 paintCardArt가 canvas[data-card-art]에 그린다.
export function stageTagsMarkup(stage) {
  const type = stageEnemyType(stage.id);
  return `<span class="chip">${type.name}</span>${type.intro?'<span class="chip">견인포로 첫 출격</span>':''}${stage.capital?'<span class="chip">수도 요새</span>':''}`;
}
export function quickDeckMarkup(state, stage, deckIds) {
  const owned = Object.values(EQUIPMENT).filter((d) => !!state.equipment?.[d.id]);
  if (!owned.length) return '<p class="battle-note">보유한 장비가 없어요. 장비 탭에서 구매해 보세요.</p>';
  return `<div class="quick-deck gear-grid" role="group" aria-label="출전 장비 선택">${owned.map((d) => {
    const gun = state.equipment[d.id];
    return `<label class="deployment-gear"><input type="checkbox" data-battle-gear="${d.id}" ${deckIds.includes(d.id) ? 'checked' : ''}><span class="gear-tile mini"><i class="card-cost" aria-label="마나 ${UNIT_TRAITS[d.id].cost}">${UNIT_TRAITS[d.id].cost}</i><canvas class="card-art" data-card-art="${d.id}" data-level="${gun.level}" width="112" height="136" aria-hidden="true"></canvas><b>${d.name}</b><small>전투력 ${compactGuidePower(BigInt(equipmentCombatPower(d.id,gun.level)))}</small><small>${CLASS_NAMES[GEAR_CLASS[d.id]]}</small><em class="gear-check-mark" aria-hidden="true">${battleIcon('check')}</em></span></label>`;
  }).join('')}</div><span hidden id="quick-deck-slots" data-slots="${battleSlots(state)}"></span>`;
}
