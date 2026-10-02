import { BATTLE_RULES, UNIT_TRAITS, equipmentCombatStats, battleSlots, stageEnemyType, matchupMultiplier, GEAR_CLASS, CLASS_NAMES, fortressShieldClass } from './battle.js';
import { armyPower } from './units.js';
import { EQUIPMENT, equipmentCount } from './equipment.js';
import { FORMATIONS } from './formations.js';
import { fmt } from './format.js';

const header = (eyebrow, title) => `<header class="battle-header"><div><small>${eyebrow}</small><h2 id="battle-title">${title}</h2></div><button data-battle-close aria-label="전투 메뉴 닫기">×</button></header>`;
export { campaignMarkup as stagesMarkup } from './campaign-map.js';
export function preparationMarkup(state, stage, loadout) {
  const hq = FORMATIONS.find((f) => armyPower(state) >= f.size), type = stageEnemyType(stage.id), shield = fortressShieldClass(stage.id);
  return header(`${stage.enemyName} · 지역 ${String(stage.region).padStart(2,'0')}`, stage.name) + `
    <div class="battle-matchup"><div><small>우리 기지</small><b>${hq.name}</b><span>${fmt(armyPower(state))} HP</span></div><i>VS</i><div><small>${stage.enemyName}</small><b>${stage.capital?'수도 요새':'지역 기지'}</b><span>${fmt(stage.hqPower)} HP</span></div></div>
    <p class="battle-intel"><b>정찰 · ${type.name}</b> <span>적 출격(레인 3곳 중 예고 없이): ${[...new Set(type.pool)].map(id=>`${EQUIPMENT[id].name}(${CLASS_NAMES[GEAR_CLASS[id]]})`).join(' · ')}</span>${shield?`<span class="fort">요새 수도 · 방어 장갑: <em class="bad">${CLASS_NAMES[shield]} 장비의 기지 피해 -40%</em> · 기지가 더 단단하고 포탑이 강합니다</span>`:''}<span>상성: 공중 &gt; 기갑 &gt; 화력 &gt; 공중 · 이 지역은 <em class="good">${CLASS_NAMES[type.counter]}</em> 장비가 <em class="good">유리</em></span></p>
    <section class="deployment-section"><h3>출전 장비 <small id="battle-slot-count">최대 ${battleSlots(state)}칸 · 중령 3칸 · 준장·중장·대장 +1칸</small></h3><p class="battle-note">전투에서는 마나가 차면 장비 카드를 레인(왼쪽·가운데·오른쪽)으로 끌어다 놓아 출격시킵니다. 장비는 그 레인을 따라 적 기지로 전진하며, 같은 레인의 적과 자동으로 싸웁니다. 병력은 기지 체력과 공격력(전투력)으로만 반영돼요.</p><div class="deployment-gears gear-grid">${Object.values(EQUIPMENT).filter(d => !!state.equipment[d.id]).map(d => {
      const gun = state.equipment[d.id], match = matchupMultiplier(stage.id, d.id), trait = UNIT_TRAITS[d.id], combat = equipmentCombatStats(d.id, gun.level, armyPower(state), equipmentCount(state, d.id));
      const effect = trait.kind === 'strike' ? `일제 타격 · 기지에 ${fmt(Math.round(combat.damage * BATTLE_RULES.strikeMultiplier))} 피해` : trait.kind === 'heal' ? `회복 지원 · 주변 아군 체력 ${Math.round(BATTLE_RULES.healPercent * 100)}% 회복` : `${fmt(Math.round(combat.damage))} 피해 / ${(combat.intervalMs / 1000).toFixed(2)}초 · 사거리 ${trait.range}`;
      const info = `${d.name} +${gun.level} [${fmt(equipmentCount(state, d.id))}문] · 마나 ${trait.cost} · 재출격 ${trait.cooldownMs / 1000}초 · ${CLASS_NAMES[GEAR_CLASS[d.id]]}${match > 1 ? ' · 이 지역에 유리 ▲' : match < 1 ? ' · 이 지역에 불리 ▼' : ''} · ${effect}`;
      return `<label class="deployment-gear"><input type="checkbox" data-battle-gear="${d.id}" data-info="${info}" ${loadout.equipment.includes(d.id) ? 'checked' : ''}><span class="gear-tile ${match > 1 ? 'good' : match < 1 ? 'bad' : ''}"><i class="card-cost" aria-label="마나 ${trait.cost}">${trait.cost}</i><canvas class="card-art" data-card-art="${d.id}" data-level="${gun.level}" width="112" height="136" aria-hidden="true"></canvas><b>${d.name}</b><small>+${gun.level} · ${CLASS_NAMES[GEAR_CLASS[d.id]]}${match > 1 ? ' ▲' : match < 1 ? ' ▼' : ''}</small><em class="gear-check-mark" aria-hidden="true">✓</em></span></label>`;
    }).join('') || '<p class="battle-note">보유한 장비가 없습니다. 상점에서 장비를 구매하면 출전할 수 있어요.</p>'}</div><p class="gear-info" id="battle-gear-info" role="status">장비 카드를 눌러 출전 장비를 고르세요. 고른 카드의 설명이 여기에 나와요.</p></section>
    <p class="battle-note">기지 체력은 총 보유 전력과 같으며 장비의 체력·공격력도 전력에 따라 커집니다. 장비는 소모되지 않으며 홈 배치 설정은 유지돼요. ${BATTLE_RULES.maxDurationMs / 60_000}분 안에 적 기지를 부수지 못하면 무승부입니다.</p>
    <p role="status" class="battle-message" id="battle-message"></p>
    <div class="battle-actions"><button data-battle-back>지역 지도</button><button class="battle-primary" id="battle-start">전투 시작</button></div>
    <p class="battle-session-note" data-battle-session></p>`;
}
export function battlefieldMarkup(battle) {
  return header(`STAGE ${String(battle.stageId).padStart(2,'0')} · ${battle.enemyName}`, battle.stageName) + `
    <div class="battle-toolbar"><span>적 기지를 먼저 파괴하세요</span><b id="battle-time">0:00</b><button id="battle-pause">일시정지</button></div>
    <div class="battle-arena" id="battle-arena"><div id="battle-field"><canvas id="battle-canvas" width="360" height="440" aria-hidden="true"></canvas></div>
    <div class="lane-picks" id="lane-picks">${["왼쪽", "가운데", "오른쪽"].map((name, i) => `<button class="lane-hit" data-lane="${i}" aria-label="${name} 레인에 출격" disabled><span>${name}</span></button>`).join("")}</div>
    <div class="battle-overlay" id="battle-overlay" hidden><div><small id="battle-result-tag"></small><h3 id="battle-result-title"></h3><p class="battle-stars" id="battle-result-stars" aria-live="polite"></p><p id="battle-result-copy"></p><button class="battle-primary" id="battle-resume">전투 계속</button><div id="battle-result-actions" hidden><button data-battle-retry>다시 도전</button><button data-battle-back>작전 지도</button></div></div></div></div>
    <div class="battle-hp-summary"><span>우리 기지 <b id="battle-player-hp"></b></span><span>적 기지 <b id="battle-enemy-hp"></b></span></div>
    <div class="battle-mana"><span>마나</span><div class="battle-mana-bar"><i id="battle-mana-fill"></i></div><b id="battle-mana-text">0</b></div>
    <div class="battle-cards" id="battle-cards" style="--cards:${battle.deck.length}">${battle.deck.map((g) => `<button class="deploy-card" data-deploy="${g.id}" aria-pressed="false" aria-label="${EQUIPMENT[g.id].name} 카드, 마나 ${g.cost}" disabled><i class="card-cost">${g.cost}</i><canvas class="card-art" data-card-art="${g.id}" data-level="${g.level}" width="112" height="136" aria-hidden="true"></canvas><b>${EQUIPMENT[g.id].name}</b><small data-deploy-cost="${g.id}">마나 ${g.cost}</small></button>`).join('')}</div>
    <p class="battle-controls" id="battle-hint">장비 카드를 레인으로 끌어다 놓으세요 <small>카드를 누르기만 해도 선택되고, 레인을 누르면 출격해요. 적은 레인 3곳 중 한 곳에서 예고 없이 나타나요. 마나는 시간이 지나면 차오르고, 같은 장비는 재출격 대기가 있어요</small></p>
    <p class="battle-note">전투 중 터치는 골드를 지급하지 않아요. 전투 중에도 방치 수입은 쌓입니다.</p>
    <p class="battle-session-note" data-battle-session></p>`;
}
