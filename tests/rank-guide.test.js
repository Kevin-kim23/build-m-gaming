import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../src/game.js';
import { rankGuideMarkup } from '../src/rank-guide.js';
import { RANK_DEFINITIONS, rankForArmy } from '../src/ranks.js';
import { FORMATIONS } from '../src/formations.js';
import { detailMarkup } from '../src/detail-popup.js';

const insignia = (i) => `<i class="insignia" data-i="${i}"></i>`;

test('rank guide lists every rank, marks the current one and explains formations', () => {
  const s = { ...freshState(0), soldiers: 25 };
  const html = rankGuideMarkup(s, insignia);
  const rank = rankForArmy(s);
  assert.equal((html.match(/class="rank-step[ "]/g) ?? []).length, RANK_DEFINITIONS.length);
  assert.equal((html.match(/rank-step reached current/g) ?? []).length, 1);
  assert.match(html, new RegExp(`class="rank-step reached current" data-rank="${rank}"`));
  assert.equal((html.match(/rank-step reached/g) ?? []).length, rank + 1);
  assert.equal((html.match(/data-formation=/g) ?? []).length, FORMATIONS.length - 1);
  assert.match(html, /편제 안내/);
  assert.match(html, /id="rank-next"/);
});

test('detail popup markup has one title, a labelled close button and the body', () => {
  const html = detailMarkup({ kicker: 'UNIT', title: '하사', body: '<p>설명</p>' });
  assert.equal((html.match(/id="detail-title"/g) ?? []).length, 1);
  assert.match(html, /data-detail-close[^>]*aria-label="상세 닫기"/);
  assert.match(html, /<p>설명<\/p>/);
});
