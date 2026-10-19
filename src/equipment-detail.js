import {compactGuidePower} from './power-format.js';
import {equipmentCombatPower,equipmentCombatStats,UNIT_TRAITS} from './battle-balance.js';
import {multiplyMoney} from './money.js';
import { fmt, fmtGold, fmtGoldCost } from './format.js';
import {
  EQUIPMENT, equipmentOf, equipmentCount, equipmentStats, equipmentLevelLimit, equipmentStage,
  equipmentPurchaseOffer, enhancementOffer, deploymentOffer,
} from './equipment.js';
import { equipmentRole } from './equipment-tiles.js';

const row = (name, value) => `<dt>${name}</dt><dd>${value}</dd>`;

export function equipmentDetailMarkup(s, id, {active=true} = {}) {
  const d = EQUIPMENT[id], gun = equipmentOf(s, id), count = equipmentCount(s, id);
  const offer = equipmentPurchaseOffer(s, id);
  const level = gun?.level ?? 0, stats = equipmentStats(level, id), times = count || 1;
  const combat = equipmentCombatStats(id,level);
  const up = gun ? enhancementOffer(s, id) : null, max = up?.reason === 'max';
  const next = gun && !max ? equipmentStats(level + 1, id) : null;
  const upgrade = !gun ? '구매 후 가능' : max ? (level>up.limit ? `기존 ${level}강 유지 · 현재 한도 ${up.limit}강` : `현재 한도 ${up.limit}강 달성`)
    : `+${level} → +${level + 1} · 초당 ${fmtGold(stats.passive)} → ${fmtGold(next.passive)} G · 터치 ${fmtGold(stats.tap)} → ${fmtGold(next.tap)} G`;
  const steps = Array.from({ length: Math.max(level,equipmentLevelLimit(s)) }, (_, i) => `<i data-level="${i + 1}"${gun && i + 1 <= level ? ' class="filled"' : ''}></i>`).join('');
  return {
    kicker: '군사 장비',
    title: d.name,
    body: `<div class="detail-art detail-art-wide"><canvas data-gun-preview width="440" height="248" role="img" aria-label="${d.name} 외형"></canvas></div>
      <p>${equipmentRole(id)}</p>
      <dl class="detail-stats">
        ${row('장비 전투력',compactGuidePower(BigInt(equipmentCombatPower(id,level))))}${row('출격 마나',UNIT_TRAITS[id].cost)}${row('공격력 / 체력',fmt(Math.round(combat.damage))+' / '+fmt(Math.round(combat.hp)))}${row('해금 계급', d.unlockRank)}${row('구매 가격', fmtGoldCost(d.cost) + ' G')}
        ${row('보유', gun ? `${fmt(count)}문 · +${gun.level}강` : offer.locked ? '🔒 잠금' : '미보유')}
        ${row(gun ? '초당 수입(합계)' : '초당 수입(1문)', '+' + fmtGold(multiplyMoney(stats.passive,times)) + ' G')}
        ${row(gun ? '터치 보상(합계)' : '터치 보상(1문)', '+' + fmtGold(multiplyMoney(stats.tap,times)) + ' G')}
        ${row('현재 외형', equipmentStage(id, level))}${row('현재 최대 강화', equipmentLevelLimit(s) + '강')}
        ${row('다음 강화', upgrade)}${gun && !max ? row('강화 비용', fmtGoldCost(up.cost) + ' G · ' + fmt(count) + '문 합계') : ''}
      </dl>
      <div class="enhancement-steps" aria-label="강화 단계">${steps}</div>
      <p>${gun && !max ? '다음 외형: ' + equipmentStage(id, level + 1) : ''}</p>
      <p>배치 중에만 골드 보너스가 적용됩니다. 구매하면 연병장에 자동 배치됩니다. 소장부터 사단기 레벨마다 최대 강화가 1단계씩 늘어납니다. Lv.1은 11강, Lv.10은 20강, Lv.20은 30강입니다.</p>
      <p>11강부터 추가 개량 수입이 붙고 강화 비용도 크게 올라갑니다. 초기 장비도 고강화하면 후반까지 활용할 수 있어요. 전투 성능은 소모 마나와 역할에 맞춰 성장하며 사거리·출격 대기시간은 유지됩니다. 수송기는 공격 대신 같은 전선의 가까운 아군 장비를 최대 체력의 12%씩 회복합니다.</p>
      ${gun?`<button type="button" class="detail-link" data-detail-action="toggle-equipment" data-id="${id}" aria-pressed="${gun.deployed}"${!active||!deploymentOffer(s,id).canDeploy?' disabled':''}>${gun.deployed?'보관하기':'연병장에 배치하기'}</button>`:''}`,
  };
}
