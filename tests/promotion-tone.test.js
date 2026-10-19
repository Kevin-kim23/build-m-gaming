import test from 'node:test';
import assert from 'node:assert/strict';
import { promotionTone } from '../src/home-view.js';

test('promotion colors change at 40, 60 and 80 percent, including completion', () => {
  for (const [percent, expected] of [[0,'blue'],[39,'blue'],[40,'green'],[59,'green'],[60,'orange'],[79,'orange'],[80,'red'],[99,'red'],[100,'red']]) {
    assert.equal(promotionTone(percent), expected, `${percent}%`);
  }
});

test('promotion color returns to blue after advancing to the next rank', () => {
  assert.equal(promotionTone(100), 'red');
  assert.equal(promotionTone(0), 'blue');
});
