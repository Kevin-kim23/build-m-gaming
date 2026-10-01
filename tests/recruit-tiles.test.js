import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, UNITS } from '../src/game.js';
import { shopMarkup } from '../src/shop.js';
import { unitDetailMarkup } from '../src/unit-detail.js';

const state = (power, sergeants = 40) => ({
  ...freshState(1_800_000_000_000), soldiers: power - sergeants * 10, sergeants,
});
const recruit = (s) => shopMarkup(s, '', () => '', 'recruit');
const tile = (html, id) => html.match(new RegExp(`<article class="recruit-tile[^"]*" data-unit="${id}".*?</article>`, 's'))[0];

test('each recruit tile shows only icon, name, abilities, price, 1/100 buttons and a detail button', () => {
  const html = tile(recruit(state(1280)), 'soldier');
  assert.match(html, /data-portrait="soldier"/);
  assert.match(html, /<h3>일반병<\/h3>/);
  assert.match(html, /초당.*\+?1<.*터치.*10</s);
  assert.match(html, /data-field="price"/);
  assert.match(html, /data-buy="soldier"[^>]*>1명</);
  assert.match(html, /data-buy-bulk="soldier"[^>]*>100명</);
  assert.match(html, /data-detail-unit="soldier"/);
  // Long descriptions and notes moved to the detail popup.
  assert.doesNotMatch(html, /모집 시에만 가격 상승|이번 모집 비용|일괄 모집|총비용/);
});

test('tiles use a four-column grid class and the one shared tile template for every unit', () => {
  const html = recruit({ ...state(1280), ncoSchoolLevel: 5 });
  assert.match(html, /class="unit-list recruit-grid"/);
  const tiles = html.match(/<article class="recruit-tile/g) ?? [];
  assert.ok(tiles.length >= 6);
  assert.equal((html.match(/data-detail-unit=/g) ?? []).length, tiles.length);
});

test('locked tiles keep the requirement visible and cannot be bought from the markup alone', () => {
  const html = tile(recruit(freshState(0)), 'sergeant');
  assert.match(html, /🔒 부사관학교 Lv\.1/);
  assert.doesNotMatch(html, /data-buy-bulk/);
});

test('the 100 button is a purchase-free locked placeholder until the baton unlocks it', () => {
  const none = recruit(state(160, 0));
  assert.doesNotMatch(none, /data-buy-bulk|data-bulk-locked|data-bulk-price/);
  const preview = tile(recruit(state(640)), 'soldier');
  assert.match(preview, /<button[^>]*\sdisabled[^>]*data-bulk-locked="soldier"/);
  assert.doesNotMatch(preview, /data-buy-bulk|data-bulk-price/);
  const open = tile(recruit(state(1280)), 'soldier');
  assert.match(open, /data-buy-bulk="soldier"/);
  assert.match(open, /data-bulk-price/);
  // Newly supported officer batches stay visibly locked until paid baton levels 9/10.
  assert.match(tile(recruit({ ...state(1280), ncoSchoolLevel: 5, officerSchoolLevel: 4 }), 'major'), /data-bulk-locked/);
});

test('detail popup lists exact numbers, requirement and both prices', () => {
  const s = state(1280);
  const { title, body } = unitDetailMarkup(s, UNITS.soldier);
  assert.equal(title, '일반병');
  for (const label of ['전력', '초당 수입', '터치 보상', '보유', '모집 조건', '1명 가격', '100명 가격'])
    assert.ok(body.includes(`<dt>${label}</dt>`), label);
  assert.match(body, /data-portrait="soldier"/);
  assert.doesNotMatch(body, /data-detail-action/);
  const sergeant = unitDetailMarkup(freshState(0), UNITS.sergeant);
  assert.match(sergeant.body, /data-detail-action="shop-category" data-category="schools"/);
  assert.match(sergeant.body, /🔒/);
});

test('layout columns: recruit tiles in three columns, equipment rows in one', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../src/shop.css', import.meta.url), 'utf8');
  assert.match(css, /\.recruit-grid \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.equip-grid \{[^}]*grid-template-columns: minmax\(0, 1fr\);/);
});
