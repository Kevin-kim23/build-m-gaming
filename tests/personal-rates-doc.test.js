import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {guideDocument,renderPersonalGuide} from '../tools/personal-guide.mjs';

test('published guaranteed enhancement costs and abilities match the live definitions',()=>{
  assert.equal(readFileSync(guideDocument,'utf8').replace(/\r\n/g,'\n'),renderPersonalGuide());
});
