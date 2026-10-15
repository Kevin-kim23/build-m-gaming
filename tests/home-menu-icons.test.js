import test from 'node:test';
import assert from 'node:assert/strict';
import {homeMenuIcon} from '../src/home-menu-icons.js';

const destinations=['recruit','equipment','shop','facilities','personal','items','battle'];
test('all seven menu pictures use the same optical canvas without competing accessible names',()=>{
  for(const destination of destinations){
    const html=homeMenuIcon(destination);
    assert.match(html,/viewBox="0 0 48 48"/,destination);
    assert.equal((html.match(/<svg /g)||[]).length,1,destination);
    assert.match(html,/^<span class="home-menu-icon" aria-hidden="true">/,destination);
    assert.doesNotMatch(html,/role="img"|aria-label=|<text|<image|<button/,destination);
  }
});
test('menu illustrations are distinct and unknown destinations do not substitute a misleading icon',()=>{
  assert.equal(new Set(destinations.map(homeMenuIcon)).size,destinations.length);
  assert.equal(homeMenuIcon('not-a-destination'),'');
  assert.equal(homeMenuIcon('__proto__'),'');
});
