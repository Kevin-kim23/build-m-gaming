import { artSurface, brush, overheadDetails } from './pixel-detail.js';
import { drawOverheadRocket } from './rocket-art.js';
import { drawOverheadHelicopter } from './helicopter-art.js';
import { drawOverheadAircraft } from './aircraft-art.js';
import { overheadEnhancement } from './enhancement-art.js';
import { drawOverheadStrategic } from './strategic-art.js';
import { drawOverheadLateEquipment } from './late-topdown-art.js';
import { overheadGalacticDetails } from './galactic-command-art.js';

// 세로 레인 전장용 "위에서 본" 장비·기지 그림(위쪽을 보는 모습). 아군은 초록, 적은 붉은 갈색 팔레트.
// 그림 교체 지점은 이 파일 하나입니다: 전투 화면은 unitSprite / baseSprite만 부릅니다.
//  - 지금은 코드로 그린 픽셀 그림을 한 번만 그려 캐시합니다(홈·상점의 장비 그림과 같은 부품을 씁니다).
//  - 나중에 더 고퀄리티 PNG로 바꾸려면 registerImageSprite(id, side, url)로 등록하세요(README "그림 교체 방법").
export const SPRITE_SIZE = Object.freeze({ width: 56, height: 68 });
const PAL = Object.freeze({
  player: { dark: '#273f36', body: '#688768', light: '#a6bea0', mark: '#e2ead3', flag: '#8dbbbb' },
  enemy: { dark: '#694947', body: '#bc8480', light: '#e4b8ad', mark: '#f9d7ca', flag: '#cd7c79' },
});
const cache = new Map(), images = new Map();
const rect = (c, x, y, w, h, color) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

// 같은 id·진영의 이미지 파일을 등록하면 코드 그림 대신 사용합니다.
export function registerImageSprite(id, side, url) {
  const image = new Image();
  image.src = url;
  images.set(`${id}:${side}`, image);
  for (const key of [...cache.keys()]) if (key.startsWith(`${id}:${side}:`)) cache.delete(key);
}
export const levelTier = (level) => (level >= 15 ? 3 : level >= 10 ? 2 : level >= 5 ? 1 : 0);

function emblem(c, x, y, side) {
  const p = PAL[side];
  if (side === 'enemy') { rect(c, x + 2, y, 2, 2, p.mark); rect(c, x, y + 2, 6, 2, p.mark); rect(c, x + 2, y + 4, 2, 2, p.mark); rect(c, x + 2, y + 2, 2, 2, p.dark); }
  else { rect(c, x, y, 2, 6, p.mark); rect(c, x + 4, y, 2, 6, p.mark); }
}
function drawTrackedOrTowed(c, id, level, side) {
  const p = PAL[side];
  if (id === 'artillery') {
    rect(c, 15, 42, 5, 20, p.dark); rect(c, 36, 42, 5, 20, p.dark);
    rect(c, 10, 58, 10, 4, p.body); rect(c, 36, 58, 10, 4, p.body);
    rect(c, 7, 33, 8, 14, '#293934'); rect(c, 41, 33, 8, 14, '#293934');
    rect(c, 10, 36, 3, 8, p.light); rect(c, 43, 36, 3, 8, p.light);
    rect(c, 14, 29, 28, 16, p.dark); rect(c, 16, 29, 24, 11, p.body);
    rect(c, 15, 27, 26, 4, p.light); rect(c, 24, 34, 9, 15, p.body);
    rect(c, 25, 5, 6, 29, p.dark); rect(c, 26, 5, 2, 27, p.light);
    return;
  }
  const spg = id === 'selfPropelled', rear = spg ? 61 : 56;
  rect(c, 8, 22, 9, rear - 18, '#2a3833'); rect(c, 39, 22, 9, rear - 18, '#2a3833');
  for (let y = 25; y < rear; y += 5) { rect(c, 9, y, 7, 2, '#667166'); rect(c, 40, y, 7, 2, '#667166'); }
  rect(c, 16, 22, 24, rear - 22, p.dark); rect(c, 18, 22, 20, rear - 25, p.body);
  rect(c, 19, 22, 18, 3, p.light); rect(c, 20, rear - 9, 16, 4, p.dark);
  rect(c, spg ? 17 : 20, spg ? 32 : 29, spg ? 22 : 16, spg ? 19 : 16, p.dark);
  rect(c, spg ? 19 : 22, spg ? 32 : 28, spg ? 18 : 12, spg ? 16 : 14, p.light);
  rect(c, 25, spg ? 1 : 9, 6, spg ? 34 : 24, p.dark); rect(c, 26, spg ? 1 : 9, 2, spg ? 34 : 23, p.light);
  rect(c, 23, spg ? 41 : 35, 9, 6, p.body);
  if (side === 'enemy') { rect(c, 15, 19, 26, 3, p.dark); rect(c, 17, 22, 3, 6, p.light); }
}
function drawGear(id, level, side) {
  const canvas = artSurface(SPRITE_SIZE.width, SPRITE_SIZE.height), c = canvas.getContext('2d'), p = PAL[side];
  rect(c, 12, 30, 36, 31, '#22392c44');
  if (['carrier','flyingFortress','orbitalAssault'].includes(id)) { drawOverheadLateEquipment(c, level, p, id); overheadEnhancement(c, level); emblem(c, 25, 46, side); return canvas; }
  if (id === 'railgunTank' || id === 'icbm') { drawOverheadStrategic(c, level, p, id); overheadEnhancement(c, level); emblem(c, 25, 46, side); return canvas; }
  if (id === 'transport' || id === 'fighter') { drawOverheadAircraft(c, level, p, id); overheadEnhancement(c, level); return canvas; }
  if (id === 'rocketLauncher') drawOverheadRocket(c, level, p);
  else if (id === 'helicopter') drawOverheadHelicopter(c, level, p);
  else drawTrackedOrTowed(c, id, level, side);
  // 강화 한 단계마다 보이는 장갑·장식 블록이 하나씩 늘어난다.
  for (let i = 0; i < level; i++) rect(c, i % 2 ? 36 : 17, 24 + Math.floor(i / 2) * 5, 4, 3, i >= 8 ? '#e0c98c' : p.light);
  if (level >= 4) rect(c, 24, 5, 8, 3, p.body);
  if (level >= 7) { rect(c, 38, 10, 1, 23, p.light); rect(c, 36, 11, 5, 2, p.flag); }
  overheadDetails(c, id, level, p); overheadEnhancement(c, level); emblem(c, 25, 47, side);
  return canvas;
}

export function unitSprite(id, side, level = 0) {
  const key = `${id}:${side}:${level}`;
  if (cache.has(key)) return cache.get(key);
  const image = images.get(`${id}:${side}`);
  const sprite = image?.complete && image.naturalWidth ? image : drawGear(id, level, side);
  cache.set(key, sprite);
  return sprite;
}

const TIERS = ['battalion', 'regiment', 'division', 'corps', 'fieldArmy', 'armyGroup', 'alliedArmy', 'grandAlliedArmy', 'supremeCommand', 'galacticCommand'];
// 일반 기지(위에서 본 모습): 계급이 높을수록 크고 장식이 늘어난다.
export function baseSprite(id, side) {
  const key = `base:${side}:${id}`;
  if (cache.has(key)) return cache.get(key);
  const tier = Math.max(0, TIERS.indexOf(id)), w = 62 + tier * 10, h = 42 + tier * 5;
  const canvas = artSurface(w + 18, h + 12), c = canvas.getContext('2d'), p = PAL[side], r = brush(c);
  r(5, 6, w + 3, h + 2, '#26372d55'); r(2, 2, w, h, p.dark); r(5, 5, w - 6, h - 6, p.body);
  r(5, 5, w - 6, 3, p.light); r(5, 7, 3, h - 8, p.light); r(12, 12, w - 23, h - 21, p.dark); r(14, 14, w - 27, h - 25, p.body);
  for (let col = 0; col <= tier + 1; col++) { r(15 + col * 13, 15, 8, 6, p.light); r(16 + col * 13, 16, 6, 2, '#5a7675'); }
  r(14, h - 13, 13, 6, p.light); r(16, h - 12, 9, 4, p.dark); emblem(c, w / 2 - 3, h / 2, side);
  r(w + 7, 0, 2, 25, p.dark); r(w + 9, 1, 8, 7, p.flag);
  for (let x = 8; x < w - 8; x += 8) { r(x, 8, 4, 1, p.light); r(x, h - 6, 4, 1, p.dark); }
  for (let y = 15; y < h - 10; y += 7) { r(w - 10, y, 3, 2, p.light); r(w - 9, y + 1, 2, 1, p.dark); }
  if (tier >= 7) { const metal = tier === 8 ? '#d8e8f1' : '#e4ce92'; for (const x of [5, w - 20]) { r(x, h / 2 - 5, 14, 19, p.dark); r(x + 2, h / 2 - 3, 10, 2, metal); } r(w / 2 - 15, h / 2 - 12, 30, 2, metal); }
  if (id === 'galacticCommand') overheadGalacticDetails(r, w, h, p);
  cache.set(key, canvas);
  return canvas;
}
