import { BATTALION_SIZE } from "./formations.js";
import { EQUIPMENT, MAX_EQUIPMENT_COUNT } from "./equipment.js";
import { campaignStages } from './campaign.js';
import {RANKS,RANK_REQUIREMENTS} from './ranks.js';

// 가로 전장 전투(0.45): 마나로 장비를 출격시켜 적 기지를 부순다. 수치는 모두 여기 한 곳에 둔다.
export const BATTLE_RULES = Object.freeze({
  stepMs: 50,
  maxFrameMs: 250,
  maxDurationMs: 180_000,
  lanes: 3,                // 세로 레인 수(왼쪽·가운데·오른쪽). 아래 우리 기지에서 위 적 기지로 올라간다
  laneLength: 1000,        // 레인 길이(우리 기지 0 ~ 적 기지 1000)
  manaMax: 100,
  manaStart: 40,
  manaPerSecond: 8,
  healPercent: 0.12,       // 수송기가 주기마다 주변 아군에게 회복하는 최대 체력 비율
  turretRange: 280,        // 기지 포탑 사거리·간격·세기(전력 기준 배수)·요새 배율
  turretIntervalMs: 2000,
  turretPower: 10,
  fortressTurret: 2,
  strikeMultiplier: 2,     // ICBM 일제 타격: 1회 공격력의 배수(적 기지 직격)
});

export const STAGES = campaignStages;

const weaponBase = Object.freeze({
  plasmaTank: {damage:440,intervalMs:2200},
  droneCarrier: {damage:600,intervalMs:3000},
  siegeMech: {damage:960,intervalMs:3800},
  stellarBomber: {damage:1350,intervalMs:3400},
  novaCannon: {damage:3200,intervalMs:10000},
  carrier: { damage:220, intervalMs:3600 },
  flyingFortress: { damage:360, intervalMs:3000 },
  orbitalAssault: { damage:2000, intervalMs:10000 },
  railgunTank: {damage:180,intervalMs:2200},
  icbm: {damage:1200,intervalMs:9000},
  transport: { damage:0, healing:6, intervalMs:5000 },
  fighter: { damage:96, intervalMs:2600 },
  rocketLauncher: { damage: 48, intervalMs: 4200 },
  helicopter: { damage: 16, intervalMs: 1800 },
  artillery: { damage: 11, intervalMs: 2800 },
  tank: { damage: 12, intervalMs: 1900 },
  selfPropelled: { damage: 21, intervalMs: 3500 },
});

// 장비 특성: 분류·체력(전력 비례 기준)·이동 속도·사거리·마나 비용·재출격 대기. kind: unit(전진 전투) / heal(회복) / strike(즉시 타격)
export const UNIT_TRAITS = Object.freeze({
  plasmaTank: {cls:'armor',kind:'unit',hp:850,speed:58,range:260,cost:60,cooldownMs:12000},
  droneCarrier: {cls:'air',kind:'unit',hp:800,speed:54,range:390,cost:65,cooldownMs:15000},
  siegeMech: {cls:'firepower',kind:'unit',hp:1000,speed:36,range:430,cost:72,cooldownMs:18000},
  stellarBomber: {cls:'air',kind:'unit',hp:900,speed:145,range:220,cost:80,cooldownMs:19000},
  novaCannon: {cls:'firepower',kind:'strike',hp:1,speed:0,range:0,cost:100,cooldownMs:32000},
  artillery:      { cls: "firepower", kind: "unit",   hp: 100, speed: 48,  range: 300, cost: 18, cooldownMs: 3500 },
  tank:           { cls: "armor",     kind: "unit",   hp: 260, speed: 64,  range: 120, cost: 24, cooldownMs: 4500 },
  selfPropelled:  { cls: "firepower", kind: "unit",   hp: 150, speed: 45,  range: 340, cost: 30, cooldownMs: 6000 },
  rocketLauncher: { cls: "firepower", kind: "unit",   hp: 120, speed: 42,  range: 380, cost: 38, cooldownMs: 8000 },
  helicopter:     { cls: "air",       kind: "unit",   hp: 110, speed: 120,  range: 150, cost: 34, cooldownMs: 7000 },
  fighter:        { cls: "air",       kind: "unit",   hp: 130, speed: 176, range: 180, cost: 48, cooldownMs: 10000 },
  transport:      { cls: "support",   kind: "heal",   hp: 200, speed: 61,  range: 170, cost: 30, cooldownMs: 10000 },
  railgunTank:    { cls: "armor",     kind: "unit",   hp: 340, speed: 58,  range: 240, cost: 55, cooldownMs: 12000 },
  icbm:           { cls: "firepower", kind: "strike", hp: 1,   speed: 0,   range: 0,   cost: 80, cooldownMs: 22000 },
  carrier:        { cls: "air",       kind: "unit",   hp: 650, speed: 32,  range: 400, cost: 65, cooldownMs: 16000 },
  flyingFortress: { cls: "air",       kind: "unit",   hp: 600, speed: 62,  range: 260, cost: 75, cooldownMs: 18000 },
  orbitalAssault: { cls: "firepower", kind: "strike", hp: 1,   speed: 0,   range: 0,   cost: 95, cooldownMs: 30000 },
});
export const GEAR_CLASS = Object.freeze(Object.fromEntries(Object.entries(UNIT_TRAITS).map(([id, t]) => [id, t.cls])));
export const CLASS_NAMES = Object.freeze({ firepower: "화력", armor: "기갑", air: "공중", support: "지원" });

// 상성 삼각형: 공중 > 기갑 > 화력 > 공중. 유리 ×strong, 불리 ×weak(나라가 뒤로 갈수록 차이가 커진다).
export const CLASS_BEATS = Object.freeze({ air: "armor", armor: "firepower", firepower: "air" });
export const MATCHUP_BY_COUNTRY = Object.freeze([{ strong: 1.3, weak: 0.8 }, { strong: 1.4, weak: 0.7 }, { strong: 1.5, weak: 0.65 }, { strong: 1.6, weak: 0.6 }, {strong:1.65,weak:.58}, {strong:1.7,weak:.56}, {strong:1.75,weak:.54}, {strong:1.8,weak:.52}]);
export const FORTRESS_SHIELD = 0.6; // 수도 요새 기지: 방어 분류 장비의 피해가 40% 줄어듦
export const countryIndex = (stageId) => Math.floor((stageId - 1) / 20);
export function classMatchup(attackerClass, targetClass, stageId) {
  const m = MATCHUP_BY_COUNTRY[countryIndex(stageId)] ?? MATCHUP_BY_COUNTRY[0];
  return CLASS_BEATS[attackerClass] === targetClass ? m.strong : CLASS_BEATS[targetClass] === attackerClass ? m.weak : 1;
}

// 적 부대 유형: 지역 번호 순서로 돌아간다. pool은 적이 차례로 출격시키는 장비(분류가 한쪽으로 치우쳐 상성이 보인다).
export const ENEMY_TYPES = Object.freeze([
  { id: "armored", name: "기갑 부대", main: "armor", counter: "air", pool: ["tank", "tank", "selfPropelled", "tank", "helicopter"] },
  { id: "artilleryNest", name: "포병 진지", main: "firepower", counter: "armor", pool: ["artillery", "rocketLauncher", "artillery", "selfPropelled", "tank"] },
  { id: "airWing", name: "항공 부대", main: "air", counter: "firepower", pool: ["helicopter", "helicopter", "fighter", "helicopter", "artillery"] },
]);
// Early captains meet artillery first. Later pools use only gear available at that rank.
// Cache once: the combat loop never filters the catalog or allocates a new pool each frame.
const enemyTypes=campaignStages.map(stage=>{
  const base=ENEMY_TYPES[(stage.id-1)%ENEMY_TYPES.length],rank=RANKS.indexOf(stage.recommendedRank);
  const galacticReplacement={tank:'plasmaTank',artillery:'siegeMech',selfPropelled:'siegeMech',helicopter:'droneCarrier',fighter:'stellarBomber'};
  const pool=base.pool.map((id,i)=>{
    const newId=stage.id>80?galacticReplacement[id]:null;
    if(newId&&rank>=RANKS.indexOf(EQUIPMENT[newId].unlockRank))return newId;
    return stage.id>=66&&i===2&&base.main==='air'?'flyingFortress':stage.id>=60&&i===2&&base.main==='air'?'carrier':stage.id>=46&&i===1&&base.main==='armor'?'railgunTank':id;
  })
    .filter(id=>rank>=RANKS.indexOf(EQUIPMENT[id].unlockRank));
  if(stage.id<=5)return Object.freeze({id:'outpost',name:'전초 포병',main:'firepower',counter:'armor',intro:true,pool:Object.freeze(['artillery'])});
  const actual=pool.length?pool:['artillery'],main=UNIT_TRAITS[actual[0]].cls;
  const name=main===base.main?base.name:ENEMY_TYPES.find(type=>type.main===main).name;
  return Object.freeze({...base,name,main,counter:Object.keys(CLASS_BEATS).find(key=>CLASS_BEATS[key]===main),pool:Object.freeze(actual)});
});
// Late player weapons are powerful rewards. Enemy versions retain their silhouette/HP,
// but cannot destroy a power-sized HQ in one hit just because their base damage is larger.
export const enemyWeaponModifier=id=>['railgunTank','carrier','flyingFortress','plasmaTank','droneCarrier','siegeMech','stellarBomber'].includes(id)?20/weaponBase[id].damage:1;
export const stageEnemyType = stageId=>enemyTypes[stageId-1];
export const isFortress = (stageId) => stageId % 20 === 0;
// 수도 요새 기지는 이 유형을 잡는 정석 분류(counter)의 피해를 줄인다 → 부대는 정석으로, 기지는 다른 분류로 부수는 전략.
export const fortressShieldClass = (stageId) => isFortress(stageId) ? stageEnemyType(stageId).counter : null;
// 호환: 장비 하나가 이 지역 적 유형에 얼마나 유리한가(준비 화면 표시용). 기지 방어 장갑은 따로 안내한다.
export function matchupMultiplier(stageId, gearId) {
  return classMatchup(GEAR_CLASS[gearId], stageEnemyType(stageId).main, stageId);
}

export function combatScale(totalPower) {
  if (!Number.isFinite(totalPower) || totalPower <= 0)
    throw new RangeError("Invalid battle power");
  return totalPower / BATTALION_SIZE;
}

export function equipmentCombatStats(id, level, totalPower = BATTALION_SIZE, count = 1, playerUpgrades = true) {
  if (!Number.isSafeInteger(count) || count < 1 || count > MAX_EQUIPMENT_COUNT) throw new RangeError("Invalid equipment count");
  const type = EQUIPMENT[id];
  if (!type || !Number.isInteger(level) || level < 0 || level > type.maxLevel)
    throw new RangeError("Invalid battle equipment");
  const base = weaponBase[id] ?? {
    damage: Math.max(5, Math.sqrt(type.passive) / 3),
    intervalMs: 3000,
  };
  const growth = 1 + level*.12 + (playerUpgrades ? Math.max(0,level-10)**2*.02 : 0);
  const scale=playerUpgrades?combatScale(Number(RANK_REQUIREMENTS[RANKS.indexOf(type.unlockRank)])):combatScale(totalPower);
  const copies=playerUpgrades?1:count;
  return {
    growth,
    hp:UNIT_TRAITS[id].hp*growth*copies*scale,
    damage: copies * base.damage * growth * scale,
    ...(base.healing ? { healing:copies*base.healing*growth*scale } : {}),
    intervalMs: Math.max(
      BATTLE_RULES.stepMs,
      Math.round(base.intervalMs / (1 + level * 0.08) / BATTLE_RULES.stepMs) * BATTLE_RULES.stepMs,
    ),
  };
}

// 권장 강화와 적 강화의 성장 차이를 보정한다. 실제 난이도 곡선은 campaign-progression.js에서 관리한다.
export function enemyStack(stageId, enemyLevel) {
  const refLevel=STAGES[stageId-1].recommendedLevel;
  const growth = (level, upgrades) => 1 + level * .12 + (upgrades ? Math.max(0, level - 10) ** 2 * .02 : 0);
  return Math.round(growth(refLevel,true)/growth(enemyLevel,false)*100)/100;
}

// A comparison index, not damage: 20s damage/healing plus one tenth of HP.
export function equipmentCombatPower(id,level){
 const s=equipmentCombatStats(id,level),t=UNIT_TRAITS[id];
 const rate=t.kind==='strike'?s.damage*BATTLE_RULES.strikeMultiplier/(t.cooldownMs/1000):((s.damage||s.healing||0)*1000/s.intervalMs);
 return Math.max(1,Math.round(rate*20+s.hp*.1));
}
