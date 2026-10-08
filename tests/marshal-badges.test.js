import test from 'node:test';
import assert from 'node:assert/strict';
import { generalRankBadge, marshalRankBadge } from '../src/rank-frame.js';
import { supremeRankSymbol } from '../src/rank-emblem.js';
import { insignia } from '../src/home-view.js';
import { RANKS } from '../src/ranks.js';

test('five upper badges share the minor marshal relief theme and preserve their star counts', () => {
  const allIds = [];
  const themes = [];
  for (let tier=6;tier<=10;tier++) {
    const art=marshalRankBadge(tier);
    assert.equal(marshalRankBadge(tier),art);
    assert.equal((art.match(/data-rank-star/g)||[]).length,tier-5);
    assert.equal((art.match(/data-metal="white"/g)||[]).length,tier-5);
    assert.match(art,/viewBox="0 0 96 96"/);
    assert.match(art,/<feDropShadow/);
    assert.ok(art.includes(supremeRankSymbol(tier)));
    assert.doesNotMatch(art,/data-laurel|<image|https?:|<script|NaN|undefined/);
    const ids=[...art.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    for (const [,id] of art.matchAll(/url\(#([^)]*)\)/g)) assert.ok(ids.includes(id));
    allIds.push(...ids);
    themes.push(art.match(/data-frame-theme="([^"]+)"/)[1]);
    for (const [,points] of supremeRankSymbol(tier).matchAll(/points="([^"]+)"/g)) {
      for (const [x,y] of points.split(' ').map(p=>p.split(',').map(Number))) {
        assert.ok(x>=0 && x<=64 && y>=0 && y<=64);
      }
    }
  }
  assert.equal(new Set(themes).size,1);
  assert.equal(new Set(allIds).size,allIds.length);
  for (const tier of [0,5,11,'6',NaN,6.5]) assert.throws(()=>marshalRankBadge(tier),RangeError);
  assert.match(generalRankBadge(1),/data-general-frame="1"/);
  assert.doesNotMatch(generalRankBadge(5),/data-marshal-frame/);
});

test('home and rank guide use the same framed artwork for all implemented upper marshal ranks', () => {
  for (const [rank,tier] of [['소원수',6],['중원수',7],['대원수',8],['특전원수',9],['부사령관',10]]) {
    assert.ok(RANKS.includes(rank));
    const html=insignia(RANKS.indexOf(rank));
    assert.match(html,/class="insignia general framed-rank"/);
    assert.ok(html.includes(marshalRankBadge(tier)));
    assert.equal((html.match(/data-rank-star/g)||[]).length,tier-5);
  }
});
