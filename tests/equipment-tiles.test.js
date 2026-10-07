import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../src/game.js';
import { equipmentStoreMarkup } from '../src/equipment-panels.js';
import { equipmentDetailMarkup } from '../src/equipment-detail.js';
import { EQUIPMENT, visibleEquipment } from '../src/equipment.js';

const T = 1_800_000_000_000;
const army = (power, sergeants = 40) => ({ ...freshState(T), soldiers: power - sergeants * 10, sergeants });

test('equipment store uses compact two-column tiles with name, picture, price, buy and detail only', () => {
  const s = army(1280), html = equipmentStoreMarkup(s), items = visibleEquipment(s);
  assert.ok(items.length >= 2);
  assert.match(html, /class="equip-grid"/);
  assert.equal((html.match(/<article class="equip-tile"/g) ?? []).length, items.length);
  for (const d of items) {
    const tile = html.match(new RegExp(`<article class="equip-tile" data-equipment="${d.id}".*?</article>`, 's'))[0];
    assert.ok(tile.includes(`<h3>${d.name} `));
    assert.match(tile, /data-gun-preview/);
    assert.match(tile, /data-gear-price/);
    assert.match(tile, new RegExp(`data-buy-equipment="${d.id}"`));
    assert.match(tile, new RegExp(`data-detail-equipment="${d.id}"`));
    assert.match(tile, new RegExp(`data-buy-additional="${d.id}"[^>]*hidden`));
    assert.doesNotMatch(tile, /unit-price-note|장비 추가 구매|빈자리에 자동 배치 · 4칸이 차면 보관 · 사단기/);
  }
});

test('equipment store exposes the full catalog from the beginning', () => {
  assert.equal((equipmentStoreMarkup(army(0, 0)).match(/data-equipment=/g)||[]).length,Object.keys(EQUIPMENT).length);
});

test('equipment detail popup carries role, limits, prices and the management link only when owned', () => {
  const s = army(1280), id = visibleEquipment(s)[0].id;
  const fresh = equipmentDetailMarkup(s, id);
  assert.equal(fresh.title, EQUIPMENT[id].name);
  for (const label of ['해금 계급', '구매 가격', '보유', '현재 최대 강화', '장비 추가 구매'])
    assert.ok(fresh.body.includes(`<dt>${label}</dt>`), label);
  assert.match(fresh.body, /data-gun-preview/);
  assert.match(fresh.body, /구매 후 가능/);
  assert.doesNotMatch(fresh.body, /data-detail-action/);
  const owned = equipmentDetailMarkup({ ...s, equipment: { ...s.equipment, [id]: { level: 4, deployed: true, count: 1 } } }, id);
  assert.match(owned.body, /1문 · \+4강/);
  assert.match(owned.body, new RegExp(`data-detail-action="manage-equipment" data-id="${id}"`));
});
