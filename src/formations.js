import { UNITS, armyPower } from "./units.js";
// Display grouping only. Real headcounts are preserved in the save.
export const SQUAD_SIZE = 20;
export const PLATOON_SIZE = SQUAD_SIZE * 4;
export const COMPANY_SIZE = PLATOON_SIZE * 4;
export const BATTALION_SIZE = COMPANY_SIZE * 4;
export const REGIMENT_SIZE = BATTALION_SIZE * 4;
export const DIVISION_SIZE = REGIMENT_SIZE * 4;
export const CORPS_SIZE = DIVISION_SIZE * 4;
export const FIELD_ARMY_SIZE = CORPS_SIZE * 4;
export const ARMY_GROUP_SIZE = FIELD_ARMY_SIZE * 4;
export const ALLIED_ARMY_SIZE = ARMY_GROUP_SIZE * 4;
export const FORMATIONS = Object.freeze([
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
export function groupSoldiers(total) {
  if (!Number.isSafeInteger(total) || total < 0)
    throw new RangeError("Soldier count must be a non-negative safe integer.");
  let remaining = total;
  return FORMATIONS.flatMap((type) => {
    const count = Math.floor(remaining / type.size);
    remaining %= type.size;
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
  const remainder = groups.find((g) => g.id === "soldier")?.count ?? 0;
  const sergeants = Math.min(
    s.sergeants ?? 0,
    Math.floor(remainder / UNITS.sergeant.power),
  );
  const soldiers = remainder - sergeants * UNITS.sergeant.power;
  return [
    ...groups.filter((g) => g.id !== "soldier"),
    ...(sergeants
      ? [{ ...UNITS.sergeant, size: UNITS.sergeant.power, count: sergeants }]
      : []),
    ...(soldiers ? [{ ...UNITS.soldier, size: 1, count: soldiers }] : []),
  ];
}
export function describeFormation(total) {
  const groups =
    typeof total === "number" ? groupSoldiers(total) : groupArmy(total);
  return groups.length
    ? groups
        .map((g) =>
          UNITS[g.id] ? `${g.name} ${g.count}명` : `${g.name} ${g.count}개`,
        )
        .join(" · ")
    : "아직 모집한 병사가 없습니다";
}
