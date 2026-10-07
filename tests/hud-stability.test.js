import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fmtGold } from '../src/format.js';
import { tapFeedback } from '../src/tap-feedback.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('wallet font sizing does not grow when 25억 9,000만 rolls over to 26억 100만',()=>{
  assert.equal(fmtGold(2590000000),'25억 9,000만');
  assert.equal(fmtGold(2601000000),'26억 100만');
  assert.doesNotMatch(read('src/main.js'),/goldLabel\.length/);
  assert.doesNotMatch(read('src/tap-feedback.js'),/offsetWidth|classList\.(add|remove)\("pop"\)/);
});
test('rapid taps cancel previous color feedback without forced wallet layout or scaling',()=>{
  const doc=globalThis.document,timer=globalThis.setTimeout;
  let reads=0,cancelled=0,animations=0;
  globalThis.document={createElement:()=>({style:{},remove(){}})};
  globalThis.setTimeout=()=>1;
  const gold={get offsetWidth(){throw Error('forced layout');},animate(frames){
    animations++;assert.ok(frames.every(f=>!('transform' in f)));return {cancel(){cancelled++;}};
  }};
  const zone={getBoundingClientRect(){reads++;return {width:320,height:400,left:0,top:0};},querySelectorAll:()=>[],appendChild(){}};
  try {for(let i=0;i<20;i++)tapFeedback(zone,gold,{detail:1,clientX:100,clientY:100},1);
    assert.equal(reads,20);assert.equal(animations,20);assert.equal(cancelled,19);
  } finally {globalThis.document=doc;globalThis.setTimeout=timer;}
});
test('native safe-area top is applied to home without hardcoding a phone status bar height',()=>{
  assert.match(read('src/hud.css'),/--safe-area-inset-top/);
  assert.match(read('src/hud.css'),/\.game\s*\{[^}]*padding-top:/);
});
