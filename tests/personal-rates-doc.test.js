import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ratesDocument,renderPersonalRates} from '../tools/personal-rates.mjs';

test('published enhancement probabilities, costs and abilities match the live definitions',()=>{
  assert.equal(readFileSync(ratesDocument,'utf8').replace(/\r\n/g,'\n'),renderPersonalRates());
});
