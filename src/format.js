import { exact } from './money.js';
const numberFormat = new Intl.NumberFormat('ko-KR');
export const fmt = (value) => numberFormat.format(value);

// Below 10억 gold shows every digit. From 10억 it shows one unit only (억·조·경·해·자) with one decimal
// while fewer than 100 of that unit (12.3억), whole units above (171억). Calculations keep every gold.
export const MAN_GOLD_THRESHOLD = 1_000_000_000;
export const COMPACT_GOLD_THRESHOLD = 100_000_000_000;
const GOLD_UNITS = [[10n**24n,'자'],[10n**20n,'해'],[10n**16n,'경'],[10n**12n,'조'],[10n**8n,'억']];
const goldLabels = new Map();
const MAX_CACHED_LABELS = 256;
const topUnit = n => GOLD_UNITS.find(([d]) => n >= d);
// The step a label can show: a tenth of the unit under 100 of it, otherwise a whole unit.
export function goldLabelStep(value) {
  const n = exact(value);
  if (n < BigInt(MAN_GOLD_THRESHOLD)) return 1n;
  const [d] = topUnit(n);
  return n / d < 100n ? d / 10n : d;
}

function goldLabel(value, roundUp) {
  const n = exact(value);
  if(n < BigInt(MAN_GOLD_THRESHOLD)) return fmt(n);
  const step = goldLabelStep(n);
  const rounded = (n/step + (roundUp && n%step ? 1n : 0n))*step;
  const key = rounded.toString();
  if (goldLabels.has(key)) return goldLabels.get(key);
  const [d, suffix] = topUnit(rounded), whole = rounded / d, tenth = rounded % d / (d / 10n);
  const label = `${fmt(whole)}${tenth ? '.' + tenth : ''}${suffix}`;
  if (goldLabels.size >= MAX_CACHED_LABELS) goldLabels.delete(goldLabels.keys().next().value);
  goldLabels.set(key, label);
  return label;
}

// Display only: never round the wallet, prices or affordability calculations.
// Wallet, income and tap amounts round down; prices and shortfalls round up (fmtGoldCost),
// so holding the amount shown on a price label always means the item can be bought.
export const fmtGold = (value) => goldLabel(value, false);
export const fmtGoldCost = (value) => goldLabel(value, true);
