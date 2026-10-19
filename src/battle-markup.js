import { BATTLE_RULES, UNIT_TRAITS, equipmentCombatStats, stageEnemyType, GEAR_CLASS, CLASS_NAMES } from './battle.js';
import { armyPower } from './units.js';
import { EQUIPMENT, equipmentCount } from './equipment.js';
import { FORMATIONS } from './formations.js';
import { fmt } from './format.js';
import {battleRewardMarkup} from './battle-reward-view.js';
import {STAR_FAST_MS,CAPITAL_STAR_FAST_MS} from './campaign-rewards.js';
import { battleLootMarkup } from './battle-result-view.js';
import { battleIcon } from './battle-icons.js';

// 전투 화면은 글을 최소로 둡니다(클래시 로얄처럼). 설명은 모두 "상세보기"(ⓘ) 팝업(battleDetailMarkup)에 있습니다.
const infoButton = `<button class="info-btn" data-battle-info aria-label="상세보기">${battleIcon('info')}</button>`;
export { campaignMarkup as stagesMarkup } from './campaign-map.js';
export { quickDeckMarkup, stageTagsMarkup } from './quick-deck.js';

const gearLine = (state, id) => {
  const gun = state.equipment[id], trait = UNIT_TRAITS[id], combat = equipmentCombatStats(id, gun.level, armyPower(state), equipmentCount(state, id));
  const effect = trait.kind === 'strike' ? `일제 타격 · 기지에 ${fmt(Math.round(combat.damage * BATTLE_RULES.strikeMultiplier))} 피해` : trait.kind === 'heal' ? `회복 지원 · 주변 아군 체력 ${Math.round(BATTLE_RULES.healPercent * 100)}% 회복` : `${fmt(Math.round(combat.damage))} 피해 / ${(combat.intervalMs / 1000).toFixed(2)}초 · 사거리 ${trait.range}`;
  return `${EQUIPMENT[id].name} +${gun.level} [1문] · 마나 ${trait.cost} · 재출격 ${trait.cooldownMs / 1000}초 · ${CLASS_NAMES[GEAR_CLASS[id]]} · ${effect}`;
};

// 상세보기 팝업 내용: 정찰 정보·전투 방법·내 장비 능력.
export function battleDetailMarkup(state, stage) {
  const type = stageEnemyType(stage.id), hq = FORMATIONS.find((f) => armyPower(state) >= f.size);
  const owned = Object.values(EQUIPMENT).filter((d) => !!state.equipment[d.id]);
  return {
    kicker: stage.enemyName, title: stage.name,
    body: `<section class="detail-section"><h3>정찰 · ${type.name}</h3>
      <p>우리 기지 ${hq.name} ${fmt(armyPower(state))} HP · 적 ${stage.capital ? '수도 요새' : '지역 기지'} ${fmt(stage.hqPower)} HP</p>
      <p>적 출격(레인 3곳 중 예고 없이): ${[...new Set(type.pool)].map((id) => `${EQUIPMENT[id].name}(${CLASS_NAMES[GEAR_CLASS[id]]})`).join(' · ')}</p>
      ${stage.capital ? '<p>수도 요새 · 체력이 높은 기지와 강한 포탑을 돌파하세요.</p>' : ''}
      <p>${type.intro?'첫 출격은 견인포로 충분해요. 카드를 고르고 적이 다가오는 레인에 출격하세요.':'장비의 사거리와 이동 속도, 마나 비용을 보고 출격 순서를 정하세요.'}</p></section>
      <section class="detail-section"><h3>전투 보상</h3>${battleRewardMarkup(state,stage)}<p>승리하면 전리품을 받아 특별 대원을 영입할 수 있어요. 재전투는 최초 보상의20%, 한국시간 하루 합산10회입니다. 이후에도 전투와 별 기록 갱신은 가능합니다. 점령 초당 수입은 유지되며 중복되지 않아요. 전리품 보유 상한에서는 실제 지급액이 줄어듭니다.</p><p>승리 1별 · ${(stage.capital?CAPITAL_STAR_FAST_MS:STAR_FAST_MS)/1000}초 이내 또는 기지 체력 50% 이상이면 2별 · 둘 다 달성하면 3별. 별은 공략 기록이며 전리품 배율은 없습니다.</p></section>
      <section class="detail-section"><h3>전투 방법</h3>
      <p>마나가 차면 장비 카드를 레인(왼쪽·가운데·오른쪽)으로 끌어다 놓아 출격시킵니다. 장비는 그 레인을 따라 적 기지로 전진하며, 같은 레인의 적과 자동으로 싸웁니다.</p>
      <p>병력은 본부 체력과 포탑에 반영됩니다. 장비 공격력·체력은 종류와 강화로만 결정됩니다. 장비는 소모되지 않으며 홈 배치 설정은 유지돼요. ${BATTLE_RULES.maxDurationMs / 60_000}분 안에 적 기지를 부수지 못하면 무승부입니다.</p></section>
      <section class="detail-section"><h3>내 장비</h3><ul class="detail-list">${owned.map((d) => `<li>${gearLine(state, d.id)}</li>`).join('') || '<li>보유한 장비가 없습니다. 장비 탭에서 구매하면 출전할 수 있어요.</li>'}</ul></section>`,
  };
}

export function battlefieldMarkup(battle) {
  return `<header class="battle-header slim"><div><small>STAGE ${String(battle.stageNumber??battle.stageId).padStart(2,'0')}</small><h2 id="battle-title">${battle.stageName}</h2></div><b id="battle-time">0:00</b>${infoButton}<button id="battle-pause" aria-label="일시정지">${battleIcon('pause')}</button><button data-battle-close aria-label="전투 메뉴 닫기">×</button></header><p class="battle-session-note" role="status" data-battle-session></p>
    <div class="battle-arena" id="battle-arena"><div id="battle-field"><canvas id="battle-canvas" width="360" height="440" aria-hidden="true"></canvas></div>
    <div class="base-hp enemy" id="base-hp-enemy" role="img" aria-label="적 ${battle.enemy.hq.name} 체력"><small>${battle.enemy.hq.name}${battle.enemy.fortress?' · 수도 본부':''}</small><div class="base-hp-bar"><i id="base-hp-enemy-fill"></i></div><b id="battle-enemy-hp"></b></div>
    <div class="base-hp player" id="base-hp-player" role="img" aria-label="우리 ${battle.player.hq.name} 체력"><small>${battle.player.hq.name}</small><div class="base-hp-bar"><i id="base-hp-player-fill"></i></div><b id="battle-player-hp"></b></div>
    <div class="lane-picks" id="lane-picks">${["왼쪽", "가운데", "오른쪽"].map((name, i) => `<button class="lane-hit" data-lane="${i}" aria-label="${name} 레인에 출격" disabled><span>${name}</span></button>`).join("")}</div>
    <div class="battle-overlay" id="battle-overlay" hidden><div><small id="battle-result-tag"></small><h3 id="battle-result-title"></h3><p class="battle-stars" id="battle-result-stars" aria-live="polite"></p>${battleLootMarkup()}<p id="battle-result-copy"></p><button class="battle-primary" id="battle-resume">전투 계속</button><div id="battle-result-actions" hidden><button class="battle-primary" data-battle-next hidden>다음 지역</button><button data-battle-retry>다시 도전</button><button data-battle-back>작전 지도</button></div></div></div></div>
    <div class="battle-mana">${battleIcon('mana')}<div class="battle-mana-bar"><i id="battle-mana-fill"></i></div><b id="battle-mana-text" aria-label="현재 마나">0</b></div>
    <div class="battle-cards" id="battle-cards" style="--cards:${battle.deck.length}">${battle.deck.map((g) => `<button class="deploy-card" data-deploy="${g.id}" aria-pressed="false" aria-label="${EQUIPMENT[g.id].name} 카드, 마나 ${g.cost}" disabled><i class="card-cost">${g.cost}</i><canvas class="card-art" data-card-art="${g.id}" data-level="${g.level}" width="112" height="136" aria-hidden="true"></canvas><b>${EQUIPMENT[g.id].name}</b><small data-deploy-cost="${g.id}">마나 ${g.cost}</small></button>`).join('')}</div>
    `;
}
