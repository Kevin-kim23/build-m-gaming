import { ADVANCED_OFFICERS } from './advanced-officers.js';
import { parseGold } from './money.js';
import { UNITS } from './units.js';
import { NEW_OFFICER_GRADES } from './officer-progression.js';
import { STAGES } from './battle-balance.js';
import { AUTO_TOUCH } from './personal-equipment.js';
import { validAchievementIds } from './achievements.js';
import { validEquipment } from './equipment.js';
import { FIELD_THEMES } from './field-theme.js';
import { MAX_SOLDIERS, SAVE_VERSION } from './state.js';

// Only fixed codes and known field names leave the parser, never stored values or JSON snippets.
export class SaveValidationError extends Error {
  constructor(code, field = null) {
    super(code);
    this.code = code;
    this.field = field;
  }
}
export function requireSave(valid, field) {
  if (!valid) throw new SaveValidationError('invalid-field', field);
}
const integer = (x, max) => Number.isSafeInteger(x) && x >= 0 && x <= max;
export function validateSave(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) throw new SaveValidationError('invalid-record');
  if (!Number.isInteger(s.version) || s.version < 2 || s.version > SAVE_VERSION)
    throw new SaveValidationError('unsupported-version', 'version');
  requireSave(typeof s.sound === 'boolean', 'sound');
  if (s.version === 2) {
    requireSave(integer(s.gold, Number.MAX_SAFE_INTEGER), 'gold');
    requireSave(s.gold === s.taps, 'taps');
    requireSave(s.rank === 0, 'rank');
    return s.gold;
  }
  const gold = parseGold(s.gold, s.version);
  requireSave(gold !== null, 'gold');
  for (const [field, max] of Object.entries({ taps: Number.MAX_SAFE_INTEGER, soldiers: MAX_SOLDIERS,
    lastAccrual: 100_000_000_000_000, incomeRemainder: 999, revision: Number.MAX_SAFE_INTEGER }))
    requireSave(integer(s[field], max), field);
  if (s.version >= 4) requireSave(integer(s.sergeants, MAX_SOLDIERS / 10), 'sergeants');
  if (s.version >= 6) requireSave(integer(s.staffSergeants, MAX_SOLDIERS / 20), 'staffSergeants');
  if (s.version >= 5) requireSave(validEquipment(s.equipment, s.version === 5, s.version >= 10,
    s.version >= 12, s.version >= 13, s.version >= 16), 'equipment');
  if (s.version >= 7) requireSave(integer(s.battleCleared, 10), 'battleCleared');
  if (s.version >= 8) requireSave(validAchievementIds(s.earnedAchievements), 'earnedAchievements');
  if (s.version >= 9) {
    requireSave(integer(s.ncoSchoolLevel, 5), 'ncoSchoolLevel');
    requireSave(integer(s.officerSchoolLevel, s.version >= 14 ? 5 : 1) &&
      (s.officerSchoolLevel === 0 || s.ncoSchoolLevel === 5), 'officerSchoolLevel');
    for (const id of ['masterSergeant', 'sergeantMajor', 'lieutenant']) {
      const unit = UNITS[id];
      requireSave(integer(s[unit.field], Math.floor(MAX_SOLDIERS / unit.power)), unit.field);
    }
  }
  if (s.version >= 11) requireSave(s.swordActivatedAt === null || integer(s.swordActivatedAt, 100_000_000_000_000), 'swordActivatedAt');
  if (s.version >= 12) requireSave(typeof s.fieldTheme === 'string' && Object.hasOwn(FIELD_THEMES, s.fieldTheme), 'fieldTheme');
  if (s.version >= 14) for (const unit of NEW_OFFICER_GRADES)
    requireSave(integer(s[unit.field], Math.floor(MAX_SOLDIERS / unit.power)), unit.field);
  if (s.version >= 15) requireSave(integer(s.campaignCleared, STAGES.length), 'campaignCleared');
  if (s.version >= 16) {
    requireSave(s.autoTouchActivatedAt === null || integer(s.autoTouchActivatedAt, s.lastAccrual), 'autoTouchActivatedAt');
    requireSave([30000, 40000, 50000, 60000, 70000, 80000].includes(s.swordDurationMs), 'swordDurationMs');
    requireSave(integer(s.autoTouchTicks, AUTO_TOUCH.durationMs / AUTO_TOUCH.intervalMs) &&
      (s.autoTouchActivatedAt !== null || s.autoTouchTicks === 0), 'autoTouchTicks');
  }
  if (s.version >= 17) {
    requireSave(integer(s.advancedSchoolLevel, 5) &&
      (s.advancedSchoolLevel === 0 || s.officerSchoolLevel === 5), 'advancedSchoolLevel');
    for (const unit of ADVANCED_OFFICERS)
      requireSave(integer(s[unit.field], Math.floor(MAX_SOLDIERS / unit.power)), unit.field);
  }
  return gold;
}
