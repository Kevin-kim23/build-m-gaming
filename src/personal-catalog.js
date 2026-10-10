// Future personal gear shares the same award, saved-level and enhancement rules.
export const PERSONAL_MAX_LEVEL = 30;
const item = value => Object.freeze({ level: 1, maxLevel: PERSONAL_MAX_LEVEL, introducedVersion:19, ...value });
export const COMMAND_BATON = item({ id:'commandBaton', name:'지휘봉', icon:'baton', unlockRank:'중령', recruitAmount:100, baseUpgradeCost:50_000_000 });
export const GENERAL_SWORD = item({ id:'generalSword', name:'장군검', icon:'sword', unlockRank:'준장', baseUpgradeCost:500_000_000,
  durationMs:30_000, durationStepMs:10_000, cooldownMs:600_000, tapMultiplier:2 });
export const DIVISION_FLAG = item({ id:'divisionFlag', maxLevel:40, name:'사단기', icon:'flag', unlockRank:'소장', baseUpgradeCost:2_000_000_000 });
export const GENERAL_REVOLVER = item({ id:'generalRevolver', name:'장군 리볼버', icon:'revolver', unlockRank:'중장', baseUpgradeCost:10_000_000_000 });
export const MARSHAL_GLAIVE = item({ id:'marshalGlaive', name:'언월도', icon:'glaive', unlockRank:'준원수', introducedVersion:20,
  baseUpgradeCost:30_000_000_000, passiveBonusPercent:120, passiveBonusStep:20 });
export const ADMIRALS_COMPASS = item({ id:'admiralsCompass', name:'제독의 나침반', icon:'compass', unlockRank:'소원수', introducedVersion:27,
  baseUpgradeCost:100_000_000_000, incomeTarget:'tap', incomeBonusPercent:40, incomeBonusStep:10 });
export const STRATEGIC_TABLET = item({ id:'strategicTablet', name:'전략 지휘패', icon:'tablet', unlockRank:'중원수', introducedVersion:27,
  baseUpgradeCost:300_000_000_000, incomeTarget:'equipment', incomeBonusPercent:30, incomeBonusStep:10 });
export const SUPREME_SEAL = item({ id:'supremeSeal', name:'총사령관 인장', icon:'seal', unlockRank:'대원수', introducedVersion:27,
  baseUpgradeCost:1_000_000_000_000, incomeTarget:'all', incomeBonusPercent:20, incomeBonusStep:5 });
export const personalIncomePercent = (id,level) => PERSONAL_EQUIPMENT[id].incomeBonusPercent+(level-1)*PERSONAL_EQUIPMENT[id].incomeBonusStep;
export const PERSONAL_EQUIPMENT = Object.freeze(Object.fromEntries([COMMAND_BATON,GENERAL_SWORD,DIVISION_FLAG,GENERAL_REVOLVER,MARSHAL_GLAIVE,ADMIRALS_COMPASS,STRATEGIC_TABLET,SUPREME_SEAL].map(item=>[item.id,item])));
export const emptyPersonalLevels = () => Object.fromEntries(Object.keys(PERSONAL_EQUIPMENT).map(id=>[id,1]));
export const AUTO_TOUCH = Object.freeze({ durationMs:60_000, durationStepMs:10_000, cooldownMs:1_800_000, intervalMs:300 });
