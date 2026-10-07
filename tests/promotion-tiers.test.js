import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RANKS, RANK_DEFINITIONS } from '../src/ranks.js';
import { promotionProfile, promotionMarkup } from '../src/promotion.js';
import { generalRankBadge } from '../src/rank-frame.js';
import { fieldOfficerWing } from '../src/promotion-wing-art.js';
import { insignia } from '../src/home-view.js';

test('target rank chooses a plain badge, original wings, enhanced field wings, or general ceremony', () => {
  for (const [rank, definition] of RANK_DEFINITIONS.entries()) {
    const p = promotionProfile(rank), html = promotionMarkup(rank, insignia);
    if (definition.kind === 'enlisted') {
      assert.equal(p.style, 'simple');
      assert.match(html, new RegExp(`${definition.name} 진급!`));
      assert.doesNotMatch(html, /wing|halo|sparks|promotion-caption/);
    } else if (definition.kind === 'field') {
      assert.equal(p.style, 'field');
      assert.equal((html.match(/class="field-officer-wing"/g) || []).length, 2);
      assert.match(html, /field-promotion-orbit/);
    } else if (definition.kind === 'general') {
      assert.equal(p.style, 'general');
      assert.match(html, /general-salute left/);
      assert.match(html, /general-salute right/);
    } else {
      assert.equal(p.style, 'standard');
      assert.match(html, /promotion-wing left/);
      assert.doesNotMatch(html, /field-officer-wing|general-salute/);
    }
    assert.equal(p.duration, p.generalTier ? 5000 + p.generalTier * 300 + Math.max(0,p.generalTier-4)*500 : 3000);
  }
});

test('gold beveled red badges preserve all general marks and stop after junior marshal', () => {
  for (let tier = 1; tier <= 5; tier++) {
    const art = generalRankBadge(tier);
    assert.equal(generalRankBadge(tier), art);
    assert.equal((art.match(/data-rank-star/g) || []).length, tier);
    assert.match(art, /viewBox="0 0 96 96"/);
    assert.doesNotMatch(art, /<image|https?:|<script|NaN|undefined/);
    const ids = [...art.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    for (const [, id] of art.matchAll(/url\(#([^)]*)\)/g)) assert.ok(ids.includes(id));
  }
  for (const rank of ['준장','소장','중장','대장','준원수']) assert.match(insignia(RANKS.indexOf(rank)), /framed-rank/);
  assert.doesNotMatch(insignia(RANKS.indexOf('대령')), /framed-rank/);
  for (const tier of [0,6,NaN,1.5]) assert.throws(() => generalRankBadge(tier), RangeError);
});

test('field wings add feathers by rank, cache originals, and keep both sides gradient-safe', () => {
  const variants = [];
  for (let marks = 1; marks <= 3; marks++) {
    const combined = ['left','right'].map(side => {
      const art = fieldOfficerWing(marks, side);
      assert.equal(fieldOfficerWing(marks, side), art);
      assert.equal((art.match(/class="field-wing-feather"/g) || []).length, 8 + marks);
      assert.doesNotMatch(art, /<image|https?:|<script|NaN|undefined/);
      return art;
    }).join('');
    const ids = [...combined.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(ids.length, new Set(ids).size);
    for (const [, id] of combined.matchAll(/url\(#([^)]*)\)/g)) assert.ok(ids.includes(id));
    variants.push(combined);
  }
  assert.equal(new Set(variants).size, 3);
  const css = readFileSync(new URL('../src/promotion-tier.css', import.meta.url), 'utf8');
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /\.field-wing-feather \{ animation:none;/);
});
