import { BATTLE_RULES, equipmentCombatStats } from './battle.js';
import { UNITS, armyPower } from './units.js';
import { EQUIPMENT, equipmentCount } from './equipment.js';
import { FORMATIONS } from './formations.js';
import { fmt } from './format.js';

const header = (eyebrow, title) => `<header class="battle-header"><div><small>${eyebrow}</small><h2 id="battle-title">${title}</h2></div><button data-battle-close aria-label="전투 메뉴 닫기">×</button></header>`;
export { campaignMarkup as stagesMarkup } from './campaign-map.js';
export function preparationMarkup(state, stage, loadout) {
  const hq = FORMATIONS.find((f) => armyPower(state) >= f.size);
  return header(`${stage.enemyName} · 지역 ${String(stage.region).padStart(2,'0')}`, stage.name) + `
    <div class="battle-matchup"><div><small>우리 본부</small><b>${hq.name}</b><span>${fmt(armyPower(state))} HP</span></div><i>VS</i><div><small>${stage.enemyName}</small><b>${stage.capital?'수도 사령부':'지역 사령부'}</b><span>${fmt(stage.hqPower)} HP</span></div></div>
    <section class="deployment-section"><h3>출전 병력 <small>병종마다 최대 ${BATTLE_RULES.maxUnitsPerType}명</small></h3><p class="battle-note">터치 한 번에 선택한 병력 전원이 사격합니다.</p>
    <div class="deployment-units">${Object.values(UNITS).filter(u => (state[u.field] ?? 0) > 0).map(u => {
      const max = Math.min(BATTLE_RULES.maxUnitsPerType, state[u.field]);
      return `<label class="deployment-unit"><span><b>${u.name}</b><small>보유 ${fmt(state[u.field])}명</small></span><input type="number" inputmode="numeric" min="0" max="${max}" step="1" value="${loadout.units[u.id]}" data-battle-unit="${u.id}" aria-label="${u.name} 출전 인원"><small>/ ${max}명</small></label>`;
    }).join('')}</div></section>
    <section class="deployment-section"><h3>출전 장비 <small>보유 장비 중 선택</small></h3><div class="deployment-gears">${Object.values(EQUIPMENT).filter(d => !!state.equipment[d.id]).map(d => {
      const gun = state.equipment[d.id], combat = equipmentCombatStats(d.id, gun.level, armyPower(state), equipmentCount(state, d.id));
      return `<label class="deployment-gear"><input type="checkbox" data-battle-gear="${d.id}" ${loadout.equipment.includes(d.id) ? 'checked' : ''}><span><b>${d.name} <em>+${gun.level}</em></b><small>[${fmt(equipmentCount(state, d.id))}문]</small><small>자동 공격 · ${fmt(Math.round(combat.damage))} 피해 / ${(combat.intervalMs / 1000).toFixed(2)}초</small></span></label>`;
    }).join('') || '<p class="battle-note">보유한 장비가 없습니다. 병력만으로도 출전할 수 있어요.</p>'}</div></section>
    <p class="battle-note">본부 체력은 총 보유 전력과 같으며 공격력도 함께 성장합니다. 병력·장비는 소모되지 않으며 홈 배치 설정은 유지돼요. ${BATTLE_RULES.maxDurationMs / 60_000}분 안에 본부가 파괴되지 않으면 무승부입니다.</p>
    <p role="status" class="battle-message" id="battle-message"></p>
    <div class="battle-actions"><button data-battle-back>지역 지도</button><button class="battle-primary" id="battle-start">전투 시작</button></div>
    <p class="battle-session-note" data-battle-session></p>`;
}
export function battlefieldMarkup(battle) {
  return header(`STAGE ${String(battle.stageId).padStart(2,'0')} · ${battle.enemyName}`, battle.stageName) + `
    <div class="battle-toolbar"><span>본부를 먼저 파괴하세요</span><b id="battle-time">0:00</b><button id="battle-pause">일시정지</button></div>
    <div class="battle-arena"><button id="battle-field" aria-label="전원 사격"><canvas id="battle-canvas" width="360" height="560" aria-hidden="true"></canvas></button>
    <div class="battle-overlay" id="battle-overlay" hidden><div><small id="battle-result-tag"></small><h3 id="battle-result-title"></h3><p id="battle-result-copy"></p><button class="battle-primary" id="battle-resume">전투 계속</button><div id="battle-result-actions" hidden><button data-battle-retry>다시 도전</button><button data-battle-back>작전 지도</button></div></div></div></div>
    <div class="battle-hp-summary"><span>아군 <b id="battle-player-hp"></b></span><span>적군 <b id="battle-enemy-hp"></b></span></div>
    <p class="battle-controls">화면 터치 · 전원 사격 <small>연사 간격 ${BATTLE_RULES.volleyCooldownMs / 1000}초 · 장비는 자동 공격</small></p>
    <p class="battle-note">전투 터치는 골드를 지급하지 않아요. 전투 중에도 방치 수입은 쌓입니다.</p>
    <p class="battle-session-note" data-battle-session></p>`;
}
