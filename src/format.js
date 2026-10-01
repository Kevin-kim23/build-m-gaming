const numberFormat = new Intl.NumberFormat('ko-KR');
export const fmt = (value) => numberFormat.format(value);

export const COMPACT_GOLD_THRESHOLD = 100_000_000_000;
const EOK = 100_000_000, EOK_PER_JO = 10_000;
const goldLabels = new Map();
const MAX_CACHED_LABELS = 256;

// Display only: never round the wallet, prices or affordability calculations.
// Compact amounts share a cache entry until the displayed 억 bucket changes.
export function fmtGold(value) {
  if (!Number.isSafeInteger(value) || value < 0) return fmt(value);
  const compact = value >= COMPACT_GOLD_THRESHOLD;
  const amount = compact ? Math.floor(value / EOK) : value;
  const key = compact ? `e${amount}` : amount;
  if (goldLabels.has(key)) return goldLabels.get(key);
  const jo = Math.floor(amount / EOK_PER_JO), eok = amount % EOK_PER_JO;
  const label = !compact ? fmt(amount)
    : !jo ? `${fmt(eok)}억`
      : `${fmt(jo)}조${eok ? ` ${fmt(eok)}억` : ''}`;
  if (goldLabels.size >= MAX_CACHED_LABELS) goldLabels.delete(goldLabels.keys().next().value);
  goldLabels.set(key, label);
  return label;
}
