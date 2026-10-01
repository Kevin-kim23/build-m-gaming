import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const dir = new URL('../src/', import.meta.url);
const touch = readFileSync(new URL('touch.css', dir), 'utf8');

test('touch.css keeps a 44px minimum for the main controls and a hit area for tiny drawn ones', () => {
  assert.match(touch, /--tap: 44px/);
  for (const selector of ['#sound', '.home-tabs button', '.home-skill', '.panel-tabs button', '.shop-categories button',
    '.tile-buttons .buy', '.school-detail', '.detail-open', '.personal-detail', '.medal-visibility', '.nation-tab', '.atlas-controls button'])
    assert.ok(touch.includes(selector), selector);
  for (const selector of ['#toggle-medals::after', '#open-achievements::after', '#medal-list button::after', '.tile-detail::after'])
    assert.ok(touch.includes(selector), selector);
  // The medal row must not clip the extended hit area.
  assert.match(touch, /#medal-list \{ overflow: visible; \}/);
});

test('touch.css is imported last so it wins over the per-screen styles', () => {
  const main = readFileSync(new URL('main.js', dir), 'utf8');
  const imports = [...main.matchAll(/^import .*?["']([^"']+\.css)["'];?$/gm)].map((m) => m[1]);
  assert.equal(imports.at(-1), './touch.css');
});

test('no stylesheet sets text smaller than 10px', () => {
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.css'))) {
    const css = readFileSync(new URL(file, dir), 'utf8');
    const small = [...css.matchAll(/font(?:-size)?:\s*([1-9])px/g)];
    assert.equal(small.length, 0, `${file}: ${small.map((m) => m[0]).join(', ')}`);
  }
});

test('medal row hit area never reaches the field below and the shelf links stay on top', () => {
  assert.match(touch, /#toggle-medals, #open-achievements \{ z-index: 1; \}/);
  // Bottom inset of the medal row must stay inside the shelf padding (6px) so the field keeps its taps.
  const [, top, bottom] = touch.match(/#medal-list button::after \{[^}]*inset: -(\d+)px 0 -(\d+)px;/);
  assert.ok(Number(bottom) <= 6, `bottom ${bottom}px`);
  assert.ok(Number(top) <= 10);
});
