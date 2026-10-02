import { artSurface, brush, ART_SCALE } from './pixel-detail.js';
import { unitSprite, baseSprite, SPRITE_SIZE } from './unit-sprites.js';
import { fortressSprite } from './fortress-art.js';
import { BATTLE_RULES } from './battle-balance.js';

// 세로 레인 전장 그림(위에서 본 모습): 위쪽이 적 기지, 아래쪽이 우리 기지, 레인 3개가 위아래로 뻗는다.
// 정적인 배경·기지는 한 번 그려 캐시하고, 움직이는 것(장비·효과·체력 막대)만 매 프레임 그린다.
// 이름표·숫자는 화면의 HTML에서 표시한다(캔버스에 글자를 넣지 않는다).
export const LANE_CANVAS = Object.freeze({ width: 360, height: 440 });
const W = LANE_CANVAS.width, H = LANE_CANVAS.height;
export const LANE_CENTERS = Object.freeze([66, 180, 294]);
const Y_FRONT = 322, Y_BACK = 112; // 레인 위치 0(우리 기지 앞) ~ 1000(적 기지 앞)이 화면에서 차지하는 세로 범위
export const laneY = (pos) => Y_FRONT - (pos / BATTLE_RULES.laneLength) * (Y_FRONT - Y_BACK);
const scenes = new Map();

const THEMES = Object.freeze({
  serdin: { ground: '#6f9a4f', alt: '#7fae5a', road: '#b3a679', edge: '#8e8458', tuft: '#8dbb62', deco: '#4d7a3a' },
  veloc: { ground: '#a2704a', alt: '#b4835a', road: '#cdae78', edge: '#9a7b4e', tuft: '#b8814f', deco: '#7a4f33' },
  istra: { ground: '#6b9a82', alt: '#7aae94', road: '#b9b5a2', edge: '#8f8b7a', tuft: '#86bea0', deco: '#4f7a8a' },
  norgard: { ground: '#dfeaee', alt: '#eef5f7', road: '#b7c5cd', edge: '#8aa0ac', tuft: '#ffffff', deco: '#9bb4c0' },
});

function scene(countryId) {
  if (scenes.has(countryId)) return scenes.get(countryId);
  const t = THEMES[countryId] ?? THEMES.serdin, canvas = artSurface(W, H), c = canvas.getContext('2d'), r = brush(c);
  let seed = 11;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  r(0, 0, W, H, t.ground);
  for (let i = 0; i < 900; i++) r(rand() * W, rand() * H, 2 + rand() * 4, 1 + rand() * 2, i % 3 ? t.alt : t.tuft);
  for (const x of LANE_CENTERS) {
    r(x - 47, 0, 94, H, t.edge); r(x - 44, 0, 88, H, t.road);
    for (let i = 0; i < 160; i++) r(x - 44 + rand() * 88, rand() * H, 2 + rand() * 3, 1, i % 2 ? '#00000012' : '#ffffff18');
    for (let y = 20; y < H; y += 26) r(x - 1, y, 2, 12, '#ffffff33');       // 점선 중앙선
  }
  // 레인 사이 지형 장식(나무·바위·눈 더미)
  for (const x of [123, 237, 14, 346]) for (let y = 30; y < H - 20; y += 38 + Math.floor(rand() * 20)) {
    const s = 7 + Math.floor(rand() * 6);
    r(x - s / 2 + 2, y + 2, s, s, '#00000026'); r(x - s / 2, y, s, s, t.deco); r(x - s / 2 + 1, y + 1, s - 3, s - 3, t.alt);
  }
  scenes.set(countryId, canvas); return canvas;
}

function drawScaled(c, image, cx, cy, width) {
  const w = width, h = (image.height / image.width) * width;
  c.drawImage(image, Math.round(cx - w / 2), Math.round(cy - h / 2), Math.round(w), Math.round(h));
}
function drawBases(c, view) {
  const e = view.enemy;
  if (e.fortress) drawScaled(c, fortressSprite(e.fortress), W / 2, 56, 232);
  else { const eb = baseSprite(e.hq.id, 'enemy'); drawScaled(c, eb, W / 2, 56, Math.min(210, eb.width / ART_SCALE * 1.6)); }
  const pb = baseSprite(view.player.hq.id, 'player'); drawScaled(c, pb, W / 2, H - 52, Math.min(210, pb.width / ART_SCALE * 1.6));
}

function drawFx(c, view) {
  for (const f of view.fx) {
    const age = view.elapsed - f.at;
    if (age < 0 || age > 500) continue;
    c.save(); c.globalAlpha = 1 - age / 500;
    const lx = LANE_CENTERS[f.lane ?? 1];
    if (f.kind === 'shot') {
      const y0 = laneY(f.from), y1 = f.to >= 1000 ? 94 : f.to <= 0 ? H - 78 : laneY(f.to), t = Math.min(1, age / 220);
      const y = y0 + (y1 - y0) * t, trail = (y1 - y0) * 0.14;
      c.strokeStyle = f.side === 'player' ? '#ffe9a8' : '#ffc4a8'; c.lineWidth = f.id === 'turret' ? 2.4 : 1.6;
      c.beginPath(); c.moveTo(lx, y - trail); c.lineTo(lx, y); c.stroke();
      if (age > 180) { c.fillStyle = '#fff4cd'; c.fillRect(Math.round(lx) - 3, Math.round(y1) - 3, 6, 6); }
    } else if (f.kind === 'strike') {
      const t = Math.min(1, age / 320), y = H - 80 - (H - 190) * t;
      c.fillStyle = '#ffd9a0'; c.fillRect(W / 2 - 3, Math.round(y) - 6, 6, 12); c.fillStyle = '#ff9c5a'; c.fillRect(W / 2 - 2, Math.round(y) + 6, 4, 10);
      if (age > 300) { c.fillStyle = '#fff1c5'; c.fillRect(W / 2 - 22, 66, 44, 36); c.fillStyle = '#ff9c5a'; c.fillRect(W / 2 - 12, 74, 24, 20); }
    } else if (f.kind === 'death') {
      const y = laneY(f.from), r = 4 + age / 40;
      c.fillStyle = '#4a4440'; c.fillRect(Math.round(lx - r), Math.round(y - r - age / 30), Math.round(r * 2), Math.round(r * 2));
      c.fillStyle = '#ffb36a'; c.fillRect(Math.round(lx - r / 2), Math.round(y - r / 2 - age / 40), Math.round(r), Math.round(r));
    }
    c.restore();
  }
}

/** view: {elapsed, countryId, player:{hq,units}, enemy:{hq,units,fortress}, fx:[...]} */
export function drawLane(canvas, view) {
  const dpr = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));
  const scale = Math.min(1.5, Math.max(0.5, (canvas.clientWidth || W) / W)) * dpr;
  const pw = Math.round(W * scale), ph = Math.round(H * scale);
  if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
  const c = canvas.getContext('2d'); if (!c) return;
  c.setTransform(pw / W, 0, 0, ph / H, 0, 0); c.imageSmoothingEnabled = false;
  c.drawImage(scene(view.countryId), 0, 0, W, H);
  drawBases(c, view);
  const units = [...view.player.units, ...view.enemy.units].sort((a, b) => b.x * b.dir - a.x * a.dir || a.uid - b.uid);
  for (const u of units) {
    const air = u.cls === 'air', w = SPRITE_SIZE.width * 0.62, h = SPRITE_SIZE.height * 0.62;
    const cx = LANE_CENTERS[u.lane] + ((u.uid % 3) - 1) * 13, cy = laneY(u.x) + (air ? Math.sin(view.elapsed / 180 + u.uid) * 2 - 6 : 0);
    c.save(); c.translate(Math.round(cx), Math.round(cy));
    if (u.side === 'enemy') c.rotate(Math.PI);
    c.drawImage(unitSprite(u.id, u.side, u.level), Math.round(-w / 2), Math.round(-h / 2), Math.round(w), Math.round(h));
    c.restore();
    const bar = 22, frac = Math.max(0, Math.min(1, u.hp / u.maxHp)), by = Math.round(cy - h / 2 - 5);
    c.fillStyle = '#10181499'; c.fillRect(Math.round(cx - bar / 2), by, bar, 3);
    c.fillStyle = frac > 0.5 ? '#9be08f' : frac > 0.25 ? '#e8d27a' : '#e8998a'; c.fillRect(Math.round(cx - bar / 2), by, Math.round(bar * frac), 3);
  }
  drawFx(c, view);
}
