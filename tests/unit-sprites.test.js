import test from 'node:test';
import assert from 'node:assert/strict';
import { unitSprite, baseSprite, levelTier, SPRITE_SIZE } from '../src/unit-sprites.js';
import { UNIT_TRAITS } from '../src/battle-balance.js';
import { laneY, LANE_CENTERS, LANE_CANVAS } from '../src/lane-art.js';

// 칠한 사각형을 기록하는 가짜 캔버스(테스트 환경에는 canvas가 없다). 모르는 그리기 함수는 아무 일도 하지 않는다.
const fakeDocument = () => ({ createElement: () => {
  const ops = [];
  const ctx = new Proxy({ fillStyle: '', ops }, { get: (t, k) => (k in t ? t[k] : k === 'fillRect' ? function (...a) { ops.push([this.fillStyle, ...a]); } : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
  return { width: 0, height: 0, ops, getContext: () => ctx };
} });

test('every deployable gear has a detailed top-down sprite per side, cached, with upgrade tiers', () => {
  const before = globalThis.document; globalThis.document = fakeDocument();
  try {
    const ids = Object.keys(UNIT_TRAITS);
    for (const id of ids) {
      const player = unitSprite(id, 'player', 0), enemy = unitSprite(id, 'enemy', 0);
      assert.equal(unitSprite(id, 'player', 0), player, 'cached');
      assert.notEqual(player, enemy);
      assert.equal(player.width, SPRITE_SIZE.width * 3);
      assert.ok(player.ops.length >= 14, `${id} has shading and detail`);
      assert.ok(new Set(player.ops.map((o) => o[0])).size >= 4, `${id} uses several tones`);
      assert.ok(unitSprite(id, 'player', 12).ops.length >= unitSprite(id, 'player', 0).ops.length, `${id} gains detail with upgrades`);
    }
    assert.ok(unitSprite('tank', 'player', 12).ops.length > unitSprite('tank', 'player', 0).ops.length);
    assert.deepEqual([0, 4, 5, 9, 10, 14, 15, 20].map(levelTier), [0, 0, 1, 1, 2, 2, 3, 3]);
    for (const id of ['battalion', 'division', 'supremeCommand']) { const b = baseSprite(id, 'player'); assert.equal(baseSprite(id, 'player'), b); assert.ok(b.ops.length > 30); }
    assert.ok(baseSprite('supremeCommand', 'player').width > baseSprite('battalion', 'player').width, 'higher rank base is bigger');
  } finally { globalThis.document = before; }
});

test('three vertical lanes sit side by side inside the canvas, and farther positions are higher on screen', () => {
  assert.equal(LANE_CENTERS.length, 3);
  assert.ok(LANE_CENTERS[0] > 0 && LANE_CENTERS[2] < LANE_CANVAS.width && LANE_CENTERS[0] < LANE_CENTERS[1] && LANE_CENTERS[1] < LANE_CENTERS[2]);
  assert.ok(laneY(0) > laneY(500) && laneY(500) > laneY(1000));
  assert.ok(laneY(0) < LANE_CANVAS.height && laneY(1000) > 0);
});
