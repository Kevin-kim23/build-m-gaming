import test from 'node:test';
import assert from 'node:assert/strict';
import { FACILITIES } from '../src/facility-catalog.js';
import { facilityIcon } from '../src/facility-art.js';

test('each facility grows through twenty distinct cached original drawings', () => {
  for (const facility of FACILITIES) {
    const drawings = Array.from({length:20}, (_, i) => facilityIcon(facility.id, i + 1));
    assert.equal(new Set(drawings).size, 20, facility.id);
    drawings.forEach((svg, i) => {
      assert.equal(svg, facilityIcon(facility.id, i + 1));
      assert.match(svg, /viewBox="0 0 96 72"/);
      assert.doesNotMatch(svg, /href=|<image|<script|<foreignObject|undefined|NaN/);
    });
  }
});

test('facility art clamps invalid levels and rejects unknown facility names', () => {
  for (const level of [undefined, null, NaN, Infinity, -1, 0, '10', {}])
    assert.equal(facilityIcon('futsal', level), facilityIcon('futsal', 1));
  assert.equal(facilityIcon('futsal', 5.8), facilityIcon('futsal', 5));
  assert.equal(facilityIcon('futsal', 300), facilityIcon('futsal', 20));
  assert.throws(() => facilityIcon('__proto__', 1), RangeError);
  assert.throws(() => facilityIcon('<script>', 1), RangeError);
});

test('futsal evolves from an open pitch to a stadium with stands, lights and a roof', () => {
  const first = facilityIcon('futsal', 1);
  assert.doesNotMatch(first, /data-structure="(?:stand|floodlights|canopy|stadium)"/);
  assert.match(facilityIcon('futsal', 5), /data-structure="stand"/);
  assert.match(facilityIcon('futsal', 10), /data-structure="floodlights"/);
  assert.match(facilityIcon('futsal', 15), /data-structure="canopy"/);
  assert.match(facilityIcon('futsal', 20), /data-structure="stadium"/);
});
