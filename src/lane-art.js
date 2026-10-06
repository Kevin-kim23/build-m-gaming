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

// 기지 위 연기·불꽃: 체력이 반 이하면 연기, 1/4 이하면 불꽃이 올라온다(경과 시간으로 움직여 상태 저장이 필요 없음).
function drawBaseDamage(c, view) {
  for (const [side, army, y0] of [['player', view.player, H - 78], ['enemy', view.enemy, 78]]) {
    const frac = army.hq.hp / army.hq.maxHp;
    if (frac > 0.5 || frac <= 0) continue;
    const n = frac > 0.25 ? 3 : 6;
    for (let i = 0; i < n; i++) {
      const phase = ((view.elapsed / 900 + i * 0.37) % 1), x = W / 2 - 56 + i * (112 / n) + Math.sin(i * 5 + view.elapsed / 500) * 4;
      c.globalAlpha = (1 - phase) * 0.7;
      c.fillStyle = frac > 0.25 ? '#555049' : (i % 2 ? '#ff9c3a' : '#ffd36a');
      const size = 5 + phase * 8;
      c.fillRect(Math.round(x - size / 2), Math.round(y0 - phase * 30 - size / 2), Math.round(size), Math.round(size));
    }
    c.globalAlpha = 1;
  }
}
// 기지가 맞았을 때 잠깐 붉게(우리) / 흰빛(적)으로 번쩍인다. flash는 0~1.
function drawBaseFlash(c, view) {
  for (const [side, y] of [['player', H - 52], ['enemy', 56]]) {
    const v = view.flash?.[side] ?? 0; if (v <= 0) continue;
    c.globalAlpha = Math.min(0.55, v * 0.55); c.fillStyle = side === 'player' ? '#ff4a3a' : '#fff4d0';
    c.fillRect(W / 2 - 112, y - 38, 224, 76); c.globalAlpha = 1;
  }
}
function burst(c, x, y, age, life, colors, count, spread) {
  const t = age / life;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + i * 0.7, d = spread * (0.35 + t) * (0.6 + (i % 3) * 0.25);
    const size = Math.max(1, 3 - t * 2) + (i % 2);
    c.fillStyle = colors[i % colors.length]; c.fillRect(Math.round(x + Math.cos(angle) * d), Math.round(y + Math.sin(angle) * d), Math.round(size), Math.round(size));
  }
}

function drawFx(c, view) {
  for (const f of view.fx) {
    const age = view.elapsed - f.at;
    if (age < 0 || age > 600) continue;
    c.save();
    const lx = LANE_CENTERS[f.lane ?? 1];
    if (f.kind === 'shot') {
      c.globalAlpha = Math.max(0, 1 - age / 500);
      const y0 = laneY(f.from), y1 = f.to >= 1000 ? 94 : f.to <= 0 ? H - 78 : laneY(f.to), t = Math.min(1, age / 220);
      const y = y0 + (y1 - y0) * t, trail = (y1 - y0) * 0.14, big = f.id === 'turret' || f.id === 'selfPropelled' || f.id === 'artillery' || f.id === 'rocketLauncher';
      if (age < 110) { c.fillStyle = '#fff6c8'; c.fillRect(Math.round(lx) - 4, Math.round(y0) - 4 + Math.sign(y1 - y0) * 8, 8, 6); c.fillStyle = '#ffb347'; c.fillRect(Math.round(lx) - 2, Math.round(y0) - 8 + Math.sign(y1 - y0) * 8, 4, 4); } // 포구 불꽃
      c.strokeStyle = f.side === 'player' ? '#ffe9a8' : '#ffc4a8'; c.lineWidth = big ? 2.4 : 1.6;
      c.beginPath(); c.moveTo(lx, y - trail); c.lineTo(lx, y); c.stroke();
      if (age > 170) burst(c, lx, y1, age - 170, 330, ['#fff4cd', '#ffcf6a', '#ff8a3a'], big ? 7 : 5, big ? 14 : 9);   // 명중 불꽃
    } else if (f.kind === 'strike') {
      c.globalAlpha = Math.max(0, 1 - age / 600);
      const t = Math.min(1, age / 320), y = H - 80 - (H - 190) * t;
      c.fillStyle = '#ffd9a0'; c.fillRect(W / 2 - 3, Math.round(y) - 6, 6, 12); c.fillStyle = '#ff9c5a'; c.fillRect(W / 2 - 2, Math.round(y) + 6, 4, 10);
      for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ffb347' : '#8a8a8a'; c.fillRect(W / 2 - 3 + Math.sin(i + age / 90) * 5, Math.round(y) + 16 + i * 7, 5, 5); }
      if (age > 300) { burst(c, W / 2, 84, age - 300, 300, ['#fff1c5', '#ff9c5a', '#ffd36a', '#7a6a60'], 16, 38); c.fillStyle = '#fff1c5'; c.fillRect(W / 2 - 22, 66, 44, 36); }
    } else if (f.kind === 'death') {
      const y = laneY(f.from);
      c.globalAlpha = Math.max(0, 1 - age / 600);
      burst(c, lx, y, age, 600, ['#fff1c5', '#ffb347', '#ff6a3a', '#4a4440'], 12, 24);                                    // 폭발
      c.fillStyle = '#4a4440'; const r = 4 + age / 50; c.fillRect(Math.round(lx - r), Math.round(y - r - age / 28), Math.round(r * 2), Math.round(r * 2));  // 연기
    } else if (f.kind === 'spawn') {
      c.globalAlpha = Math.max(0, 0.8 - age / 500);
      const y = laneY(f.from), r = 8 + age / 14;
      c.strokeStyle = f.side === 'player' ? '#bfe7ff' : '#ffc4a8'; c.lineWidth = 2;
      c.strokeRect(Math.round(lx - r), Math.round(y - r * 0.6), Math.round(r * 2), Math.round(r * 1.2));               // 출격 파문
      for (let i = 0; i < 6; i++) { c.fillStyle = '#d9d2b8'; c.fillRect(Math.round(lx + (i - 2.5) * 7), Math.round(y + 8 - age / 30 - (i % 2) * 3), 3, 3); }   // 먼지
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
  if (view.shake > 0) c.translate(Math.round((Math.sin(view.elapsed / 23) * view.shake)), Math.round(Math.cos(view.elapsed / 31) * view.shake));  // 기지가 맞으면 화면이 흔들림
  c.drawImage(scene(view.countryId), 0, 0, W, H);
  drawBases(c, view);
  drawBaseFlash(c, view); drawBaseDamage(c, view);
  const units = [...view.player.units, ...view.enemy.units].sort((a, b) => b.x * b.dir - a.x * a.dir || a.uid - b.uid);
  for (const u of units) {
    const air = u.cls === 'air', born = Math.min(1, (view.elapsed - (u.bornMs ?? 0)) / 300), grow = 0.55 + 0.45 * born, w = SPRITE_SIZE.width * 0.62 * grow, h = SPRITE_SIZE.height * 0.62 * grow;   // 출격하면 작게 시작해 커진다
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
