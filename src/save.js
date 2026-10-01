import { ADVANCED_OFFICERS } from './advanced-officers.js';
import { MAX_GOLD, minMoney, parseGold } from './money.js';
import { UNITS, armyPower } from './units.js';
import { NEW_OFFICER_GRADES } from './officer-progression.js';
import { legacySchoolLevel } from './schools.js';
import { STAGES } from './battle-balance.js';
import { AUTO_TOUCH, GENERAL_SWORD } from './personal-equipment.js';
import { reconcileAchievements, validAchievementIds } from './achievements.js';
import { emptyEquipment, EQUIPMENT, deployedEquipment, MAX_DEPLOYED_EQUIPMENT, validEquipment } from './equipment.js';
import { FIELD_THEMES } from './field-theme.js';
import { freshState, MAX_SOLDIERS } from './game.js';

export function parseSave(raw, now = Date.now()) {
  try {
    const s = JSON.parse(raw);
    if (!s || typeof s.sound !== "boolean") return null;
    if (s.version === 2) {
      if (
        !Number.isSafeInteger(s.gold) ||
        s.gold < 0 ||
        s.gold !== s.taps ||
        s.rank !== 0
      )
        return null;
      return {
        ...freshState(now),
        gold: minMoney(s.gold, MAX_GOLD),
        taps: s.taps,
        sound: s.sound,
      };
    }
    const integer = (x, max) => Number.isSafeInteger(x) && x >= 0 && x <= max;
    const gold = parseGold(s.gold, s.version);
    if (
      ![3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].includes(s.version) ||
      (s.version >= 17 && (!integer(s.advancedSchoolLevel,5) || (s.advancedSchoolLevel>0 && s.officerSchoolLevel!==5) ||
        !ADVANCED_OFFICERS.every(unit=>integer(s[unit.field],Math.floor(MAX_SOLDIERS/unit.power))))) ||
      (s.version >= 16 && (!(s.autoTouchActivatedAt === null || integer(s.autoTouchActivatedAt, s.lastAccrual)) ||
        ![30000,40000,50000,60000,70000,80000].includes(s.swordDurationMs) ||
        !integer(s.autoTouchTicks, AUTO_TOUCH.durationMs/AUTO_TOUCH.intervalMs) || (s.autoTouchActivatedAt === null && s.autoTouchTicks !== 0))) ||
      (s.version >= 15 && !integer(s.campaignCleared, STAGES.length)) ||
      (s.version >= 14 && !NEW_OFFICER_GRADES.every(unit=>integer(s[unit.field],Math.floor(MAX_SOLDIERS/unit.power)))) ||
      (s.version >= 12 && (typeof s.fieldTheme !== 'string' || !Object.hasOwn(FIELD_THEMES, s.fieldTheme))) ||
      (s.version >= 11 && !(s.swordActivatedAt === null || integer(s.swordActivatedAt, 100_000_000_000_000))) ||
      (s.version >= 9 && (!integer(s.ncoSchoolLevel,5) || !integer(s.officerSchoolLevel,s.version >= 14 ? 5 : 1) ||
        (s.officerSchoolLevel>0 && s.ncoSchoolLevel!==5) ||
        !['masterSergeant','sergeantMajor','lieutenant'].every(id=>integer(s[UNITS[id].field],Math.floor(MAX_SOLDIERS/UNITS[id].power))))) ||
      (s.version >= 7 && !integer(s.battleCleared, 10)) ||
      (s.version >= 8 && !validAchievementIds(s.earnedAchievements)) ||
      gold === null ||
      !integer(s.taps, Number.MAX_SAFE_INTEGER) ||
      !integer(s.soldiers, MAX_SOLDIERS) ||
      (s.version >= 4 && !integer(s.sergeants, MAX_SOLDIERS / 10)) ||
      (s.version >= 6 && !integer(s.staffSergeants, MAX_SOLDIERS / 20)) ||
      (s.version >= 5 && !validEquipment(s.equipment, s.version === 5, s.version >= 10, s.version >= 12, s.version >= 13, s.version >= 16)) ||
      !integer(s.lastAccrual, 100_000_000_000_000) ||
      !integer(s.incomeRemainder, 999) ||
      !integer(s.revision, Number.MAX_SAFE_INTEGER)
    )
      return null;
    const migrated = {
      version: 17,
      fieldTheme: s.version >= 12 ? s.fieldTheme : 'earth',
      swordActivatedAt: s.version >= 11 ? s.swordActivatedAt : null,
      swordDurationMs: s.version >= 16 ? s.swordDurationMs : GENERAL_SWORD.durationMs,
      autoTouchActivatedAt: s.version >= 16 ? s.autoTouchActivatedAt : null,
      autoTouchTicks: s.version >= 16 ? s.autoTouchTicks : 0,
      ncoSchoolLevel: s.version >= 9 ? s.ncoSchoolLevel : 0,
      officerSchoolLevel: s.version >= 9 ? s.officerSchoolLevel : 0,
      advancedSchoolLevel: s.version >= 17 ? s.advancedSchoolLevel : 0,
      battleCleared: s.version >= 7 ? s.battleCleared : 0,
      campaignCleared: s.version >= 15 ? s.campaignCleared : 0,
      earnedAchievements: s.version >= 8 ? [...s.earnedAchievements] : [],
      gold,
      taps: s.taps,
      soldiers: s.soldiers,
      sergeants: s.version >= 4 ? s.sergeants : 0,
      staffSergeants: s.version >= 6 ? s.staffSergeants : 0,
      masterSergeants: s.version >= 9 ? s.masterSergeants : 0,
      sergeantMajors: s.version >= 9 ? s.sergeantMajors : 0,
      lieutenants: s.version >= 9 ? s.lieutenants : 0,
      ...Object.fromEntries(NEW_OFFICER_GRADES.map(unit=>[unit.field,s.version >= 14 ? s[unit.field] : 0])),
      ...Object.fromEntries(ADVANCED_OFFICERS.map(unit=>[unit.field,s.version >= 17 ? s[unit.field] : 0])),
      equipment: emptyEquipment(),
      sound: s.sound,
      lastAccrual: s.lastAccrual,
      incomeRemainder: s.incomeRemainder,
      revision: s.revision,
    };
    if (armyPower(migrated) > MAX_SOLDIERS) return null;
    if (s.version < 9) migrated.ncoSchoolLevel = legacySchoolLevel(migrated);
    for (const id of Object.keys(EQUIPMENT)) {
      const gun =
        s.version >= 5 && (s.version >= 6 || id === "artillery") && (id !== "helicopter" || s.version >= 10) && (id !== "rocketLauncher" || s.version >= 12) && s.version >= (EQUIPMENT[id].introducedVersion ?? 0)
          ? s.equipment[id]
          : null;
      if (gun)
        migrated.equipment[id] = { level: gun.level, deployed: gun.deployed, count: s.version >= 13 ? gun.count : 1 };
    }
    if (deployedEquipment(migrated).length > MAX_DEPLOYED_EQUIPMENT) return null;
    reconcileAchievements(migrated);
    return migrated;
  } catch {
    return null;
  }
}
