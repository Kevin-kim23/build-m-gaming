import { artSurface, brush } from './pixel-detail.js';

// 가로 전장용 장비 옆모습 그림(오른쪽을 보는 모습). 아군은 초록, 적은 붉은 갈색 팔레트.
// 그림 교체 지점은 이 파일 하나입니다: 전투 화면은 unitSprite(id, side, level)만 부릅니다.
//  - 지금은 코드로 그린 픽셀 그림을 한 번만 그려 캐시합니다.
//  - 나중에 더 고퀄리티 PNG로 바꾸려면 registerImageSprite(id, side, url)로 등록하세요(README "그림 교체 방법").
export const SPRITE_SIZE = Object.freeze({ width: 44, height: 28 });
const PAL = Object.freeze({
  player: { dark: '#243a2f', body: '#5f8764', light: '#9fc09a', shade: '#3f5f47', metal: '#8fa09a', glass: '#9fd6e0', mark: '#e2ead3', glow: '#a0f0f4' },
  enemy: { dark: '#4f2f2c', body: '#a8655f', light: '#d9a79a', shade: '#7a4640', metal: '#9a8686', glass: '#e0c28a', mark: '#f6d6c8', glow: '#ffb089' },
});
const cache = new Map(), images = new Map();

// 상위 호환 확장 지점: 같은 id·진영의 이미지 파일을 등록하면 코드 그림 대신 사용합니다.
export function registerImageSprite(id, side, url) {
  const image = new Image();
  image.src = url;
  images.set(`${id}:${side}`, image);
  for (const key of [...cache.keys()]) if (key.startsWith(`${id}:${side}:`)) cache.delete(key);
}
export const levelTier = (level) => (level >= 15 ? 3 : level >= 10 ? 2 : level >= 5 ? 1 : 0);

function wheels(r, p, xs, y, rad = 3) {
  for (const x of xs) { r(x - rad, y - rad, rad * 2, rad * 2, p.dark); r(x - rad + 1, y - rad + 1, rad * 2 - 2, rad * 2 - 2, p.metal); r(x - 1, y - 1, 2, 2, p.dark); }
}
function tracks(r, p, x, y, w) {
  r(x, y, w, 7, p.dark); r(x + 1, y + 1, w - 2, 1, p.shade);
  for (let i = x + 3; i < x + w - 2; i += 5) { r(i - 2, y + 2, 4, 4, p.shade); r(i - 1, y + 3, 2, 2, p.metal); }
}
const DRAW = {
  tank(r, p, tier) {
    tracks(r, p, 6, 18, 28);
    r(8, 12, 24, 7, p.body); r(8, 12, 24, 2, p.light); r(8, 17, 24, 2, p.shade);
    r(13, 6, 14, 7, p.body); r(13, 6, 14, 2, p.light); r(14, 11, 12, 2, p.shade);
    r(26, 8, 14, 3, p.dark); r(26, 8, 14, 1, p.metal); r(38, 7, 3, 5, p.dark);
    r(17, 4, 4, 3, p.dark); r(18, 3, 2, 1, p.light);
    if (tier >= 1) r(9, 14, 22, 1, p.mark);
    if (tier >= 2) { r(14, 8, 12, 1, p.mark); r(10, 12, 2, 5, p.dark); }
    if (tier >= 3) { r(30, 12, 3, 5, p.metal); r(5, 10, 2, 8, p.light); }
  },
  artillery(r, p, tier) {
    wheels(r, p, [14, 26], 22, 4);
    r(10, 14, 20, 4, p.shade); r(8, 20, 8, 2, p.dark); r(26, 20, 10, 2, p.dark);
    r(16, 8, 8, 8, p.body); r(16, 8, 8, 2, p.light); r(23, 6, 3, 10, p.dark);
    for (let i = 0; i < 4; i++) r(24 + i * 3, 9 - i, 4, 3, i % 2 ? p.metal : p.dark);
    r(36, 4, 4, 5, p.dark);
    if (tier >= 1) r(17, 12, 6, 1, p.mark);
    if (tier >= 2) r(10, 12, 3, 5, p.light);
    if (tier >= 3) r(30, 8, 2, 4, p.glow);
  },
  selfPropelled(r, p, tier) {
    tracks(r, p, 4, 19, 32);
    r(6, 11, 28, 9, p.body); r(6, 11, 28, 2, p.light); r(6, 18, 28, 2, p.shade);
    r(8, 5, 16, 7, p.body); r(8, 5, 16, 2, p.light); r(9, 10, 14, 2, p.shade);
    r(22, 7, 20, 3, p.dark); r(22, 7, 20, 1, p.metal); r(40, 6, 3, 5, p.dark);
    r(12, 3, 5, 3, p.dark);
    if (tier >= 1) r(8, 14, 24, 1, p.mark);
    if (tier >= 2) { r(30, 12, 3, 6, p.dark); r(4, 12, 2, 6, p.light); }
    if (tier >= 3) { r(36, 7, 4, 1, p.glow); r(10, 7, 12, 1, p.mark); }
  },
  rocketLauncher(r, p, tier) {
    wheels(r, p, [10, 20, 32], 23, 3);
    r(4, 15, 36, 5, p.shade); r(4, 15, 36, 1, p.light);
    r(4, 8, 11, 8, p.body); r(5, 9, 5, 4, p.glass); r(4, 8, 11, 2, p.light);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { r(18 + i * 7, 4 + j * 5 - i, 6, 4, p.dark); r(22 + i * 7, 5 + j * 5 - i, 2, 2, tier >= 1 ? p.glow : p.mark); }
    if (tier >= 2) r(15, 12, 3, 5, p.mark);
    if (tier >= 3) r(6, 6, 2, 3, p.glow);
  },
  helicopter(r, p, tier) {
    r(2, 3, 38, 1, p.dark); r(8, 2, 26, 1, p.metal);       // 메인 로터
    r(20, 3, 2, 3, p.dark);
    r(10, 6, 18, 10, p.body); r(10, 6, 18, 2, p.light); r(10, 14, 18, 2, p.shade);
    r(24, 7, 6, 6, p.glass); r(25, 8, 3, 2, '#ffffff66');
    r(2, 8, 10, 4, p.body); r(0, 5, 3, 8, p.shade); r(0, 4, 4, 1, p.metal); // 꼬리
    r(8, 18, 22, 1, p.dark); r(12, 16, 1, 2, p.dark); r(26, 16, 1, 2, p.dark);
    r(30, 12, 8, 2, p.dark); r(36, 11, 2, 1, tier >= 1 ? p.glow : p.mark);
    if (tier >= 2) { r(14, 10, 8, 1, p.mark); }
    if (tier >= 3) { r(11, 4, 2, 2, p.glow); }
  },
  fighter(r, p, tier) {
    r(4, 10, 36, 5, p.body); r(4, 10, 36, 1, p.light); r(4, 14, 36, 1, p.shade);
    r(34, 11, 8, 3, p.light); r(40, 12, 3, 1, p.dark);
    r(26, 7, 8, 4, p.glass); r(27, 8, 4, 1, '#ffffff66');
    r(14, 14, 16, 3, p.shade); r(8, 15, 8, 2, p.dark);
    r(2, 4, 8, 8, p.body); r(2, 4, 3, 8, p.dark); r(8, 6, 2, 2, p.light);   // 꼬리 날개
    r(0, 11, 5, 3, p.glow); r(0, 12, 3, 1, '#ffffff');
    if (tier >= 1) r(14, 11, 12, 1, p.mark);
    if (tier >= 2) r(22, 17, 6, 2, p.dark);
    if (tier >= 3) r(30, 9, 2, 1, p.glow);
  },
  transport(r, p, tier) {
    r(2, 8, 38, 9, p.body); r(2, 8, 38, 2, p.light); r(2, 15, 38, 2, p.shade);
    r(34, 9, 7, 5, p.glass); r(0, 3, 6, 6, p.shade); r(0, 3, 2, 6, p.dark);
    r(10, 4, 20, 3, p.metal); r(10, 4, 20, 1, p.light);                       // 높은 날개
    r(12, 7, 2, 3, p.dark); r(26, 7, 2, 3, p.dark);
    r(16, 10, 8, 6, '#e8f0e0'); r(19, 11, 2, 4, '#cf4a45'); r(17, 12, 6, 2, '#cf4a45'); // 적십자
    r(10, 18, 20, 2, p.dark); r(14, 17, 2, 2, p.dark); r(26, 17, 2, 2, p.dark);
    if (tier >= 2) r(4, 13, 10, 1, p.mark);
    if (tier >= 3) { r(8, 4, 2, 2, p.glow); r(30, 4, 2, 2, p.glow); }
  },
  railgunTank(r, p, tier) {
    tracks(r, p, 5, 19, 30);
    r(7, 12, 26, 8, p.body); r(7, 12, 26, 2, p.light); r(7, 18, 26, 2, p.shade);
    r(11, 6, 16, 7, p.shade); r(11, 6, 16, 2, p.light);
    r(26, 7, 17, 2, p.dark); r(26, 10, 17, 2, p.dark); r(26, 9, 17, 1, p.glow);
    for (let x = 28; x < 42; x += 4) { r(x, 6, 1, 7, p.metal); r(x, 8, 1, 2, p.glow); }
    r(14, 3, 6, 3, p.dark); r(15, 4, 4, 1, p.glow);
    if (tier >= 1) r(8, 14, 24, 1, p.glow);
    if (tier >= 3) r(6, 9, 3, 4, p.glow);
  },
  icbm(r, p, tier) {
    // 발사대 + 세워진 미사일: 받침 빔, 유도 레일, 동체 줄무늬, 탄두, 꼬리 날개, 배기 불꽃
    r(4, 22, 36, 4, p.dark); r(6, 21, 32, 1, p.metal); r(4, 25, 36, 1, p.shade);
    for (let x = 8; x < 38; x += 6) r(x, 22, 2, 3, p.light);
    r(14, 14, 3, 8, p.shade); r(27, 14, 3, 8, p.shade); r(13, 13, 5, 1, p.metal); r(26, 13, 5, 1, p.metal);
    r(19, 4, 6, 18, p.light); r(19, 4, 2, 18, p.mark); r(23, 4, 2, 18, p.shade);
    r(20, 1, 4, 3, '#cf4a45'); r(21, 0, 2, 1, p.dark); r(19, 4, 6, 1, p.dark);
    r(20, 9, 4, 2, p.dark); r(20, 14, 4, 1, p.dark); r(19, 18, 6, 1, p.metal);
    r(16, 17, 3, 5, p.body); r(25, 17, 3, 5, p.body);
    if (tier >= 1) r(20, 6, 4, 1, p.glow);
    if (tier >= 2) { r(21, 22, 2, 3, p.glow); r(8, 19, 2, 2, p.mark); }
    if (tier >= 3) { r(34, 18, 3, 3, p.glow); r(18, 11, 8, 1, p.mark); }
  },
};

export function unitSprite(id, side, level = 0) {
  const tier = levelTier(level), key = `${id}:${side}:${tier}`;
  if (cache.has(key)) return cache.get(key);
  const image = images.get(`${id}:${side}`);
  if (image?.complete && image.naturalWidth) { cache.set(key, image); return image; }
  const canvas = artSurface(SPRITE_SIZE.width, SPRITE_SIZE.height), c = canvas.getContext('2d');
  const r = brush(c), p = PAL[side] ?? PAL.player;
  r(5, SPRITE_SIZE.height - 4, SPRITE_SIZE.width - 8, 2, '#1d2a2440'); // 그림자
  (DRAW[id] ?? DRAW.tank)(r, p, tier);
  cache.set(key, canvas);
  return canvas;
}
