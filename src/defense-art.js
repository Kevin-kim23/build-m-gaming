// 무한 방어전 전장 그림: 바닥·길·자리 틀·기지·적 입구는 한 번만 그려 두고(구간·크기가 바뀔 때만 다시),
// 매 프레임에는 장비(표적 쪽으로 회전)·적(가는 방향으로 회전)·사격·숫자만 얹는다. 그림은 모두 캐시한다.
import { MAP, PATH, PADS, BASE_POS, TOWERS, LINES, BOSS_STUN } from './defense-data.js';
import { roadBackdropCanvas, TILE_W, TILE_H } from './road-backdrop.js';
import { battleHeadquartersSprite } from './battle-hq-art.js';
import { teamSprite } from './lane-art.js';
import { alienSprite } from './alien-art.js';
import { towerId, towerStats } from './defense-run.js';
import { enemyArt } from './defense-waves.js';
import { pointAt, PATH_LENGTH } from './defense-path.js';
import { BAY_POS } from './defense-markup.js';
import { FLOAT_MS } from './defense-feedback.js';
import { reportError } from './diagnostics.js';

const ROAD = Object.freeze({ earth: ['#3a3222', '#8d7b55', '#a28f63'], space: ['#141a2e', '#39476a', '#4a5a82'], abyss: ['#1a0a10', '#4a2530', '#5c3038'] });
const SHOT = Object.freeze({ armor: '#ffd293', firepower: '#ffb08a', air: '#9fe8ff' });
const BAY_ART = Object.freeze({ transport: 'transport', recon: 'droneCarrier' });
const SHOT_S = 0.22, FLASH_S = 0.08, TURN = 0.3;
let staticLayer = null, staticKey = '';

function paintStatic(theme, scale) {
  const c = document.createElement('canvas');
  c.width = Math.round(MAP.width * scale); c.height = Math.round(MAP.height * scale);
  const x = c.getContext('2d'); x.scale(scale, scale);
  const tile = roadBackdropCanvas(theme), th = TILE_H * MAP.width / TILE_W;
  if (tile) for (let y = MAP.height - th; y > -th; y -= th) x.drawImage(tile, 0, y, MAP.width, th + 1);
  else { x.fillStyle = '#1b2620'; x.fillRect(0, 0, MAP.width, MAP.height); }
  x.fillStyle = 'rgba(8,14,12,.28)'; x.fillRect(0, 0, MAP.width, MAP.height);
  const line = (w, color, dash = []) => { x.strokeStyle = color; x.lineWidth = w; x.lineJoin = 'round'; x.lineCap = 'round'; x.setLineDash(dash); x.beginPath(); PATH.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.stroke(); x.setLineDash([]); };
  const [edge, body, top] = ROAD[theme] ?? ROAD.earth;
  line(42, edge); line(34, body); line(26, top); line(2, 'rgba(40,32,20,.45)', [6, 8]);
  // 적 입구: 붉은 화살표
  const [sx, sy] = PATH[0];
  x.fillStyle = '#ff6b6b'; x.strokeStyle = '#3a0d10'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(sx, sy + 16); x.lineTo(sx - 13, sy - 2); x.lineTo(sx + 13, sy - 2); x.closePath(); x.fill(); x.stroke();
  for (const [px, py] of PADS) frame(x, px, py, 'rgba(20,28,24,.72)', '#c9d6c4aa', [5, 4]);
  for (const [bx, by] of Object.values(BAY_POS)) frame(x, bx, by, 'rgba(40,30,60,.75)', '#c9a2ff', []);
  draw(x, battleHeadquartersSprite('corps', 'player'), BASE_POS[0], BASE_POS[1], 104);
  return c;
}
function frame(x, cx, cy, fill, stroke, dash) {
  x.fillStyle = fill; x.beginPath(); x.roundRect(cx - 27, cy - 27, 54, 54, 10); x.fill();
  x.strokeStyle = stroke; x.lineWidth = 1.5; x.setLineDash(dash); x.stroke(); x.setLineDash([]);
}
// angle: 그림의 '위'가 향할 방향(라디안, 0 = 위).
function draw(x, img, cx, cy, w, angle = 0) {
  if (!img) return;
  const h = img.height / img.width * w;
  x.save(); x.translate(cx, cy); if (angle) x.rotate(angle); x.drawImage(img, -w / 2, -h / 2, w, h); x.restore();
}
const gearSprite = (id, level = 12) => teamSprite(id, 'player', Math.min(50, level)).canvas;
// 부드럽게 돌기: 지금 각도에서 목표 각도로 가장 짧은 쪽으로 조금씩.
function turn(from, to) {
  const d = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + d * TURN;
}

// view: { selected, armed: line|null, ghost: {line|from, point}|null, aim, floats, now }
export function drawDefense(canvas, run, theme, view = {}) {
  try {
    const scale = canvas.width / MAP.width, key = `${theme}:${canvas.width}`;
    if (key !== staticKey) { staticLayer = paintStatic(theme, scale); staticKey = key; }
    const x = canvas.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0); x.imageSmoothingEnabled = false;
    x.drawImage(staticLayer, 0, 0);
    x.setTransform(scale, 0, 0, scale, 0, 0);
    drawTargets(x, run, view);
    run.pads.forEach((t, i) => {
      const [px, py] = PADS[i];
      if (!t) { plus(x, px, py, !!view.armed || !!view.ghost?.line); return; }
      if (view.ghost?.from === i) x.globalAlpha = 0.35;
      else if (t.stunnedUntil > run.time) x.globalAlpha = 0.45;
      t.drawAngle = turn(t.drawAngle ?? 0, t.aim === undefined ? 0 : t.aim + Math.PI / 2);
      draw(x, gearSprite(TOWERS[towerId(t)].art, t.level), px, py, 40, t.drawAngle);
      x.globalAlpha = 1;
    });
    for (const [id, [bx, by]] of Object.entries(BAY_POS)) if (run.bays[id]) draw(x, gearSprite(BAY_ART[id], run.bays[id].level), bx, by, 40);
    else plus(x, bx, by, false);
    for (const mine of run.mines) {
      const [mx, my] = pointAt(mine.at * PATH_LENGTH);
      x.fillStyle = '#3b3f2c'; x.strokeStyle = '#e6c27a'; x.lineWidth = 1.5; x.beginPath(); x.arc(mx, my, 6, 0, 7); x.fill(); x.stroke();
    }
    if (run.warning) {
      const [wx, wy] = PADS[run.warning.at] ?? BASE_POS;
      x.strokeStyle = '#ff6b6b'; x.lineWidth = 2; x.setLineDash([6, 5]); x.beginPath(); x.arc(wx, wy, BOSS_STUN.radius, 0, 7); x.stroke(); x.setLineDash([]);
    }
    for (const e of run.enemies) drawEnemy(x, e);
    drawShots(x, run);
    drawGhost(x, run, view);
    drawFloats(x, view);
    if (view.aim) { x.strokeStyle = '#ff8a7a'; x.lineWidth = 2; x.setLineDash([5, 5]); x.strokeRect(4, 4, MAP.width - 8, MAP.height - 8); x.setLineDash([]); }
  } catch (error) { reportError('defense.draw', error); }
}

function drawEnemy(x, e) {
  const w = e.big ? 84 : e.boss ? 52 : 32;
  if (e.boss) {
    const g = x.createRadialGradient(e.x, e.y, 6, e.x, e.y, w * 0.9); g.addColorStop(0, 'rgba(255,60,120,.4)'); g.addColorStop(1, 'rgba(255,60,120,0)');
    x.fillStyle = g; x.beginPath(); x.arc(e.x, e.y, w * 0.9, 0, 7); x.fill();
  }
  if (e.air) { x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(e.x + 6, e.y + 10, w * 0.32, w * 0.16, 0, 0, 7); x.fill(); }
  const art = e.art ?? enemyArt(1, e.type);
  e.drawAngle = turn(e.drawAngle ?? Math.PI, e.angle === undefined ? Math.PI : e.angle + Math.PI / 2);
  if (e.stealth) x.globalAlpha = 0.5;
  draw(x, alienSprite(art.kind ?? 'crawler', art.palette), e.x, e.y, w, e.drawAngle);
  x.globalAlpha = 1;
  if (e.hp < e.maxHp) { x.fillStyle = '#000a'; x.fillRect(e.x - w / 2, e.y - w / 2 - 6, w, 3); x.fillStyle = e.boss ? '#ff6b9b' : '#e6c27a'; x.fillRect(e.x - w / 2, e.y - w / 2 - 6, w * Math.max(0, e.hp / e.maxHp), 3); }
  if (e.shield > 0) { x.strokeStyle = '#9fe8ffcc'; x.lineWidth = 1.5; x.beginPath(); x.arc(e.x, e.y, w * 0.62, 0, 7); x.stroke(); }
}
// 사격선(조금 길게 보이게)과 포구 섬광: 여러 장비가 동시에 쏘는 게 보인다.
function drawShots(x, run) {
  for (const f of run.fx) {
    const age = run.time - f.at;
    if (age > SHOT_S || age < 0) continue;
    const t = run.pads[f.pad], a = t?.drawAngle ?? 0, tipX = f.x0 + Math.sin(a) * 18, tipY = f.y0 - Math.cos(a) * 18;
    x.globalAlpha = 1 - age / SHOT_S; x.strokeStyle = SHOT[f.line]; x.lineWidth = 2.5;
    x.beginPath(); x.moveTo(tipX, tipY); x.lineTo(f.x1, f.y1); x.stroke();
    x.fillStyle = 'rgba(255,245,220,.9)'; x.beginPath(); x.arc(f.x1, f.y1, f.splash ? f.splash * 0.5 : 5, 0, 7); x.fill();
    if (age < FLASH_S) { x.fillStyle = '#fff6d0'; x.beginPath(); x.arc(tipX, tipY, 5, 0, 7); x.fill(); }
    x.globalAlpha = 1;
  }
}
// 짓기·옮기기 중: 손가락 아래 반투명 장비, 놓일 자리 강조와 사거리 원.
function drawGhost(x, run, view) {
  const g = view.ghost;
  if (!g?.point) return;
  const pad = PADS.findIndex(([px, py]) => Math.abs(px - g.point.x) <= 32 && Math.abs(py - g.point.y) <= 32);
  const id = g.line ? LINES[g.line].path[0] : towerId(run.pads[g.from]);
  const range = g.line ? TOWERS[id].range : towerStats(run, run.pads[g.from]).range;
  const ok = pad >= 0 && (g.line ? !run.pads[pad] : pad !== g.from);
  if (ok) {
    const [px, py] = PADS[pad];
    x.fillStyle = 'rgba(127,208,168,.14)'; x.strokeStyle = 'rgba(127,208,168,.9)'; x.lineWidth = 2; x.setLineDash([6, 5]);
    x.beginPath(); x.arc(px, py, range, 0, 7); x.fill(); x.stroke(); x.setLineDash([]);
    x.strokeStyle = '#7fd0a8'; x.lineWidth = 3; x.beginPath(); x.roundRect(px - 28, py - 28, 56, 56, 10); x.stroke();
  }
  x.globalAlpha = 0.7; draw(x, gearSprite(TOWERS[id].art), g.point.x, g.point.y, 40); x.globalAlpha = 1;
}
function drawTargets(x, run, view) {
  const s = view.selected;
  if (s?.pad === undefined || !run.pads[s.pad]) return;
  const [px, py] = PADS[s.pad];
  x.fillStyle = 'rgba(230,194,122,.1)'; x.strokeStyle = 'rgba(230,194,122,.8)'; x.lineWidth = 1.5;
  x.beginPath(); x.arc(px, py, towerStats(run, run.pads[s.pad]).range, 0, 7); x.fill(); x.stroke();
  x.strokeStyle = '#e6c27a'; x.lineWidth = 3; x.beginPath(); x.roundRect(px - 28, py - 28, 56, 56, 10); x.stroke();
}
function drawFloats(x, view) {
  for (const f of view.floats ?? []) {
    const age = (view.now - f.born) / FLOAT_MS;
    if (age < 0 || age > 1) continue;
    if (f.kind === 'blast') {
      const g = x.createRadialGradient(f.x, f.y, 4, f.x, f.y, 60); g.addColorStop(0, `rgba(255,240,200,${1 - age})`); g.addColorStop(0.5, `rgba(255,140,60,${0.8 * (1 - age)})`); g.addColorStop(1, 'rgba(255,80,40,0)');
      x.fillStyle = g; x.beginPath(); x.arc(f.x, f.y, 60, 0, 7); x.fill(); continue;
    }
    x.globalAlpha = 1 - age * age; x.font = '800 11px "Noto Sans KR",system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 3; x.strokeStyle = '#000b'; x.strokeText(f.text, f.x, f.y - age * 16); x.fillStyle = f.color; x.fillText(f.text, f.x, f.y - age * 16);
    x.globalAlpha = 1;
  }
}
function plus(x, cx, cy, hot) {
  if (hot) { x.strokeStyle = '#7fd0a8'; x.lineWidth = 2.5; x.beginPath(); x.roundRect(cx - 27, cy - 27, 54, 54, 10); x.stroke(); }
  x.fillStyle = hot ? '#7fd0a8' : '#c9d6c4aa'; x.font = '800 22px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('+', cx, cy + 1);
}

// 아래 카드 줄·말풍선 그림(장비)과 다음 웨이브 아이콘(적).
export function paintGearIcon(canvas, id) {
  const s = gearSprite(id);
  canvas.width = s.width; canvas.height = s.height; canvas.getContext('2d').drawImage(s, 0, 0);
}
export function paintEnemyIcon(canvas, wave, type) {
  const art = enemyArt(wave, type), s = alienSprite(art.kind, art.palette);
  if (!s) return;
  canvas.width = s.width; canvas.height = s.height; canvas.getContext('2d').drawImage(s, 0, 0);
}
