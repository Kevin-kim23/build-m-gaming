import { artSurface, brush, ART_SCALE } from './pixel-detail.js';
import { unitSprite, SPRITE_SIZE } from './unit-sprites.js';
import { fortressSprite, FORTRESS_SIZE } from './fortress-art.js';
import { BATTLE_RULES } from './battle-balance.js';

// 가로 전장 그림: 배경(나라별 풍경) + 기지 + 장비 + 사격 효과. 정적인 그림은 한 번 그려 캐시하고,
// 움직이는 것(장비·효과·체력 막대)만 매 프레임 그린다. 이름표·숫자는 화면의 HTML에서 표시한다.
export const LANE_CANVAS = Object.freeze({ width: 360, height: 230 });
const W = LANE_CANVAS.width, H = LANE_CANVAS.height, GROUND_Y = 168, AIR_Y = 96;
const X0 = 62, X1 = 292; // 전장 0 ~ 1000이 화면에서 차지하는 가로 범위
export const laneX = (x) => X0 + (x / BATTLE_RULES.laneLength) * (X1 - X0);
const scenes = new Map(), bases = new Map();

const THEMES = Object.freeze({
  serdin: { sky: ['#8fc4e3', '#bfe0ee', '#e6f0d4'], far: '#9db98a', mid: '#78a05f', ground: '#6f9a4f', road: '#b9ad7c', tuft: '#8dbb62' },
  veloc: { sky: ['#d9a46e', '#e8c08a', '#f0d9a8'], far: '#b9855a', mid: '#a06a46', ground: '#9a6a44', road: '#c9a46c', tuft: '#b8814f' },
  istra: { sky: ['#8f93c4', '#b7b4dc', '#d9d0e8'], far: '#8d8bb0', mid: '#6f7fa0', ground: '#5f8f78', road: '#b4b09a', tuft: '#7bb28e' },
  norgard: { sky: ['#9bb8cc', '#c8dce6', '#eaf4f7'], far: '#b4c8d4', mid: '#98b2c2', ground: '#dfeaee', road: '#b9c8d0', tuft: '#ffffff' },
});

function scene(countryId) {
  if (scenes.has(countryId)) return scenes.get(countryId);
  const t = THEMES[countryId] ?? THEMES.serdin, canvas = artSurface(W, H), c = canvas.getContext('2d'), r = brush(c);
  const bands = t.sky.length, bandH = (GROUND_Y - 40) / bands;
  t.sky.forEach((color, i) => r(0, i * bandH, W, bandH + 1, color));
  let seed = 7;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 26; i++) r(rand() * W, 8 + rand() * 60, 8 + rand() * 18, 2, '#ffffff55'); // 구름
  for (let x = -10; x < W + 10; x += 3) r(x, GROUND_Y - 60 - Math.sin(x / 31) * 14 - Math.sin(x / 11) * 4, 3, 70, t.far);  // 먼 산
  for (let x = -10; x < W + 10; x += 3) r(x, GROUND_Y - 30 - Math.sin(x / 17 + 2) * 8, 3, 40, t.mid);                      // 가까운 언덕
  r(0, GROUND_Y - 6, W, H - GROUND_Y + 6, t.ground);
  r(0, GROUND_Y + 12, W, 22, t.road); r(0, GROUND_Y + 12, W, 1, '#ffffff33'); r(0, GROUND_Y + 33, W, 1, '#00000022');
  for (let i = 0; i < 160; i++) r(rand() * W, GROUND_Y + 36 + rand() * (H - GROUND_Y - 36), 2 + rand() * 3, 1, t.tuft);
  for (let i = 0; i < 50; i++) r(rand() * W, GROUND_Y + 14 + rand() * 18, 3, 1, '#00000014');
  if (countryId === 'istra') r(0, GROUND_Y + 44, W, 8, '#5b8fb4');
  if (countryId === 'norgard') for (let i = 0; i < 40; i++) r(rand() * W, rand() * (GROUND_Y - 20), 1, 1, '#ffffff');
  scenes.set(countryId, canvas); return canvas;
}

// 일반 기지(옆모습): 콘크리트 벙커 + 통신탑 + 깃발. 계급(tier)이 높을수록 크고 장식이 늘어난다.
function baseSprite(side, tier) {
  const key = `${side}:${tier}`; if (bases.has(key)) return bases.get(key);
  const w = 44 + tier * 4, h = 44 + tier * 2, canvas = artSurface(w, h + 4), c = canvas.getContext('2d'), r = brush(c);
  const p = side === 'player'
    ? { dark: '#243a2f', body: '#6f8f72', light: '#a8c4a2', shade: '#496650', flag: '#8dbbbb' }
    : { dark: '#4f2f2c', body: '#b0746d', light: '#e0aea0', shade: '#7e4a44', flag: '#cd5f5a' };
  r(2, h - 2, w - 2, 4, '#1d2a2440');
  r(2, 14, w - 4, h - 16, p.dark); r(4, 16, w - 8, h - 20, p.body); r(4, 16, w - 8, 3, p.light); r(4, h - 8, w - 8, 2, p.shade);
  for (let x = 6; x < w - 8; x += 7) r(x, 22, 4, 5, p.dark), r(x + 1, 23, 2, 1, p.light);
  r(w / 2 - 5, h - 20, 10, 14, p.dark); r(w / 2 - 4, h - 19, 8, 12, p.shade);                // 정문
  for (let x = 2; x < w - 4; x += 6) r(x, 11, 4, 4, p.body);                                   // 총안
  r(w - 12, 0, 7, 16, p.dark); r(w - 11, 1, 5, 14, p.body); r(w - 10, 3, 3, 3, '#e8e0a0');       // 통신탑
  r(7, 0, 1, 14, p.dark); r(8, 1, 8, 5, p.flag);                                                // 깃발
  for (let i = 0; i < tier; i++) r(10 + i * 6, 31, 4, 2, '#e8e0a0');                           // 계급 장식
  bases.set(key, canvas); return canvas;
}

const TIER = { battalion: 0, regiment: 0, division: 1, corps: 2, fieldArmy: 3 };
const tierOf = (id) => TIER[id] ?? 4;
function drawScaled(c, image, x, y, width) {
  const scale = width / (image.width / ART_SCALE);
  c.drawImage(image, Math.round(x), Math.round(y), image.width / ART_SCALE * scale, image.height / ART_SCALE * scale);
}

function drawBases(c, view) {
  const p = view.player, e = view.enemy;
  const pb = baseSprite('player', tierOf(p.hq.id));
  drawScaled(c, pb, 0, GROUND_Y - pb.height / ART_SCALE + 26, pb.width / ART_SCALE);
  if (e.fortress) {
    drawScaled(c, fortressSprite(e.fortress), W - 112, GROUND_Y - 62 + 28, 112);
  } else {
    const eb = baseSprite('enemy', tierOf(e.hq.id));
    drawScaled(c, eb, W - eb.width / ART_SCALE, GROUND_Y - eb.height / ART_SCALE + 26, eb.width / ART_SCALE);
  }
}

function drawFx(c, view) {
  for (const f of view.fx) {
    const age = view.elapsed - f.at;
    if (age < 0 || age > 500) continue;
    c.save(); c.globalAlpha = 1 - age / 500;
    if (f.kind === 'shot') {
      const air = f.id === 'helicopter' || f.id === 'fighter';
      const y0 = (air ? AIR_Y + 10 : GROUND_Y - 4), y1 = GROUND_Y - 4, t = Math.min(1, age / 220);
      const x0 = laneX(f.from), x1 = f.to <= 0 ? X0 - 4 : f.to >= 1000 ? X1 + 6 : laneX(f.to);
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      c.strokeStyle = f.side === 'player' ? '#ffe9a8' : '#ffc4a8'; c.lineWidth = f.id === 'turret' ? 2 : 1.2;
      c.beginPath(); c.moveTo(x0 + (x - x0) * 0.4, y0 + (y - y0) * 0.4); c.lineTo(x, y); c.stroke();
      if (age > 180) { c.fillStyle = '#fff4cd'; c.fillRect(Math.round(x1) - 2, Math.round(y1) - 3, 4, 4); }
    } else if (f.kind === 'strike') {
      const t = Math.min(1, age / 320), x = X0 + (X1 - X0) * t;
      c.fillStyle = '#ffd9a0'; c.fillRect(Math.round(x) - 5, Math.round(30 + 70 * t * t) - 2, 10, 3);
      c.fillStyle = '#ff9c5a'; c.fillRect(Math.round(x) - 14, Math.round(30 + 70 * t * t) - 1, 9, 2);
      if (age > 300) { c.fillStyle = '#fff1c5'; c.fillRect(X1 - 4, GROUND_Y - 24, 18, 24); c.fillStyle = '#ff9c5a'; c.fillRect(X1, GROUND_Y - 16, 10, 16); }
    } else if (f.kind === 'death') {
      const x = laneX(f.from), r = 3 + age / 40;
      c.fillStyle = '#4a4440'; c.fillRect(Math.round(x - r), Math.round(GROUND_Y - 14 - age / 30), Math.round(r * 2), Math.round(r));
      c.fillStyle = '#ffb36a'; c.fillRect(Math.round(x - r / 2), Math.round(GROUND_Y - 10 - age / 40), Math.round(r), Math.round(r / 2));
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
  const units = [...view.player.units, ...view.enemy.units].sort((a, b) => (a.cls === 'air') - (b.cls === 'air') || a.uid - b.uid);
  for (const u of units) {
    const air = u.cls === 'air', bob = air ? Math.sin(view.elapsed / 160 + u.uid) * 2 : 0;
    const scaleUnit = Math.min(1.25, 0.8 + Math.log10(1 + u.count * 1) * 0.18);
    const w = SPRITE_SIZE.width * 1.12 * scaleUnit, h = SPRITE_SIZE.height * 1.12 * scaleUnit;
    const x = laneX(u.x) - w / 2, y = (air ? AIR_Y : GROUND_Y + 8 + (u.uid % 3) * 6) - h + bob;
    c.save();
    if (u.side === 'enemy') { c.translate(Math.round(x + w), Math.round(y)); c.scale(-1, 1); } else c.translate(Math.round(x), Math.round(y));
    c.drawImage(unitSprite(u.id, u.side, u.level), 0, 0, w, h);
    c.restore();
    const bar = 16, frac = Math.max(0, Math.min(1, u.hp / u.maxHp));
    c.fillStyle = '#10181488'; c.fillRect(Math.round(laneX(u.x) - bar / 2), Math.round(y - 3), bar, 2);
    c.fillStyle = frac > 0.5 ? '#9be08f' : frac > 0.25 ? '#e8d27a' : '#e8998a'; c.fillRect(Math.round(laneX(u.x) - bar / 2), Math.round(y - 3), Math.round(bar * frac), 2);
  }
  drawFx(c, view);
}
