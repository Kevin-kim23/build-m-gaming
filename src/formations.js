import { CONSTELLATION_FORMATIONS } from './constellation-formations.js';
import {exact,compactMoney} from './money.js';
import { UNITS, armyPower } from "./units.js";
import {
  SQUAD_SIZE, PLATOON_SIZE, COMPANY_SIZE, BATTALION_SIZE, REGIMENT_SIZE,
  DIVISION_SIZE, CORPS_SIZE, FIELD_ARMY_SIZE, ARMY_GROUP_SIZE, ALLIED_ARMY_SIZE,
  GRAND_ALLIED_ARMY_SIZE, SUPREME_COMMAND_SIZE, GALACTIC_COMMAND_SIZE, GALACTIC_GROUP_COMMAND_SIZE,
  GALACTIC_CORPS_SIZE, GALACTIC_FIELD_ARMY_SIZE, GALACTIC_ARMY_GROUP_SIZE,
  GALACTIC_ALLIED_ARMY_SIZE, GALACTIC_GRAND_ALLIED_ARMY_SIZE,
} from './formation-sizes.js';
export * from './formation-sizes.js';
// Display grouping only. Real headcounts are preserved in the save.
export const FORMATIONS = Object.freeze([
  ...CONSTELLATION_FORMATIONS.slice().reverse(),
  { id: 'galacticGrandAlliedArmy', name: '은하 대연합군', size: GALACTIC_GRAND_ALLIED_ARMY_SIZE, width: 416, height: 314 },
  { id: 'galacticAlliedArmy', name: '은하 연합군', size: GALACTIC_ALLIED_ARMY_SIZE, width: 384, height: 290 },
  { id: 'galacticArmyGroup', name: '은하 집단군', size: GALACTIC_ARMY_GROUP_SIZE, width: 356, height: 272 },
  { id: 'galacticFieldArmy', name: '은하 야전군', size: GALACTIC_FIELD_ARMY_SIZE, width: 328, height: 252 },
  { id: 'galacticCorps', name: '은하 군단', size: GALACTIC_CORPS_SIZE, width: 300, height: 236 },
  { id: 'galacticGroupCommand', name: '은하 사단', size: GALACTIC_GROUP_COMMAND_SIZE, width: 272, height: 216 },
  { id: 'galacticCommand', name: '은하연대', size: GALACTIC_COMMAND_SIZE, width: 240, height: 190 },
  { id: 'supremeCommand', name: '총군사령부', size: SUPREME_COMMAND_SIZE, width: 216, height: 172 },
  { id: 'grandAlliedArmy', name: '대연합군', size: GRAND_ALLIED_ARMY_SIZE, width: 192, height: 156 },
  { id: 'alliedArmy', name: '연합군', size: ALLIED_ARMY_SIZE, width: 170, height: 143 },
  { id: 'armyGroup', name: '집단군', size: ARMY_GROUP_SIZE, width: 152, height: 128 },
  {
    id: "fieldArmy",
    name: "야전군",
    size: FIELD_ARMY_SIZE,
    width: 134,
    height: 113,
  },
  { id: "corps", name: "군단", size: CORPS_SIZE, width: 120, height: 101 },
  { id: "division", name: "사단", size: DIVISION_SIZE, width: 106, height: 89 },
  { id: "regiment", name: "연대", size: REGIMENT_SIZE, width: 92, height: 77 },
  {
    id: "battalion",
    name: "대대",
    size: BATTALION_SIZE,
    width: 78,
    height: 65,
  },
  { id: "company", name: "중대", size: COMPANY_SIZE, width: 59, height: 51 },
  { id: "platoon", name: "소대", size: PLATOON_SIZE, width: 43, height: 38 },
  { id: "squad", name: "분대", size: SQUAD_SIZE, width: 29, height: 29 },
  { id: "soldier", name: "일반병", size: 1, width: 16, height: 25 },
]);
const INDIVIDUAL_TYPES = Object.freeze(Object.values(UNITS).filter(u=>u.id!=='soldier').sort((a,b)=>a.power>b.power?-1:a.power<b.power?1:0));
export function groupSoldiers(total) {
  if ((typeof total!=='bigint'&&!Number.isSafeInteger(total)) || total < 0)
    throw new RangeError("Soldier count must be a non-negative safe integer.");
  let remaining = exact(total);
  return FORMATIONS.flatMap((type) => {
    const count = Number(remaining / exact(type.size));
    remaining %= exact(type.size);
    return count ? [{ ...type, count }] : [];
  });
}
export function groupArmy(s) {
  if (
    !Object.values(UNITS).map(u => s[u.field] ?? 0).every(
      (n) => Number.isSafeInteger(n) && n >= 0,
    )
  ) {
    throw new RangeError("Unit headcounts must be non-negative safe integers.");
  }
  const groups = groupSoldiers(armyPower(s));
  let remainder = groups.find((g) => g.id === "soldier")?.count ?? 0;
  const individuals=[];
  for(const unit of INDIVIDUAL_TYPES) {
    const count=Math.min(s[unit.field]??0,Number(exact(remainder)/exact(unit.power)));
    if(count) { individuals.push({...unit,size:unit.power,count});remainder=compactMoney(exact(remainder)-BigInt(count)*exact(unit.power)); }
  }
  return [
    ...groups.filter((g) => g.id !== "soldier"),
    ...individuals,
    ...(remainder ? [{ ...UNITS.soldier, size: 1, count: remainder }] : []),
  ];
}
export function describeFormation(total) {
  const groups =
    typeof total === "number"||typeof total === "bigint" ? groupSoldiers(total) : groupArmy(total);
  return groups.length
    ? groups
        .map((g) =>
          UNITS[g.id] ? `${g.name} ${g.count}명` : `${g.name} ${g.count}개`,
        )
        .join(" · ")
    : "아직 모집한 병사가 없습니다";
}
