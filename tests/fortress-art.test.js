import test from 'node:test';
import assert from 'node:assert/strict';
import { fortressSprite, FORTRESS_SIZE } from '../src/fortress-art.js';
import { COUNTRIES } from '../src/campaign.js';

// 테스트 환경에는 canvas가 없으므로, 칠한 사각형을 기록하는 가짜 캔버스를 쓴다.
function fakeDocument() {
  return { createElement: () => { const ops = []; const ctx = { fillStyle: '', setTransform() {}, fillRect(...a) { ops.push([this.fillStyle, ...a]); } };
    return { width: 0, height: 0, ops, getContext: () => ctx }; } };
}
test('each country has its own cached fortress sprite with themed colours and plenty of detail', () => {
  const before = globalThis.document; globalThis.document = fakeDocument();
  try {
    const sprites = COUNTRIES.map((c) => fortressSprite(c.id));
    assert.equal(new Set(sprites).size, 4);
    for (const [i, c] of COUNTRIES.entries()) {
      assert.equal(fortressSprite(c.id), sprites[i], 'cached');
      assert.equal(sprites[i].width, FORTRESS_SIZE.width * 3);
      assert.ok(sprites[i].ops.length > 250, 'detailed: bricks, towers, gate, flags');
    }
    const palettes = sprites.map((s) => new Set(s.ops.map((o) => o[0])));
    assert.ok(palettes.every((p) => p.size >= 8));
    assert.notDeepEqual([...palettes[0]].sort(), [...palettes[1]].sort());
    assert.equal(fortressSprite('unknown'), sprites[0], 'unknown country falls back to the first theme');
  } finally { globalThis.document = before; }
});
