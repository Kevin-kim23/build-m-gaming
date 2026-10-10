// Exact integer money. Keep the fast Number path while safe, then use BigInt.
// Never turn an already-rounded unsafe Number into a supposedly exact balance.
export const LEGACY_MAX_GOLD = 10_000_000_000_000_000_000n; // v17–33: 1,000경
export const MAX_GOLD = 100_000_000_000_000_000_000_000n; // v34+: 1,000해
const SAFE = BigInt(Number.MAX_SAFE_INTEGER);
export function exact(value) {
  if (typeof value === 'bigint') return value;
  if (!Number.isSafeInteger(value)) throw new RangeError('Money must be an exact integer');
  return BigInt(value);
}
export const compactMoney = value => value <= SAFE && value >= -SAFE ? Number(value) : value;
export function addMoney(a, b) {
  if (typeof a === 'number' && typeof b === 'number' && Number.isSafeInteger(a + b)) return a + b;
  return compactMoney(exact(a) + exact(b));
}
export function subtractMoney(a, b) {
  if (typeof a === 'number' && typeof b === 'number' && Number.isSafeInteger(a - b)) return a - b;
  return compactMoney(exact(a) - exact(b));
}
export function multiplyMoney(a, b) {
  if (typeof a === 'number' && typeof b === 'number' && Number.isSafeInteger(a * b)) return a * b;
  return compactMoney(exact(a) * exact(b));
}
export const minMoney = (a, b) => a <= b ? a : b;
// Apply positive rational bonuses without floating-point multiplication errors.
export function scaleMoney(value,numerator,denominator) {
  if(!Number.isSafeInteger(numerator)||numerator<0||!Number.isSafeInteger(denominator)||denominator<=0||value<0)
    throw new RangeError('Invalid money ratio');
  const product=multiplyMoney(value,numerator);
  return typeof product==='bigint'?compactMoney(product/BigInt(denominator)):Math.floor(product/denominator);
}
export const serializeSave = value => JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? item.toString() : item);
export function parseGold(value, version) {
  const cap = version < 34 ? LEGACY_MAX_GOLD : MAX_GOLD;
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 && value <= cap ? value : null;
  if (version < 17 || typeof value !== 'string' || !/^(0|[1-9]\d{0,23})$/.test(value)) return null;
  const gold = BigInt(value);
  return gold <= cap ? compactMoney(gold) : null;
}
