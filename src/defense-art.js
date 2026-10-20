// 무한 방어전 전장 그림: 바닥·길·자리 틀은 한 번만 그려 두고(구간·크기가 바뀔 때만 다시),
// 매 프레임에는 장비·적·사격만 얹는다. 장비 그림은 본편 전투 그림(진영 외곽선 캐시)을 그대로 쓴다.
import { MAP, PATH, PADS, BASE_POS, TOWERS, BOSS_STUN } from './defense-data.js';
import { roadBackdropCanvas, TILE_W, TILE_H } from './road-backdrop.js';
import { battleHeadquartersSprite } from './battle-hq-art.js';
import { teamSprite } from './lane-art.js';
import { towerId, towerStats } from './defense-run.js';
import { BAY_POS } from './defense-markup.js';
import { reportError } from './diagnostics.js';

const ROAD = Object.freeze({ earth: ['#3a3222', '#8d7b55', '#a28f63'], space: ['#141a2e', '#39476a', '#4a5a82'], abyss: ['#1a0a10', '#4a2530', '#5c3038'] });
const SHOT = Object.freeze({ armor: '#ffd293', firepower: '#ffb08a', air: '#9fe8ff' });
const BAY_ART = Object.freeze({ transport: 'transport', recon: 'droneCarrier' });
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
  for (const [px, py] of PADS) frame(x, px, py, 'rgba(20,28,24,.72)', '#c9d6c4aa', [5, 4]);
  for (const [bx, by] of Object.values(BAY_POS)) frame(x, bx, by, 'rgba(40,30,60,.75)', '#c9a2ff', []);
  draw(x, battleHeadquartersSprite('corps', 'player'), BASE_POS[0], BASE_POS[1], 104);
  return c;
}
function frame(x, cx, cy, fill, stroke, dash) {
  x.fillStyle = fill; x.beginPath(); x.roundRect(cx - 27, cy - 27, 54, 54, 10); x.fill();
  x.strokeStyle = stroke; x.lineWidth = 1.5; x.setLineDash(dash); x.stroke(); x.setLineDash([]);
}
function draw(x, img, cx, cy, w, flip = false) {
  const h = img.height / img.width * w;
  x.save(); x.translate(cx, cy); if (flip) x.rotate(Math.PI); x.drawImage(img, -w / 2, -h / 2, w, h); x.restore();
}
const sprite = (id, side) => teamSprite(id, side, 12).canvas;

// view: { selected: {pad|bay|base}|null, moveFrom: pad|null }
export function drawDefense(canvas, run, theme, view = {}) {
  try {
    const scale = canvas.width / MAP.width, key = `${theme}:${canvas.width}`;
    if (key !== staticKey) { staticLayer = paintStatic(theme, scale); staticKey = key; }
    const x = canvas.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0); x.imageSmoothingEnabled = false;
    x.drawImage(staticLayer, 0, 0);
    x.setTransform(scale, 0, 0, scale, 0, 0);
    drawSelection(x, run, view);
    run.pads.forEach((t, i) => {
      const [px, py] = PADS[i];
      if (!t) { plus(x, px, py, view.moveFrom !== null && view.moveFrom !== undefined); return; }
      if (t.stunnedUntil > run.time) { x.globalAlpha = 0.45; }
      draw(x, sprite(TOWERS[towerId(t)].art, 'player'), px, py, 40);
      x.globalAlpha = 1;
    });
    for (const [id, [bx, by]] of Object.entries(BAY_POS)) if (run.bays[id]) draw(x, sprite(BAY_ART[id], 'player'), bx, by, 40);
    else plus(x, bx, by, false);
    if (run.warning) {
      const [wx, wy] = PADS[run.warning.at] ?? BASE_POS;
      x.strokeStyle = '#ff6b6b'; x.lineWidth = 2; x.setLineDash([6, 5]); x.beginPath(); x.arc(wx, wy, BOSS_STUN.radius, 0, 7); x.stroke(); x.setLineDash([]);
    }
    for (const e of run.enemies) {
      const w = e.big ? 84 : e.boss ? 52 : 30;
      if (e.stealth) x.globalAlpha = 0.5;
      draw(x, sprite(e.def.art ?? 'tank', 'enemy'), e.x, e.y, w, true);
      x.globalAlpha = 1;
      if (e.hp < e.maxHp) { x.fillStyle = '#000a'; x.fillRect(e.x - w / 2, e.y - w / 2 - 6, w, 3); x.fillStyle = e.boss ? '#ff6b6b' : '#e6c27a'; x.fillRect(e.x - w / 2, e.y - w / 2 - 6, w * Math.max(0, e.hp / e.maxHp), 3); }
      if (e.shield > 0) { x.strokeStyle = '#9fe8ffcc'; x.lineWidth = 1.5; x.beginPath(); x.arc(e.x, e.y, w * 0.62, 0, 7); x.stroke(); }
    }
    for (const f of run.fx) {
      const age = run.time - f.at;
      if (age > 0.18) continue;
      x.globalAlpha = 1 - age / 0.18; x.strokeStyle = SHOT[f.line]; x.lineWidth = 2.5;
      x.beginPath(); x.moveTo(f.x0, f.y0); x.lineTo(f.x1, f.y1); x.stroke();
      x.fillStyle = 'rgba(255,245,220,.9)'; x.beginPath(); x.arc(f.x1, f.y1, f.splash ? f.splash * 0.5 : 5, 0, 7); x.fill();
      x.globalAlpha = 1;
    }
  } catch (error) { reportError('defense.draw', error); }
}
function plus(x, cx, cy, hot) {
  x.fillStyle = hot ? '#e6c27a' : '#c9d6c4aa'; x.font = '800 22px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('+', cx, cy + 1);
}
function drawSelection(x, run, view) {
  const s = view.selected;
  if (s?.pad === undefined) return;
  const t = run.pads[s.pad], [px, py] = PADS[s.pad];
  x.strokeStyle = '#e6c27a'; x.lineWidth = 3; x.beginPath(); x.roundRect(px - 28, py - 28, 56, 56, 10); x.stroke();
  if (!t) return;
  x.fillStyle = 'rgba(230,194,122,.1)'; x.strokeStyle = 'rgba(230,194,122,.8)'; x.lineWidth = 1.5;
  x.beginPath(); x.arc(px, py, towerStats(run, t).range, 0, 7); x.fill(); x.stroke();
}
