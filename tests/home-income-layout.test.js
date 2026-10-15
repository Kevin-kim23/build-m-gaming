import test from 'node:test';
import assert from 'node:assert/strict';
import {homeMarkup} from '../src/home-view.js';

test('home keeps live income hooks exactly once and exposes optional bonuses in a closed disclosure',()=>{
  const html=homeMarkup({});
  for(const id of ['passive-rate','tap-rate','passive-effects','tap-effects','tap-sword-effect','tap-potion-effect','passive-potion-effect']) {
    assert.equal(html.split(`id="${id}"`).length-1,1,id);
  }
  const details=html.match(/<details class="income-details">([\s\S]*?)<\/details>/)?.[1];
  assert.ok(details);
  assert.match(details,/aria-label="수입 효과 자세히"/);
  assert.match(details,/id="passive-effects"/);
  assert.match(details,/id="tap-effects"/);
  assert.doesNotMatch(details,/id="(?:passive-rate|tap-rate)"/);
  assert.match(details,/효과가 이미 포함/);
});
