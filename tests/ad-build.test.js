import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('closed-test release and debug both use Google sample ads without publisher inventory',()=>{
const g=readFileSync(new URL('../android/app/build.gradle',import.meta.url),'utf8');
const debug=g.match(/debug \{([\s\S]*?)\n        \}/)[1],release=g.match(/release \{([\s\S]*?)\n        \}/)[1];
assert.match(debug,/3940256099942544~3347511713/);assert.match(debug,/3940256099942544\/5224354917/);
assert.doesNotMatch(debug,/6317135937361483/);
assert.match(release,/3940256099942544~3347511713/);assert.match(release,/3940256099942544\/5224354917/);
assert.doesNotMatch(release,/6317135937361483/);
});
