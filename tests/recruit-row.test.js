import test from 'node:test';
import assert from 'node:assert/strict';
import { RANK_DEFINITIONS, RANKS } from '../src/ranks.js';
import { insignia } from '../src/home-view.js';
import { shopMarkup } from '../src/shop.js';
import { freshState } from '../src/game.js';

test('원사 insignia is the 상사 three chevrons with a small star on top', () => {
  const sergeantMajor = insignia(RANKS.indexOf('원사')), masterSergeant = insignia(RANKS.indexOf('상사'));
  assert.equal((sergeantMajor.match(/<i><\/i>/g) ?? []).length, 3);
  assert.match(sergeantMajor, /^<span class="insignia nco top-star"><b class="insignia-top-star"><\/b>(<i><\/i>){3}<\/span>$/);
  assert.equal((masterSergeant.match(/<i><\/i>/g) ?? []).length, 3);
  assert.doesNotMatch(masterSergeant, /star/);
  assert.equal(RANK_DEFINITIONS[RANKS.indexOf('원사')].marks, 4, 'rank order data stays the same');
});

test('each recruit row shows its rank badge beside the portrait and the owned count beside the name', () => {
  const html = shopMarkup({ ...freshState(0), soldiers: 12 }, 'G', insignia, 'recruit');
  const tile = html.match(/<article class="recruit-tile" data-unit="soldier"[\s\S]*?<\/article>/)[0];
  assert.match(tile, /<div class="tile-visual"><span class="recruit-rank-badge"/);
  assert.match(tile, /<h3>일반병<span class="tile-owned" data-field="owned"><\/span><\/h3>/);
});
