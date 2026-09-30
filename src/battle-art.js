import { drawOverheadHelicopter } from "./helicopter-art.js";
import { UNITS } from "./units.js";

// Original overhead pixel art. The controller owns the animation clock.
export const BATTLE_CANVAS_SIZE = Object.freeze({ width: 360, height: 560 });
const W = BATTLE_CANVAS_SIZE.width, H = BATTLE_CANVAS_SIZE.height;
const scenes = new WeakMap(), sprites = new Map();
const number = new Intl.NumberFormat("ko-KR");
const palettes = {
  player: { dark: "#273f36", body: "#688768", light: "#a6bea0", mark: "#e2ead3", flag: "#8dbbbb" },
  enemy: { dark: "#694947", body: "#bc8480", light: "#e4b8ad", mark: "#f9d7ca", flag: "#cd7c79" },
};
function rect(c, x, y, w, h, color) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function surface(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  return canvas;
}
function emblem(c, x, y, side, size = 1) {
  const p = palettes[side];
  if (side === "enemy") {
    rect(c, x + 2 * size, y, 2 * size, 2 * size, p.mark);
    rect(c, x, y + 2 * size, 6 * size, 2 * size, p.mark);
    rect(c, x + 2 * size, y + 4 * size, 2 * size, 2 * size, p.mark);
    rect(c, x + 2 * size, y + 2 * size, 2 * size, 2 * size, p.dark);
  } else {
    rect(c, x, y, 2 * size, 6 * size, p.mark);
    rect(c, x + 4 * size, y, 2 * size, 6 * size, p.mark);
  }
}
function terrain(c) {
  let seed = 419;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  rect(c, 0, 0, W, H, "#6d775e");
  rect(c, 30, 0, 300, H, "#9e9a7d");
  rect(c, 125, 0, 110, H, "#aaa38a");
  for (let i = 0; i < 2100; i++) {
    const x = rand() * W, y = rand() * H;
    rect(c, x, y, 1 + rand() * 3, 1 + rand(), x < 30 || x > 330
      ? ["#788062", "#5d6b53", "#8b916f"][i % 3]
      : ["#9b977e", "#b1aa8c", "#a39e81"][i % 3]);
  }
  for (let y = 16; y < H; y += 48) {
    for (const x of [6, W - 21]) {
      rect(c, x + 2, y + 4, 14, 18, "#3e524433");
      rect(c, x, y + 4, 15, 10, "#425c48");
      rect(c, x + 3, y, 9, 18, "#4c6850");
      rect(c, x + 3, y + 1, 8, 6, "#6b805a");
    }
  }
  // Broken earthen defenses mark the front without copying another game's map.
  for (const y of [265, 289]) for (const x of [43, 77, 255, 289]) {
    rect(c, x, y + 3, 25, 5, "#5f665255");
    rect(c, x, y, 24, 5, "#c0b496");
    rect(c, x + 2, y, 20, 2, "#d1c7a8");
  }
  for (const [x, y] of [[99, 278], [254, 269], [221, 311], [136, 245]]) {
    rect(c, x, y + 2, 9, 4, "#817f66");
    rect(c, x + 2, y, 5, 3, "#77745d");
  }
}
function infantrySprite(id, side) {
  const key = `unit:${side}:${id}`;
  if (sprites.has(key)) return sprites.get(key);
  const canvas = surface(14, 19), c = canvas.getContext("2d"), p = palettes[side];
  rect(c, 2, 7, 11, 10, "#28372844");
  rect(c, 3, 12, 3, 5, p.dark); rect(c, 8, 12, 3, 5, p.dark);
  rect(c, 2, 7, 10, 7, p.body); rect(c, 1, 8, 2, 4, p.light);
  rect(c, 9, 0, 2, 11, "#293b38"); rect(c, 8, 6, 4, 3, "#394c43");
  const officer = id !== "soldier";
  rect(c, officer ? 3 : 4, 3, officer ? 7 : 6, 6, officer ? p.dark : p.body);
  rect(c, 4, 2, 5, 2, p.light); rect(c, 4, 4, 4, 2, officer ? "#708990" : p.light);
  if (side === "enemy") rect(c, 2, 4, 2, 3, p.light);
  if (officer) rect(c, 3, 11, 2, 1, "#edd092");
  if (id === "staffSergeant") { rect(c, 7, 11, 3, 1, "#edd092"); rect(c, 1, 12, 2, 4, p.dark); }
  const unit=UNITS[id];
  if(unit?.school) {
    rect(c,4,3,5,2,side==='enemy'?p.body:unit.color);
    for(let i=0;i<unit.schoolLevel;i++)rect(c,3+i*2,10,1,2,unit.school==='officer'?'#edf2dd':'#edd092');
    if(unit.school==='officer')rect(c,5,2,3,1,'#edf2dd');
  }
  sprites.set(key, canvas);
  return canvas;
}
function equipmentSprite(id, level, side) {
  const key = `gear:${side}:${id}:${level}`;
  if (sprites.has(key)) return sprites.get(key);
  const canvas = surface(56, 68), c = canvas.getContext("2d"), p = palettes[side];
  rect(c, 12, 30, 36, 31, "#22392c44");
  if (id === "helicopter") {
    drawOverheadHelicopter(c, level, p);
  } else if (id === "artillery") {
    rect(c, 15, 42, 5, 20, p.dark); rect(c, 36, 42, 5, 20, p.dark);
    rect(c, 10, 58, 10, 4, p.body); rect(c, 36, 58, 10, 4, p.body);
    rect(c, 7, 33, 8, 14, "#293934"); rect(c, 41, 33, 8, 14, "#293934");
    rect(c, 10, 36, 3, 8, p.light); rect(c, 43, 36, 3, 8, p.light);
    rect(c, 14, 29, 28, 16, p.dark); rect(c, 16, 29, 24, 11, p.body);
    rect(c, 15, 27, 26, 4, p.light); rect(c, 24, 34, 9, 15, p.body);
    rect(c, 25, 5, 6, 29, p.dark); rect(c, 26, 5, 2, 27, p.light);
  } else {
    const spg = id === "selfPropelled", rear = spg ? 61 : 56;
    rect(c, 8, 22, 9, rear - 18, "#2a3833"); rect(c, 39, 22, 9, rear - 18, "#2a3833");
    for (let y = 25; y < rear; y += 5) {
      rect(c, 9, y, 7, 2, "#667166"); rect(c, 40, y, 7, 2, "#667166");
    }
    rect(c, 16, 22, 24, rear - 22, p.dark); rect(c, 18, 22, 20, rear - 25, p.body);
    rect(c, 19, 22, 18, 3, p.light); rect(c, 20, rear - 9, 16, 4, p.dark);
    rect(c, spg ? 17 : 20, spg ? 32 : 29, spg ? 22 : 16, spg ? 19 : 16, p.dark);
    rect(c, spg ? 19 : 22, spg ? 32 : 28, spg ? 18 : 12, spg ? 16 : 14, p.light);
    rect(c, 25, spg ? 1 : 9, 6, spg ? 34 : 24, p.dark);
    rect(c, 26, spg ? 1 : 9, 2, spg ? 34 : 23, p.light);
    rect(c, 23, spg ? 41 : 35, 9, 6, p.body);
    if (side === "enemy") { rect(c, 15, 19, 26, 3, p.dark); rect(c, 17, 22, 3, 6, p.light); }
  }
  // Each adjacent enhancement adds one visible armor/detail block.
  for (let i = 0; i < level; i++) {
    const x = i % 2 ? 36 : 17, y = 24 + Math.floor(i / 2) * 5;
    rect(c, x, y, 4, 3, i >= 8 ? "#e0c98c" : p.light);
  }
  if (level >= 4) rect(c, 24, 5, 8, 3, p.body);
  if (level >= 7) { rect(c, 38, 10, 1, 23, p.light); rect(c, 36, 11, 5, 2, p.flag); }
  emblem(c, 25, 47, side);
  sprites.set(key, canvas);
  return canvas;
}
function headquartersSprite(id, side) {
  const key = `hq:${side}:${id}`;
  if (sprites.has(key)) return sprites.get(key);
  const tier = Math.max(0, ["battalion", "regiment", "division", "corps", "fieldArmy"].indexOf(id));
  const w = 62 + tier * 10, h = 42 + tier * 5, canvas = surface(w + 18, h + 12);
  const c = canvas.getContext("2d"), p = palettes[side];
  rect(c, 5, 6, w + 3, h + 2, "#26372d55");
  rect(c, 2, 2, w, h, p.dark); rect(c, 5, 5, w - 6, h - 6, p.body);
  rect(c, 5, 5, w - 6, 3, p.light); rect(c, 5, 7, 3, h - 8, p.light);
  rect(c, 12, 12, w - 23, h - 21, p.dark); rect(c, 14, 14, w - 27, h - 25, p.body);
  for (let col = 0; col <= tier + 1; col++) {
    rect(c, 15 + col * 13, 15, 8, 6, p.light); rect(c, 16 + col * 13, 16, 6, 2, "#5a7675");
  }
  rect(c, 14, h - 13, 13, 6, p.light); rect(c, 16, h - 12, 9, 4, p.dark);
  emblem(c, w / 2 - 3, h / 2, side, tier > 2 ? 2 : 1);
  rect(c, w + 7, 0, 2, 25, p.dark); rect(c, w + 9, 1, 8, 7, p.flag);
  if (side === "enemy") rect(c, w - 5, h - 16, 8, 12, p.dark);
  else rect(c, -0, h - 13, 9, 8, p.light);
  sprites.set(key, canvas);
  return canvas;
}
function unitPositions(troops, side) {
  const kinds = Object.keys(UNITS).filter(id => troops?.[id]>0), positions = [];
  kinds.forEach((id, row) => {
    const count = Math.min(10, Math.max(0, troops?.[id] ?? 0));
    for (let i = 0; i < count; i++) {
      const x = (W / (Math.min(3,kinds.length) + 1)) * (row % 3 + 1) - 26 + (i % 5) * 13;
      const y = (kinds.length>3?181:208) + Math.floor(row/3)*44 + Math.floor(i / 5) * 21;
      positions.push({ id, x, y: side === "enemy" ? y : H - y });
    }
  });
  return positions;
}
function signature(view) {
  return ["player", "enemy"].map((side) => {
    const s = view.sides[side];
    return `${side}:${s.hq.id}:${Object.keys(UNITS).map((id) => s.troops?.[id] ?? 0).join(",")}:${s.equipment.map((g) => `${g.id}/${g.level}`).join(",")}`;
  }).join("|");
}
function createScene(view) {
  const canvas = surface(W, H), c = canvas.getContext("2d"), points = {};
  terrain(c);
  for (const side of ["enemy", "player"]) {
    const s = view.sides[side], enemy = side === "enemy", y = enemy ? 76 : H - 76;
    const hq = headquartersSprite(s.hq.id, side);
    rect(c, W / 2 - 65, y - 34, 130, 69, enemy ? "#ba8b8226" : "#4f7b6326");
    c.drawImage(hq, Math.round(W / 2 - hq.width / 2), Math.round(y - hq.height / 2));
    points[side] = { hq: { x: W / 2, y }, infantry: unitPositions(s.troops, side), equipment: [] };
    for (const p of points[side].infantry) {
      c.save(); c.translate(p.x, p.y); if (enemy) c.rotate(Math.PI);
      c.drawImage(infantrySprite(p.id, side), -7, -9); c.restore();
    }
    s.equipment.forEach((g, i) => {
      const p = { id: g.id, x: (W / (s.equipment.length + 1)) * (i + 1), y: enemy ? 145 : H - 145 };
      points[side].equipment.push(p);
      c.save(); c.translate(p.x, p.y); if (enemy) c.rotate(Math.PI);
      c.drawImage(equipmentSprite(g.id, g.level, side), -28, -34); c.restore();
    });
  }
  return { canvas, points, key: signature(view) };
}
function health(c, hq, side) {
  const y = side === "enemy" ? 12 : H - 32, fraction = Math.max(0, Math.min(1, hq.hp / hq.maxHp));
  rect(c, 72, y - 5, 216, 29, "#1e302edb");
  rect(c, 78, y + 12, 204, 5, "#111f1c");
  rect(c, 78, y + 12, 204 * fraction, 5, side === "enemy" ? "#dd9690" : "#b9cf9a");
  c.textAlign = "center"; c.textBaseline = "top";
  c.font = "bold 10px system-ui, sans-serif"; c.fillStyle = "#f1ecda";
  c.fillText(`${hq.name} 본부  ${number.format(Math.ceil(hq.hp))} / ${number.format(hq.maxHp)}`, W / 2, y - 1);
}
function fire(c, scene, effect, elapsed) {
  if (!Number.isFinite(effect.at) || effect.at < 0) return;
  const age = elapsed - effect.at, infantry = effect.kind === "infantry" || Object.hasOwn(UNITS, effect.kind);
  const duration = infantry ? 280 : 560;
  if (age < 0 || age >= duration || !scene.points[effect.side]) return;
  const source = scene.points[effect.side], target = scene.points[effect.side === "player" ? "enemy" : "player"].hq;
  const shooters = infantry
    ? source.infantry.filter((p) => effect.kind === "infantry" || effect.kind === p.id)
    : source.equipment.filter((p) => p.id === effect.kind);
  const progress = Math.min(1, age / (duration * 0.76));
  const color = effect.side === "player" ? "#ffe4a0" : "#ffd1bd";
  c.save();
  for (let i = 0; i < shooters.length; i++) {
    const p = shooters[i], offset = (i % 5 - 2) * 3;
    const dx = target.x + offset - p.x, dy = target.y - p.y;
    c.globalAlpha = 1 - age / duration;
    if (progress < 1) {
      const x = p.x + dx * progress, y = p.y + dy * progress;
      c.strokeStyle = color; c.lineWidth = infantry ? 1 : 3;
      c.beginPath(); c.moveTo(x - dx * 0.045, y - dy * 0.045); c.lineTo(x, y); c.stroke();
      rect(c, x - 1, y - 2, infantry ? 2 : 4, infantry ? 3 : 5, "#fff4cd");
    } else {
      const radius = infantry ? 3 : 10;
      rect(c, target.x + offset - radius, target.y - 2, radius * 2, 4, color);
      rect(c, target.x + offset - 2, target.y - radius, 4, radius * 2, "#fff1c5");
    }
    if (age < 75) rect(c, p.x - 2, p.y + (effect.side === "player" ? -12 : 12), 4, 5, color);
  }
  c.restore();
}

/** view: {elapsed: ms, sides: {player, enemy}, effects: [{at, side, kind}]}. */
export function drawBattle(canvas, view) {
  const dpr = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));
  const scale = Math.min(1.5, Math.max(0.5, (canvas.clientWidth || W) / W)) * dpr;
  const pixelW = Math.round(W * scale), pixelH = Math.round(H * scale);
  if (canvas.width !== pixelW || canvas.height !== pixelH) { canvas.width = pixelW; canvas.height = pixelH; }
  const c = canvas.getContext("2d");
  if (!c) return;
  let scene = scenes.get(canvas);
  if (!scene || scene.key !== signature(view)) { scene = createScene(view); scenes.set(canvas, scene); }
  c.setTransform(pixelW / W, 0, 0, pixelH / H, 0, 0); c.imageSmoothingEnabled = false;
  c.drawImage(scene.canvas, 0, 0);
  for (const effect of (view.effects ?? []).slice(-40)) fire(c, scene, effect, view.elapsed);
  health(c, view.sides.enemy.hq, "enemy"); health(c, view.sides.player.hq, "player");
}
