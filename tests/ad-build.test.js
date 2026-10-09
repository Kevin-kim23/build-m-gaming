import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('release selects publisher inventory and debug keeps sample inventory',()=>{
const g=readFileSync(new URL('../android/app/build.gradle',import.meta.url),'utf8');
const debug=g.match(/debug \{([\s\S]*?)\n        \}/)[1],release=g.match(/release \{([\s\S]*?)\n        \}/)[1];
assert.match(debug,/3940256099942544~3347511713/);assert.match(debug,/3940256099942544\/5224354917/);
assert.doesNotMatch(debug,/6317135937361483/);assert.match(release,/6317135937361483~2481976415/);assert.match(release,/6317135937361483\/8022077704/);
});
