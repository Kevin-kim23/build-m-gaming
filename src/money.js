// Exact integer money. Keep the fast Number path while safe, then use BigInt.
// Never turn an already-rounded unsafe Number into a supposedly exact balance.
export const MAX_GOLD = 10_000_000_000_000_000_000n; // 1,000경
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
export const serializeSave = value => JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? item.toString() : item);
export function parseGold(value, version) {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 && value <= MAX_GOLD ? value : null;
  if (version < 17 || typeof value !== 'string' || !/^(0|[1-9]\d{0,19})$/.test(value)) return null;
  const gold = BigInt(value);
  return gold <= MAX_GOLD ? compactMoney(gold) : null;
}
