import test from "node:test";
import assert from "node:assert/strict";
import { drawBattle } from "../src/battle-art.js";

test("battle art caches composition and sprites while HP and bounded shot effects change", () => {
  const previousDocument = globalThis.document;
  let created = 0, strokes = 0;
  const context = () => ({
    fillRect() {}, drawImage() {}, save() {}, restore() {}, translate() {},
    rotate() {}, setTransform() {}, fillText() {}, beginPath() {}, moveTo() {},
    lineTo() {}, stroke() { strokes++; },
  });
  const canvas = () => {
    const c = context();
    return { width: 0, height: 0, clientWidth: 360, getContext: () => c };
  };
  globalThis.document = { createElement(name) {
    assert.equal(name, "canvas"); created++; return canvas();
  } };
  try {
    const side = () => ({
      hq: { id: "battalion", name: "대대", hp: 1280, maxHp: 1280 },
      troops: { soldier: 10, sergeant: 10, staffSergeant: 10 },
      equipment: [{ id: "artillery", level: 0 }, { id: "tank", level: 0 }, { id: "selfPropelled", level: 10 }],
    });
    const target = canvas(), view = { elapsed: 0, sides: { player: side(), enemy: side() }, effects: [] };
    drawBattle(target, view);
    const staticSurfaces = created;
    assert.ok(staticSurfaces > 1);
    assert.ok(target.width >= 360 && target.height >= 560);
    view.sides.player.hq.hp = 1200;
    view.elapsed = 100;
    view.effects = [{ at: 0, side: "player", kind: "infantry" }];
    drawBattle(target, view);
    assert.equal(created, staticSurfaces, "HP and bullets reuse cached terrain and sprites");
    assert.equal(strokes, 30, "every selected infantry member fires");
    view.elapsed = 1000;
    drawBattle(target, view);
    assert.equal(strokes, 30, "expired effects are not drawn");
    view.sides.player.equipment[1].level = 1;
    drawBattle(target, view);
    assert.equal(created, staticSurfaces + 2, "a changed upgrade rebuilds only its sprite and the static field");
    const beforeGhost = strokes;
    view.elapsed = 0;
    view.effects = [{ at: -1, side: "enemy", kind: "infantry" }];
    drawBattle(target, view);
    assert.equal(strokes, beforeGhost, "unfired units do not flash on first frame");
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
