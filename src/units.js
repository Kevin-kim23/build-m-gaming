// Store real headcounts; derive equivalent strength everywhere from this catalog.
export const UNITS = Object.freeze({
  soldier: Object.freeze({
    id: "soldier",
    name: "일반병",
    field: "soldiers",
    power: 1,
    passive: 1,
    tap: 10,
    school: null,
    schoolLevel: 0,
    width: 16,
    height: 25,
  }),
  sergeant: Object.freeze({
    id: "sergeant",
    name: "하사",
    field: "sergeants",
    power: 10,
    passive: 50,
    tap: 300,
    school: "nco",
    schoolLevel: 1,
    price: Object.freeze([10_000, 2_000, 200]),
    color: "#233745",
    width: 18,
    height: 27,
  }),
  staffSergeant: Object.freeze({
    id: "staffSergeant",
    name: "중사",
    field: "staffSergeants",
    power: 20,
    passive: 150,
    tap: 1000,
    school: "nco",
    schoolLevel: 2,
    price: Object.freeze([50_000, 8_000, 600]),
    color: "#645446",
    width: 18,
    height: 27,
  }),
  masterSergeant: Object.freeze({
    id: "masterSergeant", name: "상사", field: "masterSergeants",
    power: 40, passive: 1_000, tap: 6_000,
    school: "nco", schoolLevel: 3, price: Object.freeze([300_000, 40_000, 2_500]),
    color: "#534666", width: 18, height: 27,
  }),
  sergeantMajor: Object.freeze({
    id: "sergeantMajor", name: "원사", field: "sergeantMajors",
    power: 80, passive: 4_000, tap: 24_000,
    school: "nco", schoolLevel: 4, price: Object.freeze([1_500_000, 150_000, 8_000]),
    color: "#784b3f", width: 18, height: 27,
  }),
  lieutenant: Object.freeze({
    id: "lieutenant", name: "소위", field: "lieutenants",
    power: 160, passive: 15_000, tap: 100_000,
    school: "officer", schoolLevel: 1, price: Object.freeze([8_000_000, 600_000, 25_000]),
    color: "#426074", width: 18, height: 27,
  }),
});
export const UNIT_LIST = Object.freeze(Object.values(UNITS));
export function unitAccess(state, unit) {
  const level = unit.school === 'officer' ? (state.officerSchoolLevel ?? 0) : (state.ncoSchoolLevel ?? 0);
  return {
    visible: unit.school !== 'officer' || (state.ncoSchoolLevel ?? 0) >= 5 || (state[unit.field] ?? 0) > 0,
    unlocked: !unit.school || level >= unit.schoolLevel,
    requirement: unit.school ? `${unit.school === 'nco' ? '부사관학교' : '사관학교'} Lv.${unit.schoolLevel}` : '기본 모집',
  };
}
export const armyPower = (s) =>
  UNIT_LIST.reduce((n, u) => n + (s[u.field] ?? 0) * u.power, 0);
export const troopIncome = (s, kind) =>
  UNIT_LIST.reduce((n, u) => n + (s[u.field] ?? 0) * u[kind], 0);
