import test from 'node:test';
import assert from 'node:assert/strict';
import { FORMATIONS, GALACTIC_COMMAND_SIZE, GALACTIC_GROUP_COMMAND_SIZE, groupSoldiers } from '../src/formations.js';
import { RANKS, RANK_DEFINITIONS, rankForArmy, promotionProgress } from '../src/ranks.js';
import { insignia } from '../src/home-view.js';
import { supremeRankSymbol } from '../src/rank-emblem.js';
import { generalEmblem } from '../src/general-promotion-art.js';
import { promotionMarkup, promotionProfile } from '../src/promotion.js';

const ranks = ['은하 준장', '은하 소장', '은하 중장', '은하 대장', '은하 원수'];
const ids = ['galacticCorps', 'galacticFieldArmy', 'galacticArmyGroup', 'galacticAlliedArmy', 'galacticGrandAlliedArmy'];
const names = ['은하 군단', '은하 야전군', '은하 집단군', '은하 연합군', '은하 대연합군'];
const army = power => ({ soldiers: power - 3000, sergeants: 300 });

test('galaxy formations preserve existing saves and require eight previous formations from deputy commander onward', () => {
  assert.equal(FORMATIONS.find(f => f.id === 'galacticCommand').name, '은하연대');
  assert.equal(FORMATIONS.find(f => f.id === 'galacticGroupCommand').name, '은하 사단');
  assert.equal(GALACTIC_COMMAND_SIZE, 335544320);
  assert.equal(GALACTIC_GROUP_COMMAND_SIZE, 1342177280);
  assert.equal(RANK_DEFINITIONS[RANKS.indexOf('부사령관')].required, GALACTIC_GROUP_COMMAND_SIZE);
  assert.deepEqual(RANKS.slice(25,30), ranks);
  let previous = FORMATIONS.find(f => f.id === 'galacticGroupCommand');
  for (const [i, name] of ranks.entries()) {
    const next = FORMATIONS.find(f => f.id === ids[i]);
    assert.ok(next, name);
    assert.equal(next.name, names[i]);
    assert.equal(next.size, previous.size * 8);
    assert.ok(Number.isSafeInteger(next.size));
    assert.deepEqual(groupSoldiers(previous.size * 7).map(f => [f.id, f.count]), [[previous.id, 7]]);
    assert.deepEqual(groupSoldiers(next.size).map(f => [f.id, f.count]), [[next.id, 1]]);
    const rank = RANKS.indexOf(name), definition = RANK_DEFINITIONS[rank];
    assert.equal(definition.required, next.size);
    assert.match(definition.condition, new RegExp(`8개 ${previous.name}`));
    assert.equal(rankForArmy(army(next.size - 1)), rank - 1);
    assert.equal(rankForArmy(army(next.size)), rank);
    assert.ok(promotionProgress(army(next.size - 1)).ratio < 1);
    previous = next;
  }
});

test('galaxy badges show one to five copper gold stars on purple enamel without cross-instance SVG references', () => {
  const allIds = [];
  for (const [i, name] of ranks.entries()) {
    const rank = RANKS.indexOf(name);
    assert.ok(rank >= 0, name);
    for (let copy = 0; copy < 3; copy++) {
      const html = insignia(rank);
      assert.match(html, /data-frame-theme="amethyst"/);
      assert.equal((html.match(/data-rank-star/g) || []).length, i + 1);
      assert.equal((html.match(/data-metal="copper-gold"/g) || []).length, i + 1);
      assert.doesNotMatch(html, /undefined|NaN|data-laurel|<image|https?:/);
      const ownIds = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
      for (const [, id] of html.matchAll(/url\(#([^)]*)\)/g)) assert.ok(ownIds.includes(id));
      allIds.push(...ownIds);
    }
    const symbol = supremeRankSymbol(11 + i);
    assert.equal(supremeRankSymbol(11 + i), symbol);
    for (const [, points] of symbol.matchAll(/points="([^"]+)"/g)) {
      for (const [x, y] of points.split(' ').map(point => point.split(',').map(Number)))
        assert.ok(x >= 0 && x <= 64 && y >= 0 && y <= 64);
    }
  }
  assert.equal(new Set(allIds).size, allIds.length);
});

test('all five galaxy promotions retain bilateral salutes and use purple crests with matching copper stars', () => {
  for (const [i, name] of ranks.entries()) {
    const rank = RANKS.indexOf(name), profile = promotionProfile(rank);
    assert.equal(profile.generalTier, 11 + i);
    const markup = promotionMarkup(rank, insignia, profile);
    assert.match(markup, /GALACTIC OFFICER/);
    assert.match(markup, /은하 장성 진급/);
    assert.match(markup, /general-salute left/);
    assert.match(markup, /general-salute right/);
    assert.doesNotMatch(markup, /undefined|NaN/);
    const art = generalEmblem(11 + i);
    assert.match(art, /data-ceremony-theme="amethyst"/);
    assert.equal((art.match(/data-metal="copper-gold"/g) || []).length, i + 1);
  }
});
