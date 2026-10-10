import test from 'node:test';
import assert from 'node:assert/strict';
import { insignia } from '../src/home-view.js';
import { RANK_DEFINITIONS } from '../src/ranks.js';

test('hidden shop, HUD and rank guide badges never share SVG definitions', () => {
  const ids = new Set();
  for (let copy = 0; copy < 3; copy++) {
    for (const [index, rank] of RANK_DEFINITIONS.entries()) {
      if (rank.kind !== 'general') continue;
      const html = insignia(index);
      const ownIds = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
      assert.ok(ownIds.length > 0);
      for (const id of ownIds) {
        assert.ok(!ids.has(id), `Duplicate SVG definition for ${rank.name}: ${id}`);
        ids.add(id);
      }
      for (const [, ref] of html.matchAll(/url\(#([^)]*)\)/g)) {
        assert.ok(ownIds.includes(ref), `${rank.name} references another badge: ${ref}`);
      }
    }
  }
});
