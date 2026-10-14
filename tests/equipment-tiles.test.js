import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../src/game.js';
import { equipmentStoreMarkup } from '../src/equipment-panels.js';
import { equipmentDetailMarkup } from '../src/equipment-detail.js';
import { EQUIPMENT, visibleEquipment } from '../src/equipment.js';

const T = 1_800_000_000_000;
const army = (power, sergeants = 40) => ({ ...freshState(T), soldiers: power - sergeants * 10, sergeants });

test('equipment list gives every visible item a direct purchase/upgrade row without repeat purchase controls', () => {
  const s = army(1280), html = equipmentStoreMarkup(s), items = visibleEquipment(s);
  assert.ok(items.length >= 2);
  assert.match(html, /class="equipment-list"/);
  assert.equal((html.match(/<article class="equip-tile equipment-list-card"/g) ?? []).length, items.length);
  for (const d of items) {
    const tile = html.match(new RegExp(`<article class="equip-tile equipment-list-card" data-equipment="${d.id}".*?</article>`, 's'))[0];
    assert.ok(tile.includes(`<h3>${d.name} `));
    assert.match(tile, /data-gun-preview/);
    assert.match(tile, /data-gear-price/);
    assert.match(tile, new RegExp(`data-buy-equipment="${d.id}"`));
    assert.match(tile, new RegExp(`data-detail-equipment="${d.id}"`));
    assert.match(tile, new RegExp(`data-enhance-equipment="${d.id}"`));
    assert.doesNotMatch(tile, /data-buy-additional|data-manage-equipment|추가 구매|repeat-price/);
  }
});

test('equipment store exposes the full catalog from the beginning', () => {
  assert.equal((equipmentStoreMarkup(army(0, 0)).match(/data-equipment=/g)||[]).length,Object.keys(EQUIPMENT).length);
});

test('equipment detail carries descriptions and owned deployment toggle without duplicate upgrade or repeat purchase', () => {
  const s = army(1280), id = visibleEquipment(s)[0].id;
  const fresh = equipmentDetailMarkup(s, id);
  assert.equal(fresh.title, EQUIPMENT[id].name);
  for (const label of ['해금 계급', '구매 가격', '보유', '현재 최대 강화'])
    assert.ok(fresh.body.includes(`<dt>${label}</dt>`), label);
  assert.match(fresh.body, /data-gun-preview/);
  assert.match(fresh.body, /구매 후 가능/);
  assert.doesNotMatch(fresh.body, /data-detail-action/);
  const owned = equipmentDetailMarkup({ ...s, equipment: { ...s.equipment, [id]: { level: 4, deployed: true, count: 1 } } }, id);
  assert.match(owned.body, /1문 · \+4강/);
  assert.match(owned.body, new RegExp(`data-detail-action="toggle-equipment" data-id="${id}"`));
  assert.doesNotMatch(owned.body,/추가 구매|data-enhance-equipment|manage-equipment/);
});
