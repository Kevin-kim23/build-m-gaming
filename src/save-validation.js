import { COMMAND_OFFICERS } from './command-officers.js';
import { validFacilities, validFacilityLevels } from './facility-catalog.js';
import { ADVANCED_OFFICERS } from './advanced-officers.js';
import { NEW_RECRUITS } from './specialist-units.js';
import { parseGold } from './money.js';
import { UNITS } from './units.js';
import { NEW_OFFICER_GRADES } from './officer-progression.js';
import { STAGES } from './battle-balance.js';
import { AUTO_TOUCH } from './personal-equipment.js';
import { PERSONAL_EQUIPMENT, GENERAL_SWORD, GENERAL_REVOLVER } from './personal-catalog.js';
import { validAchievementIds } from './achievements.js';
import { validEquipment } from './equipment.js';
import { FIELD_THEMES } from './field-theme.js';
import { MAX_SOLDIERS, SAVE_VERSION, CAMPAIGN_STAGE_COUNT } from './state.js';
import { MAX_OFFLINE_MS, OFFLINE_POPUP_MS } from './offline-rules.js';

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
  if (s.version >= 29) for (const key of ['sfxVolume', 'musicVolume'])
    requireSave(typeof s[key] === 'number' && Number.isFinite(s[key]) && s[key] >= 0 && s[key] <= 1, key);
  if (s.version === 2) {
    requireSave(integer(s.gold, Number.MAX_SAFE_INTEGER), 'gold');
    requireSave(s.gold === s.taps, 'taps');
    requireSave(s.rank === 0, 'rank');
    return s.gold;
  }
  if (s.version >= 25) requireSave(validFacilities(s.facilities), 'facilities');
  if (s.version >= 26) requireSave(validFacilityLevels(s.facilityLevels,s.facilities), 'facilityLevels');
  const gold = parseGold(s.gold, s.version);
  requireSave(gold !== null, 'gold');
  for (const [field, max] of Object.entries({ taps: Number.MAX_SAFE_INTEGER, soldiers: MAX_SOLDIERS,
    lastAccrual: 100_000_000_000_000, incomeRemainder: 999, revision: Number.MAX_SAFE_INTEGER }))
    requireSave(integer(s[field], max), field);
  if (s.version >= 23) {
    const reward = s.offlineReward;
    requireSave(reward === null || (reward && typeof reward === 'object' && !Array.isArray(reward) &&
      integer(reward.id, s.lastAccrual) && integer(reward.durationMs, MAX_OFFLINE_MS) &&
      reward.durationMs >= OFFLINE_POPUP_MS && parseGold(reward.amount, s.version) !== null &&
      parseGold(reward.amount, s.version) > 0), 'offlineReward');
  }
  if (s.version >= 4) requireSave(integer(s.sergeants, MAX_SOLDIERS / 10), 'sergeants');
  if (s.version >= 24) for (const unit of NEW_RECRUITS)
    requireSave(integer(s[unit.field], Math.floor(MAX_SOLDIERS/unit.power)), unit.field);
  if (s.version >= 6) requireSave(integer(s.staffSergeants, MAX_SOLDIERS / 20), 'staffSergeants');
  if (s.version >= 5) requireSave(validEquipment(s.equipment, s.version === 5, s.version >= 10,
    s.version >= 12, s.version >= 13, s.version >= 16, s.version), 'equipment');
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
  // 별 기록(형식22~): 길이 80, 각 0~3, 아직 점령하지 않은 지역은 0
  if (s.version >= 22) requireSave(Array.isArray(s.campaignStars) && s.campaignStars.length === CAMPAIGN_STAGE_COUNT &&
    s.campaignStars.every((stars, index) => integer(stars, 3) && (stars === 0 || index < s.campaignCleared)), 'campaignStars');
  if (s.version >= 16) {
    requireSave(s.autoTouchActivatedAt === null || integer(s.autoTouchActivatedAt, s.lastAccrual), 'autoTouchActivatedAt');
    const personalMax=s.version<30?10:GENERAL_SWORD.maxLevel;
    const swordMax=s.version>=19?GENERAL_SWORD.durationMs+(personalMax-1)*GENERAL_SWORD.durationStepMs:80000;
    requireSave(integer(s.swordDurationMs,swordMax)&&s.swordDurationMs>=GENERAL_SWORD.durationMs&&
      (s.swordDurationMs-GENERAL_SWORD.durationMs)%GENERAL_SWORD.durationStepMs===0,'swordDurationMs');
    const autoDuration=s.version>=19?s.autoTouchDurationMs:AUTO_TOUCH.durationMs;
    requireSave(integer(autoDuration,AUTO_TOUCH.durationMs+((s.version<30?10:GENERAL_REVOLVER.maxLevel)-1)*AUTO_TOUCH.durationStepMs)&&
      autoDuration>=AUTO_TOUCH.durationMs&&(autoDuration-AUTO_TOUCH.durationMs)%AUTO_TOUCH.durationStepMs===0,'autoTouchDurationMs');
    requireSave(integer(s.autoTouchTicks,Math.floor(autoDuration/AUTO_TOUCH.intervalMs)) &&
      (s.autoTouchActivatedAt !== null || s.autoTouchTicks === 0), 'autoTouchTicks');
  }
  if (s.version >= 17) {
    requireSave(integer(s.advancedSchoolLevel, 5) &&
      (s.advancedSchoolLevel === 0 || s.officerSchoolLevel === 5), 'advancedSchoolLevel');
    for (const unit of ADVANCED_OFFICERS)
      requireSave(integer(s[unit.field], Math.floor(MAX_SOLDIERS / unit.power)), unit.field);
  }
  if (s.version >= 31) {
    requireSave(integer(s.commandSchoolLevel, COMMAND_OFFICERS.length) &&
      (s.commandSchoolLevel === 0 || s.advancedSchoolLevel === 5), 'commandSchoolLevel');
    for (const unit of COMMAND_OFFICERS)
      requireSave(integer(s[unit.field], Math.floor(MAX_SOLDIERS / unit.power)), unit.field);
  }
  if(s.version>=19){
    requireSave(s.personalLevels&&typeof s.personalLevels==='object'&&!Array.isArray(s.personalLevels),'personalLevels');
    for(const item of Object.values(PERSONAL_EQUIPMENT).filter(item=>item.introducedVersion<=s.version))
      requireSave(integer(s.personalLevels[item.id],s.version<30?10:item.maxLevel)&&s.personalLevels[item.id]>=1,`personalLevels.${item.id}`);
  }
  return gold;
}
