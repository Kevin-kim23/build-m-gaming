import { helicopterSprite } from "./helicopter-art.js";
import { equipmentStats } from "./equipment.js";
const sprites = new Map(),
  painted = new WeakMap();
function sprite(level, id = "artillery") {
  equipmentStats(level, id);
  const key = id + ":" + level;
  if (sprites.has(key)) return sprites.get(key);
  if (id !== "artillery") {
    const vehicle = id === "helicopter" ? helicopterSprite(level) : vehicleSprite(level, id);
    sprites.set(key, vehicle);
    return vehicle;
  }
  const c = document.createElement("canvas");
  c.width = 110;
  c.height = 62;
  const x = c.getContext("2d"),
    r = (a, b, w, h, color) => {
      x.fillStyle = color;
      x.fillRect(a, b, w, h);
    };
  const hull = level >= 8 ? "#6c8580" : level >= 4 ? "#6e7f59" : "#778059",
    metal = level >= 6 ? "#b1bdad" : "#979e82";
  r(12, 52, 83, 4, "#16251c55");
  // Split trails, wheels, shield, breech and a single long barrel: original pixel geometry.
  r(12, 43, 43, 5, "#3d503b");
  r(8, 47, 19, 4, "#526343");
  r(16, 40, 12, 5, hull);
  r(49, 39, 36, 6, "#3e5141");
  r(45, 45, 37, 5, "#667555");
  for (const wheel of [40, 69]) {
    r(wheel, 42, 15, 14, "#202f2c");
    r(wheel + 2, 40, 11, 18, "#273a33");
    r(wheel + 3, 44, 9, 10, "#69765e");
    r(wheel + 6, 46, 3, 6, metal);
  }
  const shield = 20 + Math.min(level, 8);
  r(45, 22, shield, 21, "#3d5541");
  r(47, 20, shield - 4, 21, hull);
  r(48, 21, shield - 6, 2, metal);
  r(55, 28, 22, 9, "#52684b");
  r(58, 27, 18, 2, metal);
  r(64, 26, 27 + level, 5, "#334b3c");
  r(64, 25, 27 + level, 2, metal);
  r(89 + level, 24, 5, 8, "#3e5448");
  if (level >= 1) {
    r(67, 24, 10, 8, "#637b66");
    r(67, 24, 10, 2, "#b6c2a7");
  }
  if (level >= 2) {
    r(88 + level, 23, 8, 10, "#788d78");
    r(92 + level, 25, 2, 6, "#263d38");
  }
  if (level >= 3) {
    r(43, 24, 4, 17, "#8a956e");
    r(45, 24, 2, 17, "#b3b992");
  }
  if (level >= 4) {
    for (const wheel of [40, 69]) {
      r(wheel + 1, 41, 13, 3, "#a1ad8c");
      r(wheel + 1, 53, 13, 3, "#718468");
    }
  }
  if (level >= 5) {
    r(22, 50, 13, 5, "#97a17d");
    r(19, 53, 20, 3, "#3e5745");
    r(83, 45, 7, 8, "#8f9e7d");
  }
  if (level >= 6) {
    r(47, 34, 20, 6, "#506960");
    r(50, 34, 13, 2, "#c2c9ae");
  }
  if (level >= 7) {
    r(52, 14, 3, 10, "#415d51");
    r(49, 13, 10, 5, "#a3b9ad");
    r(55, 14, 3, 3, "#608f94");
  }
  if (level >= 8) {
    r(49, 27, 8, 4, "#425e56");
    r(60, 22, 5, 4, "#bac4a5");
    r(54, 33, 6, 3, "#95ad92");
  }
  if (level >= 9) {
    r(40, 6, 2, 27, "#bcc9b5");
    r(37, 8, 8, 2, "#6c9c95");
    r(38, 31, 7, 8, "#597366");
  }
  if (level >= 10) {
    r(47, 20, 24, 2, "#dfc987");
    r(56, 29, 3, 5, "#efd78f");
    r(54, 30, 7, 2, "#efd78f");
    r(80, 25, 10, 2, "#e2c378");
    r(23, 43, 10, 2, "#c6b172");
  }
  // Visible upgrade ticks also distinguish every adjacent level.
  for (let n = 0; n < level; n++) r(7 + n * 4, 59, 3, 2, "#d6c68c");
  sprites.set(key, c);
  return c;
}
// Reuse the same cached sprite in the field, excluding the preview's upgrade ticks.
export function drawEquipmentOnGround(
  ctx,
  level,
  x,
  y,
  width,
  height,
  id = "artillery",
) {
  const asset = sprite(level, id);
  ctx.drawImage(asset, 0, 0, asset.width, 58, x, y, width, height);
}
export function drawEquipment(canvas, level, id = "artillery") {
  const key = id + ":" + level + ":" + canvas.width + ":" + canvas.height;
  if (painted.get(canvas) === key) return false;
  const asset = sprite(level, id),
    ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  const scale = Math.min(
    canvas.width / asset.width,
    canvas.height / asset.height,
  );
  const w = Math.round(asset.width * scale),
    h = Math.round(asset.height * scale);
  ctx.drawImage(
    asset,
    Math.floor((canvas.width - w) / 2),
    Math.floor((canvas.height - h) / 2),
    w,
    h,
  );
  painted.set(canvas, key);
  return true;
}

// Original tracked silhouettes: compact turret for tank, tall rear casemate and long barrel for SPG.
function vehicleSprite(level, id) {
  const canvas = document.createElement("canvas");
  canvas.width = 110;
  canvas.height = 62;
  const c = canvas.getContext("2d");
  const r = (x, y, w, h, color) => {
    c.fillStyle = color;
    c.fillRect(x, y, w, h);
  };
  const spg = id === "selfPropelled",
    hull = spg ? "#777c69" : "#738050",
    light = level >= 8 ? "#b1bfa3" : "#a2ac7a",
    dark = spg ? "#475454" : "#3d5437";
  r(8, 52, 91, 4, "#283a2c55");
  r(10, 39, 82, 15, "#26382f");
  r(13, 37, 76, 19, "#314238");
  for (let x = 17; x < 88; x += 13) {
    r(x, 41, 10, 11, "#66725b");
    r(x + 2, 43, 6, 7, "#8b967b");
    r(x + 4, 45, 2, 3, "#374d40");
  }
  r(8, 33, 83, 10, dark);
  r(14, 30, 72, 10, hull);
  r(16, 30, 67, 2, light);
  const ty = spg ? 13 : 22,
    th = spg ? 20 : 12;
  r(24, ty, spg ? 39 : 42, th, dark);
  r(27, ty - 2, spg ? 34 : 35, th, hull);
  r(29, ty - 2, 29, 2, light);
  const barrel = spg ? 48 : 34;
  r(54, ty + 4, barrel + Math.floor(level / 2), 5, dark);
  r(54, ty + 3, barrel + Math.floor(level / 2), 2, light);
  if (level >= 1) r(55, ty + 2, 12, 8, "#607760");
  if (level >= 2) {
    r(54 + barrel - 2, ty + 1, 7, 9, "#829781");
    r(57 + barrel - 2, ty + 3, 2, 5, "#263f36");
  }
  if (level >= 3) r(22, ty + 2, 5, th - 2, light);
  if (level >= 4) {
    r(10, 38, 80, 4, hull);
    r(12, 38, 76, 1, light);
  }
  if (level >= 5) {
    r(10, 31, 8, 5, light);
    r(83, 31, 7, 5, light);
  }
  if (level >= 6) {
    r(29, ty + 8, 27, 6, "#4d675b");
    r(32, ty + 8, 21, 2, light);
  }
  if (level >= 7) {
    r(36, ty - 8, 3, 7, dark);
    r(34, ty - 9, 10, 4, "#a8b9ab");
    r(40, ty - 8, 3, 2, "#609697");
  }
  if (level >= 8) {
    r(18, 32, 10, 5, "#405c4b");
    r(47, ty + 2, 9, 4, "#bdc5a8");
    r(62, 33, 15, 4, "#445f51");
  }
  if (level >= 9) {
    r(20, 3, 2, 28, "#c2ceb8");
    r(17, 5, 8, 2, "#629a8b");
  }
  if (level >= 10) {
    r(28, ty - 2, 30, 2, "#e4cf8b");
    r(43, ty + 3, 3, 7, "#ebd78c");
    r(41, ty + 5, 7, 2, "#ebd78c");
    r(68, ty + 3, 14, 2, "#dac37d");
  }
  for (let n = 0; n < level; n++) r(7 + n * 4, 59, 3, 2, "#d6c68c");
  return canvas;
}
