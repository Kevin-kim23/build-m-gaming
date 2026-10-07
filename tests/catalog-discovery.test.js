import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState, buyEquipment, buildFacility} from '../src/game.js';
import {EQUIPMENT, visibleEquipment, equipmentPurchaseOffer} from '../src/equipment.js';
import {FACILITIES, facilityOffer} from '../src/facilities.js';
import {personalMarkup} from '../src/personal-panels.js';
import {PERSONAL_EQUIPMENT} from '../src/personal-catalog.js';
import {MAX_GOLD, serializeSave} from '../src/money.js';
import {promotionMarkup} from '../src/promotion.js';
import {insignia} from '../src/home-view.js';
import {RANK_DEFINITIONS} from '../src/ranks.js';

test('a new player can discover every facility and equipment but cannot bypass rank locks',()=>{
  const s=freshState(1800000000000);s.gold=MAX_GOLD;
  assert.equal(visibleEquipment(s).length,Object.keys(EQUIPMENT).length);
  const before=serializeSave(s);
  for(const id of Object.keys(EQUIPMENT)){
    assert.equal(equipmentPurchaseOffer(s,id).visible,true);
    assert.equal(buyEquipment(s,1800000000000,id).reason,'locked');
  }
  for(const f of FACILITIES){
    assert.equal(facilityOffer(s,f.id).visible,true);
    assert.equal(buildFacility(s,1800000000000,f.id).reason,'locked');
  }
  const html=personalMarkup(s);
  for(const id of Object.keys(PERSONAL_EQUIPMENT))assert.ok(html.includes(`data-personal-equipment="${id}"`));
  assert.equal(serializeSave(s),before);
});
test('each enlisted promotion includes its actual badge without wings',()=>{
  RANK_DEFINITIONS.forEach((d,rank)=>{
    if(d.kind!=='enlisted')return;
    const html=promotionMarkup(rank,insignia);
    assert.ok(html.includes(insignia(rank)));
    assert.ok(html.includes(`${d.name} 진급!`));
    assert.doesNotMatch(html,/promotion-wing|promotion-halo/);
  });
});
