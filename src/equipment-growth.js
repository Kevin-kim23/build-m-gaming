import { MILITARY_MAX_LEVEL } from './equipment-limits.js';
import { compactMoney, MAX_GOLD } from './money.js';

// Shared retrofit rewards. Levels 0–10 keep their original price and performance.
// Late jumps follow the campaign's equipment tiers (22/24/26/28), so level 21
// does not receive the galactic tier before that tier's recommended enhancement.
// [level, extra passive gold, minimum combat value per mana]
const anchors = Object.freeze([
  [10, 0n, 0], [11, 2_000n, 5.6], [12, 12_000n, 5_600],
  [13, 66_000n, 10_500], [14, 364_000n, 21_000], [15, 2_000_000n, 140_000],
  [16, 6_930_000n, 210_000], [17, 24_000_000n, 280_000],
  [18, 83_250_000n, 350_000], [19, 288_500_000n, 560_000],
  [20, 1_000_000_000n, 700_000], [21, 1_200_000_000n, 840_000],
  [22, 300_000_000_000n, 3_500_000_000], [23, 350_000_000_000n, 4_200_000_000],
  [24, 1_400_000_000_000n, 31_500_000_000], [25, 2_000_000_000_000n, 35_000_000_000],
  [26, 7_000_000_000_000n, 350_000_000_000], [27, 9_000_000_000_000n, 420_000_000_000],
  [28, 50_000_000_000_000n, 5_600_000_000_000],
  [29, 60_000_000_000_000n, 6_300_000_000_000],
  [30, 200_000_000_000_000n, 7_000_000_000_000],
  [40, 360_000_000_000_000n, 17_500_000_000_000],
  [50, 550_000_000_000_000n, 35_000_000_000_000],
  // 0.78.0 Lv.51–70: steady income, and about twice the Lv.50 combat value at Lv.70.
  [60, 800_000_000_000_000n, 52_000_000_000_000],
  [70, 1_100_000_000_000_000n, 70_000_000_000_000],
].map(Object.freeze));

const empty = Object.freeze({passive:0, tap:0, combatPerMana:0, upgradeCost:0});
const rows = Array(MILITARY_MAX_LEVEL + 1).fill(empty);
let previousIncome = 0n, previousCost = 0n;
for (let level = 11; level <= MILITARY_MAX_LEVEL; level++) {
  const index = anchors.findLastIndex(point => point[0] <= level);
  const from = anchors[index], to = anchors[index + 1] ?? from;
  const span = Math.max(1, to[0] - from[0]), offset = level - from[0];
  const passive = from[1] + (to[1] - from[1]) * BigInt(offset) / BigInt(span);
  const combatPerMana = from[2] + Math.floor((to[2] - from[2]) * offset / span);
  // Price the permanent extra income before personal/facility/conquest boosts:
  // 72 hours at +11, 144 at +20, 288 at +30. All seventeen refits can stack.
  // A rising minimum avoids a cheaper next step after a tier transition.
  const seconds = level <= 20 ? 21_600 + (level - 11) * 2_400 : Math.min(86_400, 43_200 + (level - 20) * 4_320);
  const incomeCost = (passive - previousIncome) * BigInt(seconds) * 12n;
  const risingCost = (previousCost * 108n + 99n) / 100n;
  const cost = ((incomeCost > risingCost ? incomeCost : risingCost) + 9_999n) / 10_000n * 10_000n;
  if (cost > MAX_GOLD) throw new RangeError('Equipment growth price exceeds wallet cap');
  rows[level] = Object.freeze({passive:compactMoney(passive),tap:compactMoney(passive * 6n),combatPerMana,upgradeCost:compactMoney(cost)});
  previousIncome = passive; previousCost = cost;
}
Object.freeze(rows);

// Computed once, reused by income, purchase quotes and combat. No save fields.
export function equipmentGrowth(level) {
  if (!Number.isInteger(level) || level < 0 || level > MILITARY_MAX_LEVEL)
    throw new RangeError('Invalid equipment growth level');
  return rows[level];
}
