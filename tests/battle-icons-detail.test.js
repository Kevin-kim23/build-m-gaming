import test from 'node:test';
import assert from 'node:assert/strict';
import { battleIcon, battleStarsMarkup, mapBattleStars, mapBattleCheck } from '../src/battle-icons.js';

const names=['pause','mana','lock','check','info','up','down','left','right','locate','world','orbit'];

test('battle controls keep their small layout and accessible contract with detailed original pixel art',()=>{
  for (const name of names) {
    const art=battleIcon(name);
    assert.equal(battleIcon(name),art);
    assert.match(art,new RegExp(`class="battle-icon battle-icon-${name}" data-battle-icon="${name}"`));
    assert.match(art,/viewBox="0 0 64 64" width="18" height="18"/);
    assert.match(art,/shape-rendering="crispEdges"/);
    assert.match(art,/aria-hidden="true" focusable="false"/);
    assert.ok((art.match(/<(?:path|rect)\b/g)||[]).length>=5,`${name}: separate faces and highlights`);
    const colors=new Set([...art.matchAll(/fill="(#[\da-f]{6})"/g)].map(match=>match[1]));
    assert.ok(colors.size>=4,`${name}: shadow, material, bevel and edge-light colors`);
    assert.doesNotMatch(art,/<(?:text|image|script|foreignObject|filter)\b|\bid=|url\(|https?:|NaN|undefined/);
  }
  assert.throws(()=>battleIcon('unknown'),RangeError);
  assert.throws(()=>battleIcon('__proto__'),RangeError);
});

test('direction controls share one stepped arrow with distinct rotation, never platform glyphs',()=>{
  assert.doesNotMatch(battleIcon('up'),/rotate\(/);
  for (const [name,angle] of [['right',90],['down',180],['left',270]]) {
    assert.match(battleIcon(name),new RegExp(`transform="rotate\\(${angle} 32 32\\)"`));
  }
  assert.equal(new Set(names.map(battleIcon)).size,names.length);
});

test('detailed star rows preserve three slots, completion semantics and the original 80 by 24 footprint',()=>{
  for (let value=0;value<=3;value++) {
    const art=battleStarsMarkup(value);
    assert.match(art,/viewBox="0 0 80 24" width="80" height="24"/);
    assert.match(art,new RegExp(`role="img" aria-label="별 ${value}개"`));
    assert.equal((art.match(/data-star-filled="true"/g)||[]).length,value);
    assert.equal((art.match(/data-star-filled="false"/g)||[]).length,3-value);
    for(const x of [0,28,56]) assert.ok(art.includes(`translate(${x} 0) scale(.375)`));
    assert.doesNotMatch(art,/<text\b|★|☆|\bid=|url\(/);
    assert.equal(art,battleStarsMarkup(value));
  }
  assert.match(battleStarsMarkup(3,true),/aria-label="최고 별 3개"/);
  for (const invalid of [NaN,-1,4,1.5,null,undefined]) {
    assert.equal(battleStarsMarkup(invalid),battleStarsMarkup(0));
  }
});

test('map check and stars scale the new 64px source back to the existing 24px map coordinate system',()=>{
  const stars=mapBattleStars(2,100,200),check=mapBattleCheck(100,200);
  assert.match(stars,/<g class="region-stars" role="img" aria-label="최고 별 2개" transform="translate\(74 184\) scale\(\.65\)"/);
  assert.equal((stars.match(/scale\(\.375\)/g)||[]).length,3);
  assert.match(check,/<g class="region-check" transform="translate\(90 190\) scale\(\.83\)"/);
  assert.match(check,/<g transform="scale\(\.375\)" shape-rendering="crispEdges">/);
  assert.equal(64*.375,24,'upgraded geometry must not grow map symbols');
  for (const art of [stars,check]) assert.doesNotMatch(art,/<(?:svg|span|div|text|image|foreignObject)\b|\bid=|url\(/);
});
