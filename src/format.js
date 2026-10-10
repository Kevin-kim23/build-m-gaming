import { exact } from './money.js';
const numberFormat = new Intl.NumberFormat('ko-KR');
export const fmt = (value) => numberFormat.format(value);

// Display 만 from 10억, 억 from 1,000억, 조 from 1경, 경 from 1해; calculations keep every gold.
export const MAN_GOLD_THRESHOLD = 1_000_000_000;
export const COMPACT_GOLD_THRESHOLD = 100_000_000_000;
const goldLabels = new Map();
const MAX_CACHED_LABELS = 256;

function goldLabel(value, roundUp) {
  const n = exact(value);
  if(n < BigInt(MAN_GOLD_THRESHOLD)) return fmt(n);
  const unit = n >= 100_000_000_000_000_000_000n ? 10_000_000_000_000_000n
    : n >= 10_000_000_000_000_000n ? 1_000_000_000_000n : n >= BigInt(COMPACT_GOLD_THRESHOLD) ? 100_000_000n : 10_000n;
  const rounded = (n/unit + (roundUp && n%unit ? 1n : 0n))*unit;
  const key = rounded.toString();
  if (goldLabels.has(key)) return goldLabels.get(key);
  let remaining=rounded;
  const parts=[];
  for(const [divisor,suffix] of [[100_000_000_000_000_000_000n,'해'],[10_000_000_000_000_000n,'경'],[1_000_000_000_000n,'조'],[100_000_000n,'억'],[10_000n,'만']]) {
    const part=remaining/divisor;remaining%=divisor;
    if(part)parts.push(fmt(part)+suffix);
  }
  const label=parts.join(' ');
  if (goldLabels.size >= MAX_CACHED_LABELS) goldLabels.delete(goldLabels.keys().next().value);
  goldLabels.set(key, label);
  return label;
}

// Display only: never round the wallet, prices or affordability calculations.
// Wallet, income and tap amounts round down; prices and shortfalls round up (fmtGoldCost),
// so holding the amount shown on a price label always means the item can be bought.
export const fmtGold = (value) => goldLabel(value, false);
export const fmtGoldCost = (value) => goldLabel(value, true);
