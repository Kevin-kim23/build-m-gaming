import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/game.js';
import {shopMarkup} from '../src/shop.js';
import {schoolIcon,schoolsMarkup} from '../src/school-panels.js';
import {homeMarkup} from '../src/home-view.js';
import {UNITS} from '../src/units.js';
test('recruitment previews all four NCO grades with school conditions while officers wait until level five',()=>{
  const s=freshState(0),html=shopMarkup(s,'',()=>''),before=structuredClone(s);
  for(const u of Object.values(UNITS).filter(u=>u.school==='nco')) {
    assert.ok(html.includes(`data-unit="${u.id}"`));
    assert.ok(html.includes(`부사관학교 Lv.${u.schoolLevel}`));
  }
  assert.ok(!html.includes('data-unit="lieutenant"'));
  assert.ok(shopMarkup({...s,ncoSchoolLevel:5},'',()=>'' ).includes('data-unit="lieutenant"'));
  assert.deepEqual(s,before);
});
test('schools remain in their own shop category with a single wallet and reveal the officer requirement at level five',()=>{
  const s=freshState(0),html=shopMarkup(s,'',()=>'', 'schools');
  assert.ok(html.includes('data-school="nco"'));assert.ok(!html.includes('data-unit='));
  assert.equal((html.match(/id="shop-gold"/g)??[]).length,1);
  assert.ok(!schoolsMarkup(s).includes('data-school="officer"'));
  const unlocked=schoolsMarkup({...s,ncoSchoolLevel:5});
  assert.ok(unlocked.includes('data-school="officer"'));assert.ok(unlocked.includes('소장 이상'));
});
test('home has no troop status row (counts live in the shop) and campus drawings reuse their cached original SVG',()=>{
  const html=homeMarkup(freshState(0));
  assert.doesNotMatch(html,/data-home-count|data-roster|data-home-unit|class="roster"/);
  const icons=[];
  for(let level=1;level<=5;level++){
    const svg=schoolIcon('nco',level);assert.equal(svg,schoolIcon('nco',level));
    assert.doesNotMatch(svg,/<image|<script|href=/);icons.push(svg);
  }
  assert.equal(new Set(icons).size,5);
});
