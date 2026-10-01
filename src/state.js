import { ADVANCED_OFFICERS } from './advanced-officers.js';
import { NEW_OFFICER_GRADES } from './officer-progression.js';
import { ALLIED_ARMY_SIZE } from './formations.js';
import { GENERAL_SWORD, AUTO_TOUCH, emptyPersonalLevels } from './personal-catalog.js';
import { emptyEquipment } from './equipment.js';

// Shared defaults and limits have no dependency on game actions or save parsing.
export const SAVE_VERSION = 19;
export const SAVE_KEY = "budae-kiugi-recruits-v3";
export const LEGACY_KEY = "budae-kiugi-tap-save-v2";

export const MAX_SOLDIERS = ALLIED_ARMY_SIZE * 4;

export function freshState(now = Date.now()) {
  return {
    version: SAVE_VERSION,
    personalLevels: emptyPersonalLevels(),
    fieldTheme: 'earth',
    swordActivatedAt: null,
    swordDurationMs: GENERAL_SWORD.durationMs,
    autoTouchActivatedAt: null,
    autoTouchDurationMs: AUTO_TOUCH.durationMs,
    autoTouchTicks: 0,
    ncoSchoolLevel: 0,
    officerSchoolLevel: 0,
    advancedSchoolLevel: 0,
    battleCleared: 0,
    campaignCleared: 0,
    earnedAchievements: [],
    gold: 0,
    taps: 0,
    soldiers: 0,
    sergeants: 0,
    staffSergeants: 0,
    masterSergeants: 0,
    sergeantMajors: 0,
    lieutenants: 0,
    ...Object.fromEntries([...NEW_OFFICER_GRADES,...ADVANCED_OFFICERS].map(unit=>[unit.field,0])),
    equipment: emptyEquipment(),
    sound: false,
    lastAccrual: now,
    incomeRemainder: 0,
    revision: 0,
  };
}
