import { fmt, fmtGold, fmtGoldCost } from './format.js';
import { recruitOffer } from './game.js';
import { unitAccess } from './units.js';
import { BULK_RECRUIT, COMMAND_BATON, bulkRecruitAccess } from './personal-equipment.js';

const row = (name, value) => `<dt>${name}</dt><dd>${value}</dd>`;

// Everything the compact shop tile leaves out: description, exact numbers and requirements.
export function unitDetailMarkup(state, unit) {
  const access = unitAccess(state, unit), offer = recruitOffer(state, unit.id);
  const bulkRule = BULK_RECRUIT[unit.id], bulk = bulkRule && bulkRecruitAccess(state, unit.id);
  const bulkPrice = bulk?.unlocked ? fmtGoldCost(recruitOffer(state, unit.id, COMMAND_BATON.recruitAmount).cost) + ' G'
    : bulkRule ? `🔒 ${bulk.requirement}` : '지원하지 않음';
  const about = unit.school
    ? `${access.requirement}에서 해금되는 간부입니다. 일반병보다 전력과 수입이 훨씬 큽니다.`
    : unit.role ? `${access.requirement}에서 모집하는 ${unit.role} 특화 병력입니다. 별도 스킬 없이 아래 수입과 전력이 합산됩니다.`
    : '모든 부대의 기본이 되는 병력입니다. 수가 늘수록 전력과 수입이 쌓입니다.';
  return {
    kicker: unit.school ? '간부' : '기본 병력',
    title: unit.name,
    body: `<div class="detail-art"><canvas data-portrait="${unit.id}" width="80" height="100" role="img" aria-label="${unit.name} 픽셀 그림"></canvas></div>
      <p>${about}</p>
      <dl class="detail-stats">
        ${row('전력', '+' + fmt(unit.power))}${row('초당 수입', '+' + fmtGold(unit.passive) + ' G')}${row('터치 보상', '+' + fmtGold(unit.tap) + ' G')}
        ${row('보유', fmt(offer.owned) + '명')}${row('모집 조건', access.requirement)}
        ${row('1명 가격', fmtGoldCost(offer.cost) + ' G')}${row(COMMAND_BATON.recruitAmount + '명 가격', bulkPrice)}
      </dl>
      <p>모집 가격은 이 병종을 모집할 때만 오르며, 다른 병종과 따로 계산합니다.</p>
      ${unit.school && !access.unlocked ? '<button type="button" class="detail-link" data-detail-action="shop-category" data-category="schools">군사학교 건설·확장 →</button>' : ''}`,
  };
}
