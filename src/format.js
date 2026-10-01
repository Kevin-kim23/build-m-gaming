const numberFormat = new Intl.NumberFormat('ko-KR');
export const fmt = (value) => numberFormat.format(value);

// 10억 and above drop the digits below 만; 1,000억 and above drop the digits below 억.
export const MAN_GOLD_THRESHOLD = 1_000_000_000;
export const COMPACT_GOLD_THRESHOLD = 100_000_000_000;
const MAN = 10_000, EOK = 100_000_000, MAN_PER_EOK = 10_000, EOK_PER_JO = 10_000;
const goldLabels = new Map();
const MAX_CACHED_LABELS = 256;

function goldLabel(value, roundUp) {
  if (!Number.isSafeInteger(value) || value < 0 || value < MAN_GOLD_THRESHOLD) return fmt(value);
  const eokUnit = value >= COMPACT_GOLD_THRESHOLD;
  const unit = eokUnit ? EOK : MAN;
  const rest = value % unit;
  const amount = (value - rest) / unit + (roundUp && rest ? 1 : 0);
  const key = `${roundUp ? 'c' : 'w'}${eokUnit ? 'e' : 'm'}${amount}`;
  if (goldLabels.has(key)) return goldLabels.get(key);
  // `amount` counts 억 (compact) or 만; split it into 조/억/만 parts.
  const eok = eokUnit ? amount : Math.floor(amount / MAN_PER_EOK);
  const man = eokUnit ? 0 : amount % MAN_PER_EOK;
  const jo = Math.floor(eok / EOK_PER_JO), eokPart = eok % EOK_PER_JO;
  const label = [jo ? `${fmt(jo)}조` : '', eokPart || (!jo && !man) ? `${fmt(eokPart)}억` : '', man ? `${fmt(man)}만` : '']
    .filter(Boolean).join(' ');
  if (goldLabels.size >= MAX_CACHED_LABELS) goldLabels.delete(goldLabels.keys().next().value);
  goldLabels.set(key, label);
  return label;
}

// Display only: never round the wallet, prices or affordability calculations.
// Wallet, income and tap amounts round down; prices and shortfalls round up (fmtGoldCost),
// so holding the amount shown on a price label always means the item can be bought.
export const fmtGold = (value) => goldLabel(value, false);
export const fmtGoldCost = (value) => goldLabel(value, true);
