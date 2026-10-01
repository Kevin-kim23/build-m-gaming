import { BATTLE_RULES, equipmentCombatStats, battleSlots, stageEnemyType, matchupMultiplier, GEAR_CLASS, CLASS_NAMES } from './battle.js';
import { armyPower } from './units.js';
import { EQUIPMENT, equipmentCount } from './equipment.js';
import { FORMATIONS } from './formations.js';
import { fmt } from './format.js';

const header = (eyebrow, title) => `<header class="battle-header"><div><small>${eyebrow}</small><h2 id="battle-title">${title}</h2></div><button data-battle-close aria-label="전투 메뉴 닫기">×</button></header>`;
export { campaignMarkup as stagesMarkup } from './campaign-map.js';
export function preparationMarkup(state, stage, loadout) {
  const hq = FORMATIONS.find((f) => armyPower(state) >= f.size);
  return header(`${stage.enemyName} · 지역 ${String(stage.region).padStart(2,'0')}`, stage.name) + `
    <div class="battle-matchup"><div><small>우리 본부</small><b>${hq.name}</b><span>${fmt(armyPower(state))} HP</span></div><i>VS</i><div><small>${stage.enemyName}</small><b>${stage.capital?'수도 사령부':'지역 사령부'}</b><span>${fmt(stage.hqPower)} HP</span></div></div>
    <p class="battle-intel"><b>정찰 · ${stageEnemyType(stage.id).name}</b> <span>적 편성: ${['artillery','tank','selfPropelled'].map(id=>EQUIPMENT[id].name).join('·')} + 보병 사격</span><span>유리한 장비: <em class="good">${CLASS_NAMES[stageEnemyType(stage.id).strong]} ×1.3</em> · 불리한 장비: <em class="bad">${CLASS_NAMES[stageEnemyType(stage.id).weak]} ×0.8</em></span></p>
    <section class="deployment-section"><h3>출전 장비 <small id="battle-slot-count">최대 ${battleSlots(state)}칸 · 중령 3칸 · 준장·중장·대장 +1칸</small></h3><p class="battle-note">장비만 출전합니다. 병력은 전투력(본부 체력·공격력)으로만 반영돼요. 장비는 자동으로 공격하고, 전투 중 장비별 필살기 버튼을 눌러 큰 피해를 줍니다.</p><div class="deployment-gears">${Object.values(EQUIPMENT).filter(d => !!state.equipment[d.id]).map(d => {
      const gun = state.equipment[d.id], match = matchupMultiplier(stage.id, d.id), combat = equipmentCombatStats(d.id, gun.level, armyPower(state), equipmentCount(state, d.id));
      return `<label class="deployment-gear"><input type="checkbox" data-battle-gear="${d.id}" ${loadout.equipment.includes(d.id) ? 'checked' : ''}><span><b>${d.name} <em>+${gun.level}</em> <i class="tag ${match > 1 ? 'good' : match < 1 ? 'bad' : ''}">${CLASS_NAMES[GEAR_CLASS[d.id]]}${match > 1 ? ' · 상성 유리 ▲' : match < 1 ? ' · 상성 불리 ▼' : ''}</i></b><small>[${fmt(equipmentCount(state, d.id))}문]</small><small>${combat.healing ? `보급 지원 · 본부 ${fmt(Math.round(combat.healing))} 회복` : `자동 공격 · ${fmt(Math.round(combat.damage * match))} 피해`} / ${(combat.intervalMs / 1000).toFixed(2)}초</small></span></label>`;
    }).join('') || '<p class="battle-note">보유한 장비가 없습니다. 상점에서 장비를 구매하면 출전할 수 있어요.</p>'}</div></section>
    <p class="battle-note">본부 체력은 총 보유 전력과 같으며 공격력도 함께 성장합니다. 장비는 소모되지 않으며 홈 배치 설정은 유지돼요. ${BATTLE_RULES.maxDurationMs / 60_000}분 안에 본부가 파괴되지 않으면 무승부입니다.</p>
    <p role="status" class="battle-message" id="battle-message"></p>
    <div class="battle-actions"><button data-battle-back>지역 지도</button><button class="battle-primary" id="battle-start">전투 시작</button></div>
    <p class="battle-session-note" data-battle-session></p>`;
}
export function battlefieldMarkup(battle) {
  return header(`STAGE ${String(battle.stageId).padStart(2,'0')} · ${battle.enemyName}`, battle.stageName) + `
    <div class="battle-toolbar"><span>본부를 먼저 파괴하세요</span><b id="battle-time">0:00</b><button id="battle-pause">일시정지</button></div>
    <div class="battle-arena" id="battle-arena"><div id="battle-field"><canvas id="battle-canvas" width="360" height="560" aria-hidden="true"></canvas></div>
    <div class="battle-overlay" id="battle-overlay" hidden><div><small id="battle-result-tag"></small><h3 id="battle-result-title"></h3><p class="battle-stars" id="battle-result-stars" aria-live="polite"></p><p id="battle-result-copy"></p><button class="battle-primary" id="battle-resume">전투 계속</button><div id="battle-result-actions" hidden><button data-battle-retry>다시 도전</button><button data-battle-back>작전 지도</button></div></div></div></div>
    <div class="battle-hp-summary"><span>아군 <b id="battle-player-hp"></b></span><span>적군 <b id="battle-enemy-hp"></b></span></div>
    <div class="battle-specials" id="battle-specials">${battle.player.equipment.map((g) => `<button data-special="${g.id}" disabled><b>${EQUIPMENT[g.id].name}</b><small data-special-state="${g.id}">준비 중</small></button>`).join('')}</div>
    <p class="battle-controls">장비는 자동 공격 <small>필살기 버튼: 첫 사용 ${BATTLE_RULES.specialFirstReadyMs / 1000}초 후 · 사용 뒤 ${BATTLE_RULES.specialCooldownMs / 1000}초 대기</small></p>
    <p class="battle-note">전투 중 터치는 골드를 지급하지 않아요. 전투 중에도 방치 수입은 쌓입니다.</p>
    <p class="battle-session-note" data-battle-session></p>`;
}
