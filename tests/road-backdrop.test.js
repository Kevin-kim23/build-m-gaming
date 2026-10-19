import test from 'node:test';
import assert from 'node:assert/strict';
import { ROAD_ART, TILE_H, roadBackdropUrl } from '../src/road-backdrop.js';
import { campaignMarkup } from '../src/campaign-map.js';
import { freshState } from '../src/game.js';

test('each continent gets its own painted road background, chosen by the owner (A1 topo, B2 orbit, C1 fissure)', () => {
  assert.deepEqual({ ...ROAD_ART }, { earth: 'topo', space: 'orbit', abyss: 'fissure' });
  for (const [id, theme] of [['astera', 'earth'], ['aetherion', 'space'], ['erebus', 'abyss']]) {
    const html = campaignMarkup({ ...freshState(0), campaignCleared: 200 }, null, null, id);
    assert.match(html, new RegExp(`class="road-backdrop" data-road-theme="${theme}"`));
    assert.doesNotMatch(html, /<symbol|road-tile|country-label/, 'no country map art or names on the road');
  }
});

test('without a drawing surface the road still renders (no background, no error)', () => {
  assert.equal(roadBackdropUrl('earth', {}), '');
  assert.ok(TILE_H % 64 === 0, 'tile height matches the map grid so tiles repeat cleanly');
});
