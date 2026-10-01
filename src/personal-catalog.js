// Future personal gear shares the same award, saved-level and enhancement rules.
export const PERSONAL_MAX_LEVEL = 10;
const item = value => Object.freeze({ level: 1, maxLevel: PERSONAL_MAX_LEVEL, ...value });
export const COMMAND_BATON = item({ id:'commandBaton', name:'지휘봉', icon:'baton', unlockRank:'중령', recruitAmount:100, baseUpgradeCost:50_000_000 });
export const GENERAL_SWORD = item({ id:'generalSword', name:'장군검', icon:'sword', unlockRank:'준장', baseUpgradeCost:500_000_000,
  durationMs:30_000, durationStepMs:10_000, cooldownMs:600_000, tapMultiplier:2 });
export const DIVISION_FLAG = item({ id:'divisionFlag', name:'사단기', icon:'flag', unlockRank:'소장', baseUpgradeCost:2_000_000_000 });
export const GENERAL_REVOLVER = item({ id:'generalRevolver', name:'장군 리볼버', icon:'revolver', unlockRank:'중장', baseUpgradeCost:10_000_000_000 });
export const PERSONAL_EQUIPMENT = Object.freeze(Object.fromEntries([COMMAND_BATON,GENERAL_SWORD,DIVISION_FLAG,GENERAL_REVOLVER].map(item=>[item.id,item])));
export const emptyPersonalLevels = () => Object.fromEntries(Object.keys(PERSONAL_EQUIPMENT).map(id=>[id,1]));
export const AUTO_TOUCH = Object.freeze({ durationMs:60_000, durationStepMs:10_000, cooldownMs:1_800_000, intervalMs:300 });
