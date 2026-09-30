import { FORMATIONS } from "./formations.js";
import { armyPower } from "./units.js";

export const ACHIEVEMENTS = Object.freeze(
  FORMATIONS.filter(f => f.id !== "soldier").slice().reverse().map((formation, tier) => Object.freeze({
    id: formation.id,
    title: formation.id === "fieldArmy" ? "야전군사령관" : `${formation.name}장`,
    formationName: formation.name,
    required: formation.size,
    tier,
  })),
);
const knownIds = new Set(ACHIEVEMENTS.map(a => a.id));

export function validAchievementIds(value) {
  if (!Array.isArray(value) || value.length > ACHIEVEMENTS.length) return false;
  const seen = new Set();
  for (const id of value) {
    if (!knownIds.has(id) || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}

// Only successful recruitment and save loading reconcile awards, never UI ticks.
// Replacing the array on a grant keeps cached shelf views and prior snapshots safe.
export function reconcileAchievements(state) {
  const earned = state.earnedAchievements === undefined ? [] : state.earnedAchievements;
  if (!validAchievementIds(earned)) throw new RangeError("Invalid achievement records");
  const power = armyPower(state);
  const newlyEarned = ACHIEVEMENTS
    .filter(a => power >= a.required && !earned.includes(a.id))
    .map(a => a.id);
  if (newlyEarned.length || state.earnedAchievements === undefined)
    state.earnedAchievements = [...earned, ...newlyEarned];
  return newlyEarned;
}

export function achievementProgress(state, id) {
  const achievement = ACHIEVEMENTS.find(a => a.id === id);
  if (!achievement) throw new RangeError("Unknown achievement");
  const earned = state.earnedAchievements?.includes(id) ?? false;
  const current = Math.min(armyPower(state), achievement.required);
  return {
    earned,
    current,
    required: achievement.required,
    ratio: earned ? 1 : current / achievement.required,
  };
}
