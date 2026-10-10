import { FORMATIONS } from "./formations.js";
import { armyPower } from "./units.js";
import { COUNTRIES } from "./campaign.js";

export const FORMATION_ACHIEVEMENTS = Object.freeze(
  FORMATIONS.filter(f => f.id !== "soldier" && !f.id.startsWith("constellation")).slice().reverse().map((formation, tier) => Object.freeze({
    id: formation.id,
    title: {fieldArmy:'야전군사령관',armyGroup:'집단군 사령관',alliedArmy:'연합군 사령관',grandAlliedArmy:'대연합군 사령관',supremeCommand:'총군사령관',galacticCommand:'은하 연대장',galacticGroupCommand:'은하 사단장',galacticCorps:'은하 군단장',galacticFieldArmy:'은하 야전군사령관',galacticArmyGroup:'은하 집단군 사령관',galacticAlliedArmy:'은하 연합군 사령관',galacticGrandAlliedArmy:'은하 대연합군 사령관'}[formation.id] ?? `${formation.name}장`,
    formationName: formation.name,
    category: 'formation',
    required: formation.size,
    tier,
  })),
);
export const BATTLE_ACHIEVEMENTS = Object.freeze([
  { id: 'firstVictory', title: '첫 승전', required: 1, description: '첫 지역 점령' },
  { id: 'vanguard', title: '선봉장', required: 5, description: '서로 다른 지역 5개 점령' },
  { id: 'pathfinder', title: '진격의 지휘관', required: 10, description: '서로 다른 지역 10개 점령' },
  ...COUNTRIES.map(country => ({ id: `conquer-${country.id}`, title: `${country.name.split(' ')[0]} 정복자`,
    required: country.lastStage, description: `${country.name} 20개 지역과 수도 점령` })),
].map((award, tier) => Object.freeze({ ...award, category: 'battle', tier })));
export const ACHIEVEMENTS = Object.freeze([...FORMATION_ACHIEVEMENTS, ...BATTLE_ACHIEVEMENTS]);
const knownIds = new Set(ACHIEVEMENTS.map(a => a.id));
const measuredProgress = (state, achievement) => achievement.category === 'battle' ? (state.campaignCleared ?? 0) : armyPower(state);

export function validAchievementIds(value) {
  if (!Array.isArray(value) || value.length > ACHIEVEMENTS.length) return false;
  const seen = new Set();
  for (const id of value) {
    if (!knownIds.has(id) || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}

// Only successful recruitment, victory transactions and save loading grant awards.
// Replacing the array on a grant keeps cached shelf views and prior snapshots safe.
export function reconcileAchievements(state) {
  const earned = state.earnedAchievements === undefined ? [] : state.earnedAchievements;
  if (!validAchievementIds(earned)) throw new RangeError("Invalid achievement records");
  const newlyEarned = ACHIEVEMENTS
    .filter(a => measuredProgress(state, a) >= a.required && !earned.includes(a.id))
    .map(a => a.id);
  if (newlyEarned.length || state.earnedAchievements === undefined)
    state.earnedAchievements = [...earned, ...newlyEarned];
  return newlyEarned;
}

export function achievementProgress(state, id) {
  const achievement = ACHIEVEMENTS.find(a => a.id === id);
  if (!achievement) throw new RangeError("Unknown achievement");
  const earned = state.earnedAchievements?.includes(id) ?? false;
  const current = Number(measuredProgress(state,achievement)<achievement.required?measuredProgress(state,achievement):achievement.required);
  return {
    earned,
    current,
    required: achievement.required,
    ratio: earned ? 1 : current / Number(achievement.required),
  };
}
