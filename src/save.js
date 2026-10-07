import { ADVANCED_OFFICERS } from './advanced-officers.js';
import { NEW_RECRUITS } from './specialist-units.js';
import { MAX_GOLD, minMoney, parseGold } from './money.js';
import { armyPower } from './units.js';
import { NEW_OFFICER_GRADES } from './officer-progression.js';
import { legacySchoolLevel } from './schools.js';
import { GENERAL_SWORD } from './personal-equipment.js';
import { AUTO_TOUCH, PERSONAL_EQUIPMENT } from './personal-catalog.js';
import { reconcileAchievements } from './achievements.js';
import { emptyEquipment, EQUIPMENT, deployedEquipment, MAX_DEPLOYED_EQUIPMENT } from './equipment.js';
import { freshState, MAX_SOLDIERS, SAVE_VERSION, CAMPAIGN_STAGE_COUNT } from './state.js';
import { validateSave, requireSave, SaveValidationError } from './save-validation.js';

// Pure parsing: callers decide when to report a diagnostic. Missing saves are not errors.
export function inspectSave(raw, now = Date.now()) {
  if (raw === null || raw === undefined) return { state: null, issue: null };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return { state: null, issue: { code: error instanceof SyntaxError ? 'invalid-json' : 'invalid-record', field: null, version: null } };
  }
  try {
    return { state: migrateSave(parsed, now), issue: null };
  } catch (error) {
    return { state: null, issue: {
      code: error instanceof SaveValidationError ? error.code : 'migration-failed',
      field: error instanceof SaveValidationError ? error.field : null,
      version: Number.isSafeInteger(parsed?.version) ? parsed.version : null,
    } };
  }
}
// Compatibility API for existing callers and version 2–25 migrations.
export function parseSave(raw, now = Date.now()) { return inspectSave(raw, now).state; }

function migrateSave(s, now) {
  const gold = validateSave(s);
  if (s.version === 2) return { ...freshState(now), gold: minMoney(gold, MAX_GOLD), taps: s.taps, sound: s.sound };
  const migrated = {
    version: SAVE_VERSION,
    facilities: s.version >= 25 ? [...s.facilities] : [],
    offlineReward: s.version >= 23 && s.offlineReward ? {
      id:s.offlineReward.id, durationMs:s.offlineReward.durationMs,
      amount:parseGold(s.offlineReward.amount,s.version),
    } : null,
    personalLevels: Object.fromEntries(Object.values(PERSONAL_EQUIPMENT).map(item=>
      [item.id,s.version>=item.introducedVersion?s.personalLevels[item.id]:1])),
    fieldTheme: s.version >= 12 ? s.fieldTheme : 'earth',
    swordActivatedAt: s.version >= 11 ? s.swordActivatedAt : null,
    swordDurationMs: s.version >= 16 ? s.swordDurationMs : GENERAL_SWORD.durationMs,
    autoTouchActivatedAt: s.version >= 16 ? s.autoTouchActivatedAt : null,
    autoTouchDurationMs: s.version>=19?s.autoTouchDurationMs:AUTO_TOUCH.durationMs,
    autoTouchTicks: s.version >= 16 ? s.autoTouchTicks : 0,
    ncoSchoolLevel: s.version >= 9 ? s.ncoSchoolLevel : 0,
    officerSchoolLevel: s.version >= 9 ? s.officerSchoolLevel : 0,
    advancedSchoolLevel: s.version >= 17 ? s.advancedSchoolLevel : 0,
    battleCleared: s.version >= 7 ? s.battleCleared : 0,
    campaignCleared: s.version >= 15 ? s.campaignCleared : 0,
    campaignStars: s.version >= 22 ? [...s.campaignStars] : Array(CAMPAIGN_STAGE_COUNT).fill(0),
    earnedAchievements: s.version >= 8 ? [...s.earnedAchievements] : [],
    gold,
    taps: s.taps,
    soldiers: s.soldiers,
    sergeants: s.version >= 4 ? s.sergeants : 0,
    staffSergeants: s.version >= 6 ? s.staffSergeants : 0,
    masterSergeants: s.version >= 9 ? s.masterSergeants : 0,
    sergeantMajors: s.version >= 9 ? s.sergeantMajors : 0,
    lieutenants: s.version >= 9 ? s.lieutenants : 0,
    ...Object.fromEntries(NEW_RECRUITS.map(unit=>[unit.field,s.version >= 24 ? s[unit.field] : 0])),
    ...Object.fromEntries(NEW_OFFICER_GRADES.map(unit=>[unit.field,s.version >= 14 ? s[unit.field] : 0])),
    ...Object.fromEntries(ADVANCED_OFFICERS.map(unit=>[unit.field,s.version >= 17 ? s[unit.field] : 0])),
    equipment: emptyEquipment(),
    sound: s.sound,
    lastAccrual: s.lastAccrual,
    incomeRemainder: s.incomeRemainder,
    revision: s.revision,
  };
  requireSave(armyPower(migrated) <= MAX_SOLDIERS, 'armyPower');
  if (s.version < 9) migrated.ncoSchoolLevel = legacySchoolLevel(migrated);
  for (const id of Object.keys(EQUIPMENT)) {
    const gun =
      s.version >= 5 && (s.version >= 6 || id === "artillery") && (id !== "helicopter" || s.version >= 10) && (id !== "rocketLauncher" || s.version >= 12) && s.version >= (EQUIPMENT[id].introducedVersion ?? 0)
        ? s.equipment[id]
        : null;
    if (gun)
      migrated.equipment[id] = { level: gun.level, deployed: gun.deployed, count: s.version >= 18 ? gun.count : 1 };
  }
  requireSave(deployedEquipment(migrated).length <= MAX_DEPLOYED_EQUIPMENT, 'equipment.deployed');
  reconcileAchievements(migrated);
  return migrated;
}
