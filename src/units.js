// Store real headcounts; derive equivalent strength everywhere from this catalog.
export const UNITS = Object.freeze({
  soldier: Object.freeze({
    id: "soldier",
    name: "일반병",
    field: "soldiers",
    power: 1,
    passive: 1,
    tap: 10,
    unlockRank: "이등병",
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
    unlockRank: "소위",
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
    unlockRank: "소령",
    width: 18,
    height: 27,
  }),
});
export const armyPower = (s) =>
  Object.values(UNITS).reduce((n, u) => n + (s[u.field] ?? 0) * u.power, 0);
export const troopIncome = (s, kind) =>
  Object.values(UNITS).reduce((n, u) => n + (s[u.field] ?? 0) * u[kind], 0);
