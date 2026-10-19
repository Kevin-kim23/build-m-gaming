// Sample data for the UX candidate gallery only. No save, session, reward, network or billing access.
import {EQUIPMENT} from '../../src/equipment.js';
import {UNIT_TRAITS, equipmentCombatStats, equipmentCombatPower} from '../../src/battle-balance.js';
import {GEAR_CLASS, CLASS_NAMES} from '../../src/battle.js';
import {campaignStages, COUNTRIES} from '../../src/campaign.js';
import {stageLoot} from '../../src/loot.js';
import {battleIcon} from '../../src/battle-icons.js';
import {compactGuidePower} from '../../src/power-format.js';

// Example player: lieutenant general (5 of the 6 maximum slots open), 23 stages cleared on Astera, 12 owned gear.
// Real rule: 3 slots, +1 each at 준장·중장·대장, so 6 at most.
export const SAMPLE = Object.freeze({rank: '중장', slots: 5, maxSlots: 6, nextSlotRank: '대장', cleared: 23, current: 24});
const owned = [
  ['artillery', 12], ['tank', 11], ['selfPropelled', 10], ['helicopter', 10], ['rocketLauncher', 9], ['transport', 9],
  ['fighter', 8], ['railgunTank', 8], ['icbm', 7], ['carrier', 6], ['flyingFortress', 5], ['orbitalAssault', 3],
];
export const CARDS = Object.freeze(owned.map(([id, level]) => {
  const trait = UNIT_TRAITS[id], stats = equipmentCombatStats(id, level), cls = GEAR_CLASS[id];
  return Object.freeze({id, level, name: EQUIPMENT[id].name, cls, clsName: CLASS_NAMES[cls], cost: trait.cost, kind: trait.kind,
    hp: Math.round(stats.hp ?? 0), damage: Math.round((stats.damage ?? 0) * 10) / 10, range: trait.range, power: equipmentCombatPower(id, level)});
}));
export const card = id => CARDS.find(c => c.id === id);
export const STARTER_DECK = Object.freeze(['artillery', 'tank', 'helicopter', 'transport', 'rocketLauncher']);
export const STAGES = campaignStages.slice(0, 80);
export const ASTERA_COUNTRIES = COUNTRIES.slice(0, 4);
// Deterministic example stars for cleared stages.
export const starsOf = id => id > SAMPLE.cleared ? 0 : [3, 3, 2, 3, 1, 3, 2][id % 7];
export const statusOf = id => id <= SAMPLE.cleared ? 'done' : id === SAMPLE.current ? 'current' : 'locked';
export const STATUS_NAME = {done: '완료', current: '현재 도전', locked: '잠금'};
export const rewardOf = id => stageLoot(id, id > SAMPLE.cleared);
export const countryOf = id => COUNTRIES.find(c => id >= c.firstStage && id <= c.lastStage);
export const icon = battleIcon;
export const avgCost = ids => ids.length ? Math.round(ids.reduce((s, id) => s + card(id).cost, 0) / ids.length) : 0;
// Gear art canvases are painted after insertion by main.js (cached per id+level there).
export const art = (id, w = 120, h = 68) => `<canvas class="gear-art" data-art="${id}" width="${w}" height="${h}" aria-hidden="true"></canvas>`;
export const manaGem = c => `<span class="mana-gem" aria-label="마나 ${c.cost}">${c.cost}</span>`;
// Clean portrait card: one colour for every card (no class matchups), mana gem top-left, (i) top-right.
// The (i) flips the face to show that gear's combat power; the card button itself only selects.
export function gearCard(c, {selected = false, attrs = '', info = false, popover = ''} = {}) {
  return `<div class="card-cell${selected ? ' is-open' : ''}"><button type="button" class="gear-card${selected ? ' is-selected' : ''}${info ? ' show-info' : ''}" ${attrs} aria-pressed="${selected}" aria-label="${c.name}, 마나 ${c.cost}, 강화 ${c.level}">
    ${manaGem(c)}<span class="card-art">${art(c.id)}</span><span class="card-level">Lv.${c.level}</span><span class="card-name">${c.name}</span>
    ${info ? `<span class="card-power" aria-live="polite"><small>전투력</small><b>${compactGuidePower(c.power)}</b></span>` : ''}</button>
    <button type="button" class="info-btn" data-info="${c.id}" aria-pressed="${info}" aria-label="${c.name} 전투력 보기">i</button>${popover}</div>`;
}
