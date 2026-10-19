import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Wings must follow the rank badge, not a fixed pixel offset: the badge grows with the rank,
// and fixed offsets left the wings hanging below the badge (NCO to colonel).
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('standard promotion wings attach to the upper middle of the badge for every rank', () => {
  const css = read('src/style.css');
  const block = css.match(/\.promotion-wing \{[^}]*\}/)[0];
  assert.match(block, /top:\s*calc\(18px \+ var\(--medal-size\) \* 0\.42\)/);
  assert.match(block, /transform:\s*translateY\(-76%\)/);
  assert.doesNotMatch(block, /top:\s*35px/);
  assert.match(css, /\.promotion-wing\.right \{[^}]*transform:\s*translateY\(-76%\) scaleX\(-1\)/);
});

test('field officer wings use the same badge-relative anchor and keep their mirror', () => {
  const css = read('src/promotion-tier.css');
  assert.match(css, /\.promotion-field \.promotion-wing \{[^}]*top:calc\(18px \+ var\(--medal-size\) \* \.34\)[^}]*transform:translateY\(-71%\)/);
  assert.match(css, /\.promotion-field \.promotion-wing\.right \{[^}]*transform:translateY\(-71%\) scaleX\(-1\)/);
  assert.doesNotMatch(css, /\.promotion-field \.promotion-wing \{[^}]*top:20px/);
});
