import { artSurface, brush } from './pixel-detail.js';

// 수도 요새 그림(적 본부 대신 그려짐). 나라마다 재질·색·지붕이 다르고, 한 번 그린 뒤 캐시한다.
// 구성: 바닥 그림자 → 성벽(벽돌 줄무늬·총안) → 모서리 탑 4개 → 가운데 본성(문·깃발) → 나라별 장식.
export const FORTRESS_SIZE = Object.freeze({ width: 150, height: 76 });
const THEMES = Object.freeze({
  serdin: { wall: '#8d9a7a', wallLight: '#b5c096', wallDark: '#56644f', roof: '#4d7a58', roofLight: '#76a37a', accent: '#e0cf84', door: '#2c3a2c' },
  veloc: { wall: '#a8744c', wallLight: '#cf9a68', wallDark: '#64402c', roof: '#5b4a42', roofLight: '#86705f', accent: '#e8b45a', door: '#2d1d16' },
  istra: { wall: '#a6a4ba', wallLight: '#cfcde2', wallDark: '#62607f', roof: '#6a5f9a', roofLight: '#9a8fcc', accent: '#d9cbe8', door: '#25233a' },
  norgard: { wall: '#b4c9d0', wallLight: '#e6f3f6', wallDark: '#5f7b88', roof: '#35505e', roofLight: '#5d8294', accent: '#d6edf0', door: '#1b2a34' },
});
const cache = new Map();

function bricks(r, t, x, y, w, h) {
  r(x, y, w, h, t.wall);
  for (let row = 0, yy = y + 1; yy < y + h - 1; row++, yy += 4) {
    r(x, yy + 3, w, 1, t.wallDark);
    for (let xx = x + (row % 2 ? 3 : 0); xx < x + w; xx += 7) r(xx, yy, 1, 3, t.wallDark);
    r(x, yy, w, 1, t.wallLight);
  }
}
function crenels(r, t, x, y, w) {
  for (let xx = x; xx < x + w - 2; xx += 6) { r(xx, y - 4, 4, 4, t.wall); r(xx, y - 4, 4, 1, t.wallLight); r(xx + 3, y - 4, 1, 4, t.wallDark); }
}
function tower(r, t, x, y, w, h, side) {
  bricks(r, t, x, y, w, h); r(x + w - 2, y, 2, h, t.wallDark); r(x, y, 2, h, t.wallLight);
  crenels(r, t, x - 1, y, w + 2);
  for (let yy = y + 8; yy < y + h - 10; yy += 12) { r(x + w / 2 - 1, yy, 2, 6, t.door); r(x + w / 2 - 1, yy, 2, 1, t.accent); }
  if (side) r(x - 1, y + h - 3, w + 2, 3, t.wallDark);
}
function roofCone(r, t, cx, y, w, h) {
  for (let i = 0; i < h; i++) {
    const ww = Math.max(2, Math.round(w * (i + 1) / h)); // 위가 뾰족한 원뿔 지붕
    r(cx - ww / 2, y + i, ww, 1, i % 3 === 0 ? t.roofLight : t.roof);
  }
  r(cx - 1, y - 5, 1, 6, t.wallDark); r(cx, y - 5, 4, 3, '#cf4a45');
}

export function fortressSprite(countryId) {
  const id = THEMES[countryId] ? countryId : 'serdin';
  if (cache.has(id)) return cache.get(id);
  const t = THEMES[id], { width: W, height: H } = FORTRESS_SIZE;
  const canvas = artSurface(W, H), c = canvas.getContext('2d'), r = brush(c);
  r(8, H - 8, W - 14, 6, '#1d2a2433');
  // 앞 성벽
  bricks(r, t, 14, 44, W - 28, 26); crenels(r, t, 14, 44, W - 28);
  r(14, 66, W - 28, 4, t.wallDark);
  // 뒤쪽 본성
  bricks(r, t, 48, 14, 54, 40); crenels(r, t, 48, 14, 54);
  r(48, 14, 2, 40, t.wallLight); r(100, 14, 2, 40, t.wallDark);
  roofCone(r, t, 75, 0, 34, 14);
  for (const x of [58, 88]) { r(x, 24, 4, 8, t.door); r(x, 24, 4, 1, t.accent); r(x, 31, 4, 1, t.wallLight); }
  // 모서리 탑
  for (const [x, y] of [[4, 28], [W - 22, 28]]) { tower(r, t, x, y, 18, 44, true); roofCone(r, t, x + 9, y - 14, 22, 14); }
  for (const [x, y] of [[28, 34], [W - 46, 34]]) { tower(r, t, x, y, 14, 36, false); roofCone(r, t, x + 7, y - 9, 17, 9); }
  // 정문(아치 + 쇠창살) 과 적 깃발
  r(65, 50, 20, 20, t.wallDark); r(67, 52, 16, 18, t.door);
  r(69, 50, 12, 2, t.wallDark); r(70, 48, 10, 2, t.wallDark);
  for (let x = 68; x < 82; x += 4) r(x, 53, 1, 17, t.accent);
  for (let y = 56; y < 70; y += 5) r(67, y, 16, 1, t.accent);
  r(34, 8, 1, 22, t.wallDark); r(35, 9, 9, 6, '#cf4a45'); r(37, 11, 5, 2, t.accent);
  r(W - 35, 8, 1, 22, t.wallDark); r(W - 44, 9, 9, 6, '#cf4a45'); r(W - 42, 11, 5, 2, t.accent);
  // 나라별 장식
  if (id === 'serdin') { for (let x = 20; x < W - 20; x += 14) { r(x, 62, 1, 6, '#d6c77a'); r(x - 1, 61, 3, 2, '#e8dc92'); } }
  if (id === 'veloc') {
    for (const x of [58, 90]) { r(x, 6, 4, 8, '#3b2f2a'); r(x - 1, 5, 6, 2, t.accent); r(x + 1, 0, 3, 4, '#6a6a6a88'); }
    r(118, 56, 8, 8, t.accent); r(120, 58, 4, 4, t.wallDark); r(122, 55, 1, 10, t.wallDark);
  }
  if (id === 'istra') { for (const x of [40, 104]) { r(x, 40, 1, 5, '#7eb6d6'); } r(14, 68, W - 28, 2, '#5b8fb4'); }
  if (id === 'norgard') {
    for (let x = 14; x < W - 14; x += 9) { r(x, 44, 6, 2, '#ffffff'); r(x + 1, 46, 1, 3, '#e6f3f6'); r(x + 4, 46, 1, 5, '#cfe6ee'); }
    r(48, 14, 54, 2, '#ffffff'); r(60, 6, 30, 1, '#ffffff77');
  }
  cache.set(id, canvas);
  return canvas;
}
