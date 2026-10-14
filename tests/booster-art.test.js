import test from 'node:test';
import assert from 'node:assert/strict';
import {POTIONS} from '../src/potions.js';
import {HOME_AUTO_TAP} from '../src/home-auto-tap-rules.js';
import {potionIcon} from '../src/potion-art.js';
import {homeAutoTapIcon} from '../src/home-auto-tap-art.js';

test('boosters keep inventory IDs and share accessible, self-contained artwork across views',()=>{
  assert.deepEqual(Object.keys(POTIONS),['red','blue']);
  for(const id of Object.keys(POTIONS)){
    const svg=potionIcon(id);
    assert.equal(potionIcon(id),svg);
    assert.match(svg,/viewBox="0 0 66 80"/);
    assert.ok(svg.includes(`aria-label="${POTIONS[id].name} `));
    assert.match(svg,/role="img"/);
    // Repeated inline copies must not resolve duplicate IDs or load external assets.
    assert.doesNotMatch(svg,/\s(?:id|href|onload)\s*=|<script|<image|url\(/i);
  }
  assert.notEqual(potionIcon('red'),potionIcon('blue'));
  assert.throws(()=>potionIcon('unknown'),RangeError);
  assert.throws(()=>potionIcon('toString'),RangeError);
});

test('automatic touch artwork advertises the configured rate without slot-size changes',()=>{
  assert.equal(HOME_AUTO_TAP.tapsPerSecond,5);
  assert.match(homeAutoTapIcon,/viewBox="0 0 66 80"/);
  assert.ok(homeAutoTapIcon.includes(`초당 ${HOME_AUTO_TAP.tapsPerSecond}회`));
  assert.ok(homeAutoTapIcon.includes(`>×${HOME_AUTO_TAP.tapsPerSecond}</text>`));
  assert.doesNotMatch(homeAutoTapIcon,/\s(?:id|href|onload)\s*=|<script|<image|url\(/i);
});
