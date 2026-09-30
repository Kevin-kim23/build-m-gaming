import { catalogVisible, rankForArmy, RANKS } from "./ranks.js";

export const COMMAND_BATON = Object.freeze({
  id: "commandBaton",
  name: "지휘봉",
  unlockRank: "중령",
  level: 1,
  recruitAmount: 100,
});

// Automatically granted by rank, including existing saves; no new save field.
export function commandBatonStatus(state) {
  const owned = rankForArmy(state) >= RANKS.indexOf(COMMAND_BATON.unlockRank);
  return {
    visible: catalogVisible(state, COMMAND_BATON.unlockRank),
    owned,
    level: owned ? COMMAND_BATON.level : 0,
  };
}
