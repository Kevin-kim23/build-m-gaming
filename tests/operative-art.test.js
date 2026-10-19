import test from 'node:test';
import assert from 'node:assert/strict';
import { OPERATIVES } from '../src/loot.js';
import { operativeIcon, lootIcon } from '../src/operative-art.js';

test('all operative portraits use a transparent pixel grid and safe self-contained geometry',()=>{
  const portraits=OPERATIVES.map(o=>operativeIcon(o.id));
  assert.equal(new Set(portraits).size,OPERATIVES.length);
  for(const [i,svg] of portraits.entries()){
    assert.match(svg,/^<svg viewBox="0 0 192 224" shape-rendering="crispEdges" aria-hidden="true" focusable="false">/);
    assert.match(svg,/<\/svg>$/);
    assert.doesNotMatch(svg,/undefined|NaN|Infinity|<image|<text|<script|<foreignObject|href=|https?:|onload=/);
    for(const rect of svg.matchAll(/<rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.-]+)" height="([\d.-]+)"/g)){
      const [x,y,w,h]=rect.slice(1).map(Number);
      assert.ok([x,y,w,h].every(Number.isInteger),OPERATIVES[i].id+' uses whole pixels');
      assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=192&&y+h<=224,OPERATIVES[i].id+' stays inside its portrait');
    }
    assert.equal(operativeIcon(OPERATIVES[i].id),svg);
  }
});

test('currency icon remains compact and unknown portraits fail explicitly',()=>{
  assert.match(lootIcon(),/viewBox="0 0 48 48"/);
  assert.throws(()=>operativeIcon('not-a-member'),RangeError);
});
