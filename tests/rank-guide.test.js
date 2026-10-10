import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../src/game.js';
import { rankGuideMarkup, compactGuidePower } from '../src/rank-guide.js';
import { RANK_DEFINITIONS, rankForArmy } from '../src/ranks.js';
import { FORMATIONS } from '../src/formations.js';
import { detailMarkup } from '../src/detail-popup.js';
import { fmt } from '../src/format.js';
import { armyPower, UNITS } from '../src/units.js';

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
  assert.match(html, /부대 편제 안내/);
  assert.doesNotMatch(html, /<p|rank-next|일반병 5,000명|분대부터 총군사령부까지/);
  assert.match(html, /<b>중장<\/b><small>8만 전력<\/small><em>1개 군단<\/em>/);
  assert.match(html, /<b>소원수<\/b><small>524만 전력<\/small>/);
  assert.match(html, /<b>대원수<\/b><small>8388만 전력<\/small><em>1개 총군사령부<\/em>/);
  assert.match(html, /<b>은하 원수<\/b><small>43조 전력<\/small>/);
  assert.match(html, /<b>은하 대연합군<\/b><span>43조 전력<\/span>/);
});

test('guide power keeps only the integer part of the largest Korean unit without rounding thresholds up',()=>{
  for(const [value,label] of [
    [0,'0'],[4,'4'],[9999,'9,999'],[10000,'1만'],[19999,'1만'],
    [5_242_880,'524만'],[99_999_999,'9999만'],[100_000_000,'1억'],
    [199_999_999,'1억'],[999_999_999_999,'9999억'],[1_000_000_000_000,'1조'],
    [43_980_465_111_040,'43조'],[Number.MAX_SAFE_INTEGER,'9007조'],
    [9_999_999_999_999_999n,'9999조'],[10_000_000_000_000_000n,'1경'],
    [999_999_999_999_999_999n,'99경'],[100_000_000_000_000_000_000n,'1해'],
  ])assert.equal(compactGuidePower(value),label,String(value));
  for(const invalid of [-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,-1n,'10000'])
    assert.throws(()=>compactGuidePower(invalid),/non-negative safe integer/);
});

test('compact guide labels never modify promotion and formation thresholds or the normal number formatter',()=>{
  const thresholds=RANK_DEFINITIONS.map(r=>r.required),sizes=FORMATIONS.map(f=>f.size);
  const state=freshState(0);state.sergeants=300;state.soldiers=5_242_879-300*UNITS.sergeant.power;
  const before=rankForArmy(state);rankGuideMarkup(state,insignia);
  assert.equal(armyPower(state),5_242_879);assert.equal(rankForArmy(state),before);
  state.soldiers++;assert.equal(rankForArmy(state),before+1,'precise promotion still requires5242880');
  assert.deepEqual(RANK_DEFINITIONS.map(r=>r.required),thresholds);
  assert.deepEqual(FORMATIONS.map(f=>f.size),sizes);
  assert.equal(fmt(5_242_880),'5,242,880');
});

test('detail popup markup has one title, a labelled close button and the body', () => {
  const html = detailMarkup({ kicker: 'UNIT', title: '하사', body: '<p>설명</p>' });
  assert.equal((html.match(/id="detail-title"/g) ?? []).length, 1);
  assert.match(html, /data-detail-close[^>]*aria-label="상세 닫기"/);
  assert.match(html, /<p>설명<\/p>/);
});
