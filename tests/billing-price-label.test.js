import test from 'node:test';
import assert from 'node:assert/strict';
import {billingPriceLabel} from '../src/billing-price-label.js';

test('Korean Play prices place the won sign after the unchanged amount',()=>{
  for(const price of ['₩5,900','5,900원','KRW 5,900','5,900 ₩','  ₩5,900  '])assert.equal(billingPriceLabel(price),'5,900₩');
  assert.equal(billingPriceLabel('₩4,900'),'4,900₩');
  assert.equal(billingPriceLabel('KRW 12345678901234567890'),'12345678901234567890₩');
});

test('missing prices stay empty and other currencies are never relabelled as won',()=>{
  for(const price of [null,undefined,'','   ',5900])assert.equal(billingPriceLabel(price),'');
  for(const price of ['$4.99','US$4.99','€5,90','JPY 590','₩5,90','KRW 5,900 / month','<fake>'])assert.equal(billingPriceLabel(price),price);
});
