import test from 'node:test';
import assert from 'node:assert/strict';
import { unitSprite, levelTier, SPRITE_SIZE } from '../src/unit-sprites.js';
import { UNIT_TRAITS } from '../src/battle-balance.js';
import { laneX, LANE_CANVAS } from '../src/lane-art.js';

// 칠한 사각형을 기록하는 가짜 캔버스(테스트 환경에는 canvas가 없다).
const fakeDocument = () => ({ createElement: () => { const ops = []; const ctx = { fillStyle: '', setTransform() {}, fillRect(...a) { ops.push([this.fillStyle, ...a]); } }; return { width: 0, height: 0, ops, getContext: () => ctx }; } });

test('every deployable gear has a detailed side-view sprite per side, cached and distinct', () => {
  const before = globalThis.document; globalThis.document = fakeDocument();
  try {
    const ids = Object.keys(UNIT_TRAITS), seen = new Set();
    for (const id of ids) {
      const player = unitSprite(id, 'player', 0), enemy = unitSprite(id, 'enemy', 0);
      assert.equal(unitSprite(id, 'player', 0), player, 'cached');
      assert.notEqual(player, enemy);
      assert.equal(player.width, SPRITE_SIZE.width * 3);
      assert.ok(player.ops.length >= 14, `${id} has shading and detail`);
      assert.ok(new Set(player.ops.map((o) => o[0])).size >= 5, `${id} uses several tones`);
      assert.notDeepEqual(new Set(player.ops.map((o) => o[0])), new Set(enemy.ops.map((o) => o[0])));
      seen.add(JSON.stringify(player.ops));
    }
    assert.equal(seen.size, ids.length, 'no two gear share the same picture');
    assert.notEqual(unitSprite('tank', 'player', 0), unitSprite('tank', 'player', 12), 'upgrade tiers look different');
    assert.ok(unitSprite('tank', 'player', 20).ops.length > unitSprite('tank', 'player', 0).ops.length);
    assert.deepEqual([0, 4, 5, 9, 10, 14, 15, 20].map(levelTier), [0, 0, 1, 1, 2, 2, 3, 3]);
  } finally { globalThis.document = before; }
});

test('lane positions map the 0-1000 battlefield inside the canvas, player left and enemy right', () => {
  assert.ok(laneX(0) > 0 && laneX(1000) < LANE_CANVAS.width);
  assert.ok(laneX(0) < laneX(500) && laneX(500) < laneX(1000));
});
