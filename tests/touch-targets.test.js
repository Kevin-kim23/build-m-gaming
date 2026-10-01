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
