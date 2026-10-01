import { fmt, fmtGold, fmtGoldCost } from './format.js';
import {
  EQUIPMENT, equipmentOf, equipmentCount, equipmentStats, equipmentLevelLimit, equipmentStage,
  equipmentPurchaseOffer, additionalEquipmentOffer, enhancementOffer,
} from './equipment.js';
import { equipmentRole } from './equipment-tiles.js';

const row = (name, value) => `<dt>${name}</dt><dd>${value}</dd>`;
const ADDITIONAL = { locked: '🔒 소장 · 사단기 Lv.1부터', enhancement: '🔒 10강 이상 필요', limit: '보유 수량 한도' };

// `manage` adds the shortcut to the equipment tab; it is left out when opened from that tab.
export function equipmentDetailMarkup(s, id, { manage = true } = {}) {
  const d = EQUIPMENT[id], gun = equipmentOf(s, id), count = equipmentCount(s, id);
  const offer = equipmentPurchaseOffer(s, id), add = additionalEquipmentOffer(s, id);
  const level = gun?.level ?? 0, stats = equipmentStats(level, id), times = count || 1;
  const up = gun ? enhancementOffer(s, id) : null, max = up?.reason === 'max';
  const next = gun && !max ? equipmentStats(level + 1, id) : null;
  const upgrade = !gun ? '구매 후 가능' : max ? `최대 ${up.limit}강 달성`
    : `+${level} → +${level + 1} · 초당 ${fmtGold(stats.passive)} → ${fmtGold(next.passive)} G · 터치 ${fmtGold(stats.tap)} → ${fmtGold(next.tap)} G`;
  const steps = Array.from({ length: equipmentLevelLimit(s) }, (_, i) => `<i data-level="${i + 1}"${gun && i + 1 <= level ? ' class="filled"' : ''}></i>`).join('');
  return {
    kicker: '군사 장비',
    title: d.name,
    body: `<div class="detail-art detail-art-wide"><canvas data-gun-preview width="440" height="248" role="img" aria-label="${d.name} 외형"></canvas></div>
      <p>${equipmentRole(id)}</p>
      <dl class="detail-stats">
        ${row('해금 계급', d.unlockRank)}${row('구매 가격', fmtGoldCost(d.cost) + ' G')}
        ${row('보유', gun ? `${fmt(count)}문 · +${gun.level}강` : offer.locked ? '🔒 잠금' : '미보유')}
        ${row(gun ? '초당 수입(합계)' : '초당 수입(1문)', '+' + fmtGold(stats.passive * times) + ' G')}
        ${row(gun ? '터치 보상(합계)' : '터치 보상(1문)', '+' + fmtGold(stats.tap * times) + ' G')}
        ${row('현재 외형', equipmentStage(id, level))}${row('현재 최대 강화', equipmentLevelLimit(s) + '강')}
        ${row('다음 강화', upgrade)}${gun && !max ? row('강화 비용', fmtGoldCost(up.cost) + ' G · ' + fmt(count) + '문 합계') : ''}
        ${row('1문 추가 비용', gun ? (ADDITIONAL[add.reason] ?? fmtGoldCost(add.cost) + ' G') : '구매 후 가능')}
      </dl>
      <div class="enhancement-steps" aria-label="강화 단계">${steps}</div>
      <p>${gun && !max ? '다음 외형: ' + equipmentStage(id, level + 1) : ''}</p>
      <p>배치 중에만 골드 보너스가 적용됩니다. 빈자리에 자동 배치되고 4칸이 차면 보관되며, 같은 종류는 전체가 함께 강화됩니다. 사단기 Lv.2부터 최대 20강까지 확장됩니다.</p>
      <p>추가 구매: 사단기 Lv.1 · 보유 장비 10강 이상 필요. 현재 강화 단계를 유지한 채 같은 종류 한 칸에 합류하며 문마다 수입·전투 효과가 합산됩니다.</p>
      ${gun && manage ? `<button type="button" class="detail-link" data-detail-action="manage-equipment" data-id="${id}">장비 탭에서 강화·관리 →</button>` : ''}`,
  };
}
