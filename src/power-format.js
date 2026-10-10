import {fmt} from './format.js';
export function compactGuidePower(value) {
  if ((typeof value !== 'number' && typeof value !== 'bigint') || value < 0 ||
      (typeof value === 'number' && !Number.isSafeInteger(value)))
    throw new RangeError('Guide power must be a non-negative safe integer or bigint.');
  const units=['','만','억','조','경','해'];
  let power=BigInt(value),unit=0;
  while(power>=10_000n&&unit<units.length-1){power/=10_000n;unit++;}
  return unit ? `${power}${units[unit]}` : fmt(power);
}
