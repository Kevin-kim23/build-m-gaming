import { fmt } from "./format.js";
import {
  SQUAD_SIZE,
  PLATOON_SIZE,
  COMPANY_SIZE,
  REGIMENT_SIZE,
  DIVISION_SIZE,
  CORPS_SIZE,
  FIELD_ARMY_SIZE, ARMY_GROUP_SIZE, ALLIED_ARMY_SIZE,
  GRAND_ALLIED_ARMY_SIZE, SUPREME_COMMAND_SIZE, GALACTIC_COMMAND_SIZE, GALACTIC_GROUP_COMMAND_SIZE,
  GALACTIC_CORPS_SIZE, GALACTIC_FIELD_ARMY_SIZE, GALACTIC_ARMY_GROUP_SIZE,
  GALACTIC_ALLIED_ARMY_SIZE, GALACTIC_GRAND_ALLIED_ARMY_SIZE,
} from "./formations.js";
import { armyPower } from "./units.js";
export const GENERAL_MIN_SOLDIERS = 5_000;

export const GENERAL_MIN_SERGEANTS = 300;

// Approved game progression, independent of which grouped icons are on screen.
export const RANK_DEFINITIONS = Object.freeze([
  {
    name: "이등병",
    required: 0,
    condition: "시작",
    kind: "enlisted",
    marks: 1,
  },
  {
    name: "일병",
    required: 4,
    condition: "병사 4명",
    kind: "enlisted",
    marks: 2,
  },
  {
    name: "상병",
    required: 10,
    condition: "병사 10명",
    kind: "enlisted",
    marks: 3,
  },
  {
    name: "병장",
    required: 15,
    condition: "병사 15명",
    kind: "enlisted",
    marks: 4,
  },
  {
    name: "하사",
    required: SQUAD_SIZE,
    condition: "1개 분대",
    kind: "nco",
    marks: 1,
  },
  {
    name: "중사",
    required: SQUAD_SIZE * 2,
    condition: "2개 분대",
    kind: "nco",
    marks: 2,
  },
  {
    name: "상사",
    required: SQUAD_SIZE * 3,
    condition: "3개 분대",
    kind: "nco",
    marks: 3,
  },
  {
    name: "원사",
    required: SQUAD_SIZE * 4,
    condition: "4개 분대",
    kind: "nco",
    marks: 4,
  },
  {
    name: "준위",
    required: 120,
    condition: "1개 소대 · 2개 분대",
    kind: "warrant",
    marks: 1,
  },
  {
    name: "소위",
    required: PLATOON_SIZE * 2,
    condition: "2개 소대",
    kind: "officer",
    marks: 1,
  },
  {
    name: "중위",
    required: PLATOON_SIZE * 3,
    condition: "3개 소대",
    kind: "officer",
    marks: 2,
  },
  {
    name: "대위",
    required: PLATOON_SIZE * 4,
    condition: "4개 소대",
    kind: "officer",
    marks: 3,
  },
  {
    name: "소령",
    required: COMPANY_SIZE * 2,
    condition: "2개 중대 · 하사 40명",
    kind: "field",
    marks: 1,
  },
  {
    name: "중령",
    required: COMPANY_SIZE * 4,
    condition: "4개 중대",
    kind: "field",
    marks: 2,
  },
  {
    name: "대령",
    required: REGIMENT_SIZE,
    condition: "1개 연대",
    kind: "field",
    marks: 3,
  },
  {
    name: "준장",
    required: REGIMENT_SIZE * 2,
    condition: `2개 연대 · 일반병 ${fmt(GENERAL_MIN_SOLDIERS)}명 · 하사 ${GENERAL_MIN_SERGEANTS}명`,
    kind: "general",
    marks: 1,
  },
  {
    name: "소장",
    required: DIVISION_SIZE,
    condition: "1개 사단",
    kind: "general",
    marks: 2,
  },
  {
    name: "중장",
    required: CORPS_SIZE,
    condition: "1개 군단",
    kind: "general",
    marks: 3,
  },
  {
    name: "대장",
    required: FIELD_ARMY_SIZE,
    condition: "1개 야전군",
    kind: "general",
    marks: 4,
  },
  { name: '준원수', required: ARMY_GROUP_SIZE, condition: '4개 야전군 · 집단군 1개', kind: 'general', marks: 5 },
  { name: '소원수', required: ALLIED_ARMY_SIZE, condition: '4개 집단군 · 연합군 1개', kind: 'general', marks: 6 },
  { name: '중원수', required: GRAND_ALLIED_ARMY_SIZE, condition: '4개 연합군 · 대연합군 1개', kind: 'general', marks: 7 },
  { name: '대원수', required: SUPREME_COMMAND_SIZE, condition: '4개 대연합군 · 총군사령부 1개', kind: 'general', marks: 8 },
  { name: '특전원수', required: GALACTIC_COMMAND_SIZE, condition: '4개 총군사령부 · 은하연대 1개', kind: 'general', marks: 9 },
  { name: '부사령관', required: GALACTIC_GROUP_COMMAND_SIZE, condition: '4개 은하연대 · 은하 사단 1개', kind: 'general', marks: 10 },
  { name: '은하 준장', required: GALACTIC_CORPS_SIZE, condition: '8개 은하 사단 · 은하 군단 1개', kind: 'general', marks: 11 },
  { name: '은하 소장', required: GALACTIC_FIELD_ARMY_SIZE, condition: '8개 은하 군단 · 은하 야전군 1개', kind: 'general', marks: 12 },
  { name: '은하 중장', required: GALACTIC_ARMY_GROUP_SIZE, condition: '8개 은하 야전군 · 은하 집단군 1개', kind: 'general', marks: 13 },
  { name: '은하 대장', required: GALACTIC_ALLIED_ARMY_SIZE, condition: '8개 은하 집단군 · 은하 연합군 1개', kind: 'general', marks: 14 },
  { name: '은하 원수', required: GALACTIC_GRAND_ALLIED_ARMY_SIZE, condition: '8개 은하 연합군 · 은하 대연합군 1개', kind: 'general', marks: 15 },
]);
export const RANKS = RANK_DEFINITIONS.map((r) => r.name);
export const RANK_REQUIREMENTS = RANK_DEFINITIONS.map((r) => r.required);
export const LAST_RANK = RANK_DEFINITIONS.length - 1;
export function rankFor(count) {
  for (let i = LAST_RANK; i > 0; i--)
    if (count >= RANK_DEFINITIONS[i].required) return i;
  return 0;
}
export const MAJOR_RANK = RANKS.indexOf("소령");
export const GENERAL_RANK = RANKS.indexOf("준장");
export function rankForArmy(s) {
  const byPower = rankFor(armyPower(s));
  return Math.min(byPower,
    (s.sergeants ?? 0) < 40 ? MAJOR_RANK - 1 : LAST_RANK,
    ((s.soldiers ?? 0) < GENERAL_MIN_SOLDIERS || (s.sergeants ?? 0) < GENERAL_MIN_SERGEANTS) ? GENERAL_RANK - 1 : LAST_RANK);
}
export function catalogVisible(s, unlockRank) {
  return rankForArmy(s) >= RANKS.indexOf(unlockRank) - 1;
}
export function promotionProgress(s) {
  const current = rankForArmy(s),
    power = armyPower(s),
    next = RANK_DEFINITIONS[current + 1];
  if (!next)
    return { text: "총 전력 " + fmt(power), ratio: 1 };
  const gated = current + 1 === MAJOR_RANK;
  const generalGate = current + 1 === GENERAL_RANK;
  return {
    text:
      "전력 " +
      fmt(power) +
      " / " +
      fmt(next.required) +
      (gated ? " · 하사 " + (s.sergeants ?? 0) + " / 40명" : "") +
      (generalGate ? ` · 일반병 ${fmt(s.soldiers ?? 0)} / ${fmt(GENERAL_MIN_SOLDIERS)}명 · 하사 ${fmt(s.sergeants ?? 0)} / ${GENERAL_MIN_SERGEANTS}명` : ""),
    ratio: Math.min(
      1,
      power / next.required,
      gated ? (s.sergeants ?? 0) / 40 : 1,
      generalGate ? (s.soldiers ?? 0) / GENERAL_MIN_SOLDIERS : 1,
      generalGate ? (s.sergeants ?? 0) / GENERAL_MIN_SERGEANTS : 1,
    ),
  };
}
