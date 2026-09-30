import { artSurface, vehicleDetails } from "./pixel-detail.js";
// Original fictional helicopter, drawn from rectangles. Callers cache by level/side.
const painter = c => (x, y, w, h, color) => {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
};
export function helicopterSprite(level) {
  const canvas = artSurface(110,62), c = canvas.getContext("2d");
  // Mirror geometry once at sprite creation; previews and home share the cached result.
  const mirrored = {set fillStyle(value){c.fillStyle=value;},fillRect(x,y,w,h){c.fillRect(110-x-w,y,w,h);}};
  const r = painter(mirrored);
  const dark = "#304b49", body = "#668979", light = "#b6cbb0";
  r(14, 53, 80, 3, "#253c3544");
  r(17, 47, 4, 6, dark); r(60, 45, 4, 8, dark);
  r(12, 52, 63, 3, dark);
  r(51, 27, 48, 7, dark); r(64, 25, 35, 6, body);
  r(92, 13, 5, 24, dark); r(89, 14, 9, 4, light);
  r(85, 32, 17, 3, light);
  r(22, 24, 41, 23, dark); r(14, 30, 16, 12, dark);
  r(18, 28, 38, 15, body); r(27, 24, 29, 4, light);
  r(13, 34, 14, 8, body);
  r(19, 29, 10, 7, "#91c6cd"); r(31, 27, 10, 9, "#77a8b7");
  r(19, 29, 10, 2, "#d1e3ce");
  r(11, 42, 10, 3, dark); r(8, 44, 12, 2, dark);
  r(31, 17, 24, 6, body); r(40, 10, 4, 8, dark);
  r(6, 8, 82, 3, dark); r(9, 8, 76, 1, light);
  r(39, 6, 6, 7, light);
  r(39, 37, 31, 4, dark);
  if (level >= 1) r(13, 39, 13, 3, light);
  if (level >= 2) { r(48, 39, 18, 7, dark); r(50, 40, 13, 2, light); }
  if (level >= 3) { r(88, 20, 14, 3, body); r(96, 18, 2, 10, light); }
  if (level >= 4) { r(26, 39, 16, 7, body); r(26, 39, 16, 2, light); }
  if (level >= 5) { r(40, 46, 28, 3, light); r(39, 46, 4, 3, "#dec791"); }
  if (level >= 6) { r(30, 16, 26, 6, dark); r(32, 16, 22, 2, light); }
  if (level >= 7) { r(9, 30, 5, 5, dark); r(9, 30, 3, 2, "#9cdae2"); }
  if (level >= 8) { r(46, 29, 8, 4, dark); r(66, 26, 8, 3, light); }
  if (level >= 9) { r(55, 11, 2, 15, light); r(53, 12, 6, 2, body); }
  if (level >= 10) { r(26, 23, 28, 2, "#e8cf83"); r(32, 37, 3, 6, "#e8cf83"); }
  for (let n = 0; n < level; n++) r(7 + n * 4, 59, 3, 2, "#d6c68c");
  vehicleDetails(mirrored,"helicopter",level);
  return canvas;
}
export function drawOverheadHelicopter(c, level, p) {
  const r = painter(c);
  r(25, 37, 6, 26, p.dark); r(26, 40, 3, 21, p.body);
  r(16, 57, 24, 3, p.light); r(27, 53, 2, 12, p.dark);
  r(19, 16, 18, 29, p.dark); r(21, 13, 14, 30, p.body);
  r(24, 8, 8, 8, p.light); r(24, 13, 8, 10, "#85b7be");
  r(9, 32, 38, 5, p.dark); r(7, 30, 7, 13, p.body); r(42, 30, 7, 13, p.body);
  r(25, 3, 5, 6, p.dark);
  if (level >= 2) { r(8, 30, 3, 10, p.light); r(45, 30, 3, 10, p.light); }
  if (level >= 5) { r(15, 30, 3, 15, p.light); r(38, 30, 3, 15, p.light); }
  if (level >= 7) r(25, 5, 6, 4, "#a0dbe1");
  r(2, 25, 52, 3, p.dark); r(3, 25, 50, 1, p.light);
  r(27, 4, 2, 49, p.dark); r(25, 23, 6, 7, p.light);
}
