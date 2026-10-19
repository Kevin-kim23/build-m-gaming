// Conquest-road backgrounds, drawn in code (no outside images): 아스테라 작전 지형도, 에테리온 궤도 항법도,
// 에레보스 심연 균열. Each continent's tile is painted once, cached as an image URL and repeated down the road.
// Every layer wraps vertically (noise period, sine periods and decorations all repeat every TILE_H),
// so stacked tiles show no seam.
import { reportError } from './diagnostics.js';

export const TILE_W = 360, TILE_H = 640;
export const ROAD_ART = Object.freeze({ earth: 'topo', space: 'orbit', abyss: 'fissure' });

const mulberry = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const smooth = t => t * t * (3 - 2 * t);
// Value noise on a grid that repeats every `rows` cells vertically.
function noise(rnd, cols, rows) {
  const g = Array.from({ length: rows * cols }, rnd);
  const at = (x, y) => g[((y % rows + rows) % rows) * cols + ((x % cols + cols) % cols)];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}
// Fractal noise; `cells` = grid cells across one tile height for the first octave (keeps the tile periodic).
function fbm(rnd, cells, octaves) {
  const layers = Array.from({ length: octaves }, (_, i) => {
    const rows = cells * 2 ** i;
    return { n: noise(rnd, Math.ceil(rows * TILE_W / TILE_H) + 2, rows), k: rows / TILE_H, a: 0.5 ** i };
  });
  const total = layers.reduce((s, l) => s + l.a, 0);
  return (x, y) => layers.reduce((s, l) => s + l.n(x * l.k, y * l.k) * l.a, 0) / total;
}
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * Math.min(1, Math.max(0, t)));
function field(ctx, fn, step = 2) {
  const w = Math.ceil(TILE_W / step), h = Math.ceil(TILE_H / step), img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b] = fn(x * step, y * step), i = (y * w + x) * 4;
    img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  const off = ctx.canvas.ownerDocument.createElement('canvas'); off.width = w; off.height = h;
  off.getContext('2d').putImageData(img, 0, 0);
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(off, 0, 0, TILE_W, TILE_H); ctx.restore();
}
// Draw something at y and at y ± TILE_H so shapes crossing an edge continue on the next tile.
const wrapped = (ctx, draw) => { for (const dy of [-TILE_H, 0, TILE_H]) { ctx.save(); ctx.translate(0, dy); draw(); ctx.restore(); } };
const wave = (y, turns) => Math.sin(y / TILE_H * Math.PI * 2 * turns);

const PAINTERS = {
  // A1 작전 지형도: muted khaki relief with contour lines, map grid, one river and forest marks.
  topo(ctx, rnd) {
    const n = fbm(rnd, 5, 4);
    field(ctx, (x, y) => {
      const v = n(x, y), band = Math.floor(v * 14);
      const edge = Math.floor(n(x + 2, y) * 14) !== band || Math.floor(n(x, y + 2) * 14) !== band;
      const c = v < .34 ? mix([58, 86, 92], [80, 104, 96], v / .34) : mix([92, 104, 70], [150, 140, 100], (v - .3) / .5);
      return edge ? c.map(k => k * .72) : c;
    });
    ctx.strokeStyle = 'rgba(30,36,24,.28)'; ctx.lineWidth = 1; ctx.font = '600 8px system-ui'; ctx.fillStyle = 'rgba(30,36,24,.55)';
    for (let x = 0; x <= TILE_W; x += 60) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, TILE_H); ctx.stroke(); }
    for (let y = 0, i = 0; y < TILE_H; y += 64, i++) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(TILE_W, y + .5); ctx.stroke(); ctx.fillText(String(40 + i).padStart(2, '0'), 3, y + 10); }
    ctx.strokeStyle = 'rgba(70,120,140,.75)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath();
    for (let y = 0; y <= TILE_H; y += 4) { const x = TILE_W * .76 + wave(y, 2) * 28 + wave(y, 7) * 6; y ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    const trees = Array.from({ length: 220 }, () => [rnd() * TILE_W, rnd() * TILE_H, 1.6 + rnd()]).filter(([x, y]) => { const v = n(x, y); return v > .52 && v < .62; });
    ctx.fillStyle = 'rgba(40,62,34,.55)';
    wrapped(ctx, () => trees.forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }));
  },
  // B2 궤도 항법도: navy chart grid, dashed orbit rings (two systems one tile apart), shaded planets.
  orbit(ctx, rnd) {
    ctx.fillStyle = '#0b1328'; ctx.fillRect(0, 0, TILE_W, TILE_H);
    ctx.strokeStyle = 'rgba(120,160,220,.07)'; ctx.lineWidth = 1;
    for (let x = 0; x <= TILE_W; x += 30) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, TILE_H); ctx.stroke(); }
    for (let y = 0; y < TILE_H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(TILE_W, y + .5); ctx.stroke(); }
    wrapped(ctx, () => {
      for (let i = 1; i < 14; i++) {
        ctx.strokeStyle = `rgba(150,190,255,${i % 3 ? .12 : .26})`; ctx.setLineDash(i % 2 ? [6, 6] : []);
        ctx.beginPath(); ctx.ellipse(-TILE_W * .35, TILE_H * .5, i * 50, i * 46, 0, 0, 7); ctx.stroke();
      }
      ctx.setLineDash([]);
    });
    const planet = (x, y, r, light, dark) => {
      const g = ctx.createRadialGradient(x - r * .4, y - r * .4, r * .1, x, y, r); g.addColorStop(0, light); g.addColorStop(1, dark);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    };
    planet(TILE_W * .95, TILE_H * .2, 50, '#4a6fa8', '#101a33'); planet(TILE_W * .1, TILE_H * .78, 22, '#8a6fb0', '#1a1430');
    const stars = Array.from({ length: 150 }, () => [rnd() * TILE_W, rnd() * TILE_H, .2 + rnd() * .5]);
    stars.forEach(([x, y, a]) => { ctx.fillStyle = `rgba(220,230,255,${a})`; ctx.fillRect(x, y, 1, 1); });
  },
  // C1 심연 균열 (detailed): basalt plates (Voronoi cells) with fine strata and shading; the seams between plates
  // are cracks, molten where the heat noise is high (white-hot core, red halo) and dark elsewhere.
  // Sparks and a cold mist sit on top so the stage buttons stay the brightest thing on screen.
  fissure(ctx, rnd) {
    const n = fbm(rnd, 5, 5), heat = fbm(rnd, 3, 3), grain = fbm(rnd, 24, 2);
    const seeds = Array.from({ length: 26 }, () => [rnd() * TILE_W, rnd() * TILE_H]);
    const points = seeds.flatMap(([x, y]) => [[x, y], [x, y - TILE_H], [x, y + TILE_H]]);
    field(ctx, (x, y) => {
      let d1 = Infinity, d2 = Infinity, cell = 0;
      points.forEach(([px, py], k) => { const d = Math.hypot(x - px, y - py); if (d < d1) { d2 = d1; d1 = d; cell = k; } else if (d < d2) d2 = d; });
      const edge = d2 - d1, v = n(x, y), h = Math.max(0, (heat(x, y) - .42) * 2.4), tone = (cell * 37 % 11) / 11;
      let c = mix([18, 9, 15], [52, 22, 36], v * .8 + tone * .25 + grain(x, y) * .15);
      if (Math.abs(Math.sin((y + v * 80) / 7)) < .07) c = c.map(k => k * .8);
      c = mix(c, [8, 3, 6], Math.max(0, 1 - d1 / 70) * .15);
      if (edge < 12) c = mix(c, [230, 50, 40], (1 - edge / 12) ** 2 * Math.min(1, h) * .7);
      if (edge < 1.8) c = h > .2 ? mix([240, 90, 40], [255, 214, 140], Math.min(1, h * .9)) : [10, 4, 7];
      return c;
    }, 1);
    const sparks = Array.from({ length: 70 }, () => [rnd() * TILE_W, rnd() * TILE_H, rnd()]);
    sparks.forEach(([x, y, a]) => { ctx.fillStyle = `rgba(255,${150 + a * 80},${120 + a * 60},${.2 + a * .45})`; ctx.fillRect(x, y, a > .85 ? 2 : 1, a > .85 ? 2 : 1); });
    const mist = fbm(rnd, 4, 3);
    ctx.globalAlpha = .3; field(ctx, (x, y) => mix([10, 6, 16], [40, 28, 54], mist(x, y)), 4); ctx.globalAlpha = 1;
  },
};
const SEEDS = { topo: 11, orbit: 53, fissure: 71 };
const canvases = new Map(), urls = new Map();

// The painted tile for a theme (cached), or null when the page cannot draw (tests, very old browsers).
// The battlefield floor reuses the same tile, so a continent looks the same on the road and in battle.
export function roadBackdropCanvas(theme, doc = globalThis.document) {
  const art = ROAD_ART[theme] ?? ROAD_ART.earth;
  if (canvases.has(art)) return canvases.get(art);
  let canvas = null;
  try {
    const surface = doc?.createElement?.('canvas'), ctx = surface?.getContext?.('2d');
    if (ctx) {
      const scale = Math.min(2, globalThis.devicePixelRatio || 1);
      surface.width = TILE_W * scale; surface.height = TILE_H * scale; ctx.scale(scale, scale);
      PAINTERS[art](ctx, mulberry(SEEDS[art]));
      canvas = surface;
    }
  } catch (error) { reportError('campaign.roadBackdrop', error); }
  canvases.set(art, canvas);
  return canvas;
}
export function roadBackdropUrl(theme, doc = globalThis.document) {
  const art = ROAD_ART[theme] ?? ROAD_ART.earth;
  if (!urls.has(art)) { const canvas = roadBackdropCanvas(theme, doc); urls.set(art, canvas ? canvas.toDataURL('image/jpeg', .86) : ''); }
  return urls.get(art);
}
export function paintRoadBackdrop(root, theme) {
  const node = root.querySelector('.road-backdrop'), url = roadBackdropUrl(theme);
  if (node && url) node.style.backgroundImage = `url("${url}")`;
}
