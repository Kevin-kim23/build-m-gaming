import { emptyHomeAutoTap } from './home-auto-tap-rules.js';
import { COMMAND_OFFICERS } from './command-officers.js';
import { emptyPotions } from './potions.js';
import { ADVANCED_OFFICERS } from './advanced-officers.js';
import { NEW_RECRUITS } from './specialist-units.js';
import { NEW_OFFICER_GRADES } from './officer-progression.js';
import { GALACTIC_GRAND_ALLIED_ARMY_SIZE } from './formations.js';
import { GALACTIC_OFFICERS } from './galactic-officers.js';
import { CAMPAIGN_STAGE_COUNT } from './campaign-constants.js';
import { GENERAL_SWORD, AUTO_TOUCH, emptyPersonalLevels } from './personal-catalog.js';
import { emptyEquipment } from './equipment.js';

// Shared defaults and limits have no dependency on game actions or save parsing.
export const SAVE_VERSION = 34;
// 지역마다 지금까지 받은 최고 별(0~3). 두 대륙의 지역 수는 공통 상수와 테스트로 동기화한다.
export { CAMPAIGN_STAGE_COUNT };
export const SAVE_KEY = "budae-kiugi-recruits-v3";
export const LEGACY_KEY = "budae-kiugi-tap-save-v2";

export const MAX_SOLDIERS = GALACTIC_GRAND_ALLIED_ARMY_SIZE * 4;

export function freshState(now = Date.now()) {
  return {
    version: SAVE_VERSION,
    potions: emptyPotions(),
    homeAutoTap: emptyHomeAutoTap(),
    offlineReward: null,
    facilities: [],
    facilityLevels: {},
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
    commandSchoolLevel: 0,
    galacticSchoolLevel: 0,
    battleCleared: 0,
    campaignCleared: 0,
    campaignStars: Array(CAMPAIGN_STAGE_COUNT).fill(0),
    earnedAchievements: [],
    gold: 0,
    taps: 0,
    soldiers: 0,
    sergeants: 0,
    staffSergeants: 0,
    masterSergeants: 0,
    sergeantMajors: 0,
    lieutenants: 0,
    ...Object.fromEntries([...NEW_RECRUITS,...NEW_OFFICER_GRADES,...ADVANCED_OFFICERS,...COMMAND_OFFICERS].map(unit=>[unit.field,0])),
    ...Object.fromEntries(GALACTIC_OFFICERS.map(unit=>[unit.field,0])),
    equipment: emptyEquipment(),
    sound: true,
    sfxVolume: 0.7,
    musicVolume: 0.45,
    lastAccrual: now,
    incomeRemainder: 0,
    revision: 0,
  };
}
