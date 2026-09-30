import { fieldTheme, concreteTerrain } from './field-theme.js';
import { ownedSchools, layoutFieldSchools, fieldArmyArea } from "./field-schools.js";
import { renderFieldLabels } from "./field-labels.js";
import { artSurface, uniformDetails, ART_SCALE } from "./pixel-detail.js";
import {
  fieldSummary,
  layoutFieldArmy,
  layoutFieldEquipment,
} from "./field-layout.js";
import { FORMATIONS } from "./formations.js";
import { UNITS } from "./units.js";
import { deployedEquipment } from "./equipment.js";
import { drawEquipmentOnGround } from "./equipment-art.js";
// Every sprite is original geometry. Static terrain and sprites are cached.
const sprites = new Map();
const scenes = new WeakMap();
function r(c, x, y, w, h, color) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), w, h);
}
function terrain(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d");
  let seed = 517;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  r(c, 0, 0, w, h, "#9b9272");
  for (let i = 0; i < (w * h) / 25; i++)
    r(
      c,
      rand() * w,
      rand() * h,
      1 + Math.floor(rand() * 3),
      1,
      ["#a79d7c", "#92896b", "#a09877", "#8f876a"][Math.floor(rand() * 4)],
    );
  for (let y = 0; y < h; y += 3)
    for (let x = 0; x < w; x += 3) {
      const edge = Math.min(x, w - x),
        d = 6 + Math.sin(y * 0.05) * 5 + Math.sin(y * 0.12) * 3;
      if (edge < d + rand() * 6)
        r(
          c,
          x,
          y,
          3,
          3,
          ["#656f49", "#737b4f", "#596744", "#7c8155"][Math.floor(rand() * 4)],
        );
    }
  for (let i = 0; i < 90; i++) r(c, rand() * w, rand() * 12, 3, 2, "#737b50");
  for (const [xx, yy] of [
    [0.16, 0.21],
    [0.77, 0.16],
    [0.84, 0.64],
    [0.22, 0.74],
    [0.63, 0.84],
    [0.1, 0.49],
    [0.89, 0.35],
  ]) {
    const x = xx * w,
      y = yy * h;
    r(c, x + 1, y + 2, 4, 2, "#827d62");
    r(c, x, y, 4, 2, "#b4ae91");
    r(c, x + 1, y - 1, 2, 1, "#c6bfa0");
  }
  // Border stones, drainage and grass tufts, kept away from the army's center.
  for(let y=18;y<h-12;y+=12){r(c,8,y,2,7,'#81826b');r(c,8,y,1,7,'#b1af8b');r(c,w-10,y,2,7,'#81826b');}
  return canvas;
}
function soldier(c) {
  r(c, 2, 21, 13, 3, "#4b513e55");
  r(c, 3, 16, 4, 7, "#30392f");
  r(c, 9, 16, 4, 7, "#30392f");
  r(c, 2, 10, 12, 8, "#66764c");
  r(c, 1, 11, 3, 7, "#78855b");
  r(c, 13, 11, 2, 7, "#566a44");
  r(c, 1, 18, 3, 2, "#c5ab83");
  r(c, 13, 18, 2, 2, "#baa27c");
  r(c, 5, 11, 3, 2, "#435c3c");
  r(c, 9, 14, 4, 3, "#465d3e");
  r(c, 5, 7, 7, 4, "#bda37e");
  r(c, 6, 8, 5, 2, "#d3bb95");
  r(c, 2, 3, 13, 6, "#374d36");
  r(c, 4, 1, 9, 3, "#4f6946");
  r(c, 3, 3, 10, 2, "#8e9b6b");
  r(c, 2, 8, 13, 2, "#314a36");
  r(c, 9, 4, 5, 3, "#526b45");
}
function sergeant(c) {
  // Distinct silhouette: navy beret, dark uniform, gold shoulder/rank marks.
  r(c, 2, 23, 15, 3, "#35433855");
  r(c, 4, 17, 4, 8, "#263537");
  r(c, 11, 17, 4, 8, "#263537");
  r(c, 3, 10, 13, 10, "#354d4a");
  r(c, 1, 11, 3, 9, "#435f58");
  r(c, 15, 11, 2, 9, "#2a413e");
  r(c, 2, 20, 2, 2, "#c2a681");
  r(c, 15, 20, 2, 2, "#c2a681");
  r(c, 6, 6, 7, 5, "#cfb18b");
  r(c, 7, 7, 5, 2, "#dfc39b");
  r(c, 3, 2, 13, 5, "#233745");
  r(c, 5, 1, 11, 3, "#385061");
  r(c, 2, 5, 13, 2, "#182b36");
  r(c, 12, 3, 2, 2, "#e6cb7d");
  r(c, 3, 10, 3, 2, "#d5ba72");
  r(c, 13, 10, 3, 2, "#d5ba72");
  r(c, 8, 13, 1, 1, "#e8cc7f");
  r(c, 9, 14, 1, 1, "#e8cc7f");
  r(c, 10, 13, 1, 1, "#e8cc7f");
  r(c, 4, 18, 11, 2, "#253d38");
  r(c, 8, 18, 2, 2, "#bfaa70");
}
function shell(c, x, y, w, h) {
  r(c, x + 3, y + 5, w, h, "#36433555");
  r(c, x, y, w, h, "#5a6c53");
  r(c, x, y, w - 3, h - 3, "#879477");
  r(c, x + 2, y + 2, w - 7, h - 6, "#a5ac89");
  r(c, x, y + h - 4, w, 4, "#4c604b");
  r(c, x + 3, y + h - 4, w - 6, 1, "#b9b998");
  r(c, x - 2, y - 3, w + 4, 6, "#465b46");
  r(c, x, y - 7, w, 5, "#667756");
  r(c, x + 2, y - 7, w - 4, 2, "#9aa17a");
  facadeDetail(c,x,y,w,h);
  for (let i = 5; i < w - 2; i += 7) r(c, x + i, y - 5, 1, 4, "#4c6648");
}
function facadeDetail(c,x,y,w,h) {
  const p=(a,b,d,e,color)=>{c.fillStyle=color;c.fillRect(a,b,d,e);};
  for(let yy=y+5;yy<y+h-4;yy+=4)for(let xx=x+3;xx<x+w-5;xx+=7){p(xx,yy,4,.33,'#738369');p(xx+4,yy, .33,3,'#95a184');}
  p(x+1,y+1,.5,h-6,'#d3d3ad');p(x+w-3,y,1,h-4,'#3c5646');
  for(let xx=x+5;xx<x+w-6;xx+=10){p(xx,y-5,5,2,'#405a48');p(xx,y-5,5,.4,'#b6c5a3');}
}
function windowPane(c, x, y, w = 5, h = 5) {
  r(c, x - 1, y - 1, w + 2, h + 2, "#586953");
  r(c, x, y, w, h, "#526f70");
  r(c, x, y, w, 1, "#c8dac6");
  r(c, x, y, 1, h, "#abc3b2");
  r(c, x + 1, y + 1, 2, 2, "#89ada6");
  c.fillStyle="#dce1b9";c.fillRect(x+w/2,y,.35,h);c.fillRect(x,y+h/2,w,.35);
}
function door(c, x, y) {
  r(c, x, y, 5, 8, "#3d5143");
  r(c, x + 1, y, 3, 1, "#bbc0a0");
  r(c, x + 3, y + 4, 1, 1, "#c4bf88");
}
function building(c, id) {
  const headquarters = ["regiment", "division", "corps", "fieldArmy"].indexOf(
    id,
  );
  if (headquarters >= 0) {
    const { width, height } = FORMATIONS.find((f) => f.id === id);
    const base = height - 9,
      center = Math.floor(width / 2),
      towerW = 39 + headquarters * 6;
    shell(c, 4, base - 28, width - 12, 28);
    shell(c, 12, base - 39, width - 28, 39);
    const towerX = center - Math.floor(towerW / 2),
      towerY = 22;
    shell(c, towerX, towerY, towerW, base - towerY);
    for (let y = towerY + 5; y < base - 12; y += 11)
      for (let x = towerX + 5; x < towerX + towerW - 7; x += 10)
        windowPane(c, x, y);
    for (const x of [9, width - 18]) windowPane(c, x, base - 19);
    door(c, center - 2, base - 8);
    r(c, center - 9, base, 19, 3, "#bdb797");
    r(c, center + 7, 2, 2, 15, "#425c4d");
    r(c, center + 9, 3, 12, 6, "#d2c07e");
    for (let n = 0; n <= headquarters; n++)
      r(c, towerX + 5 + n * 6, 17, 3, 2, "#e3cd87");
    if (headquarters >= 2) {
      r(c, 9, base - 47, 2, 14, "#526b60");
      r(c, 5, base - 45, 10, 2, "#b6c3ae");
    }
    return;
  }
  if (id === "squad") {
    shell(c, 3, 10, 23, 15);
    windowPane(c, 7, 13, 5, 5);
    door(c, 17, 17);
  } else if (id === "platoon") {
    shell(c, 3, 11, 36, 23);
    for (let i = 0; i < 3; i++) windowPane(c, 8 + i * 10, 15, 5, 5);
    door(c, 18, 26);
    r(c, 34, 2, 1, 6, "#445d48");
    r(c, 31, 3, 7, 1, "#b6bba0");
  } else if (id === "company") {
    shell(c, 4, 13, 50, 34);
    r(c, 5, 31, 48, 2, "#708562");
    for (let row = 0; row < 2; row++)
      for (let col = 0; col < 3; col++)
        windowPane(c, 11 + col * 14, 18 + row * 12, 6, 5);
    door(c, 26, 39);
    r(c, 23, 47, 11, 2, "#bbb899");
    r(c, 46, 2, 2, 7, "#435b45");
    r(c, 48, 2, 5, 3, "#b8c48e");
  } else {
    shell(c, 3, 35, 21, 25);
    shell(c, 55, 35, 20, 25);
    shell(c, 14, 15, 49, 45);
    r(c, 15, 31, 47, 2, "#7e9069");
    r(c, 15, 43, 47, 2, "#7e9069");
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 4; col++)
        windowPane(c, 20 + col * 10, 21 + row * 11, 5, 5);
    windowPane(c, 7, 42, 5, 5);
    windowPane(c, 66, 42, 5, 5);
    door(c, 35, 52);
    r(c, 29, 60, 17, 3, "#c8c0a0");
    r(c, 53, 1, 2, 10, "#4e664b");
    r(c, 55, 2, 10, 5, "#b9cb8a");
    r(c, 57, 3, 5, 1, "#819d61");
    r(c, 22, 5, 13, 5, "#475e47");
    r(c, 24, 5, 9, 1, "#a7b08a");
  }
}
function sprite(id) {
  if (sprites.has(id)) return sprites.get(id);
  const type = UNITS[id] ?? FORMATIONS.find((item) => item.id === id);
  if (!type) throw new Error(`Unknown formation sprite: ${id}`);
  const canvas = artSurface(type.width, type.height);
  const c = canvas.getContext("2d");
  if (id === "soldier") soldier(c);
  else if (UNITS[id]) {
    sergeant(c);
    const u=UNITS[id];
    if (id !== "sergeant") {
      r(c, 3, 2, 13, 4, u.color);
      r(c, 12, 3, 2, 2, "#e7d293");
      r(c, 7, 12, 6, 7, "#354d4a");
      if(u.school==='officer') {
        r(c,9,12,2,1,"#eef0d1");r(c,8,13,4,2,"#eef0d1");r(c,9,15,2,1,"#eef0d1");
        r(c,3,10,3,2,"#eef0d1");r(c,13,10,3,2,"#eef0d1");
      } else for(let i=0;i<u.schoolLevel;i++)r(c,7,12+i*2,5,1,"#e7c679");
    }
  } else building(c, id);
  if (UNITS[id]) uniformDetails(c,id);
  sprites.set(id, canvas);
  return canvas;
}
export function drawFormationPortrait(canvas, id) {
  const c = canvas.getContext("2d"),
    asset = sprite(id);
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.imageSmoothingEnabled = false;
  const scale = Math.max(
    0.01,
    Math.min(
      UNITS[id] ? 3 / ART_SCALE : 1 / ART_SCALE,
      (canvas.width - 12) / asset.width,
      (canvas.height - 12) / asset.height,
    ),
  );
  const w = Math.round(asset.width * scale),
    h = Math.round(asset.height * scale);
  c.drawImage(
    asset,
    Math.floor((canvas.width - w) / 2),
    Math.floor((canvas.height - h) / 2),
    w,
    h,
  );
}
export const drawRecruitPortrait = (canvas) =>
  drawFormationPortrait(canvas, "soldier");
export function drawScene(canvas, count = 0, labelLayer = null) {
  const army =
    typeof count === "number" ? { soldiers: count, sergeants: 0 } : count;
  const theme = fieldTheme(army);
  const deployed = deployedEquipment(army);
  const schools = ownedSchools(army);
  const key =
    theme + ":" + fieldSummary(army) + ":" + deployed.map((d) => d.id + d.level).join(":") + ":" + schools.map(s => s.id + s.level).join(":");
  const width = Math.max(100, Math.round(canvas.clientWidth / 2)),
    height = Math.max(60, Math.round(canvas.clientHeight / 2));
  let cached = scenes.get(canvas);
  if (
    cached &&
    cached.width === width &&
    cached.height === height &&
    cached.key === key
  )
    return false;
  if (!cached || cached.width !== width || cached.height !== height || cached.theme !== theme) {
    canvas.width = width * ART_SCALE;
    canvas.height = height * ART_SCALE;
    cached = { width, height, theme, ground: theme === "concrete" ? concreteTerrain(width, height) : terrain(width, height) };
  }
  const c = canvas.getContext("2d");
  c.imageSmoothingEnabled = false;
  c.setTransform(ART_SCALE,0,0,ART_SCALE,0,0);
  c.clearRect(0, 0, width, height);
  c.drawImage(cached.ground, 0, 0);
  const equipmentItems = layoutFieldEquipment(deployed, width, height);
  const schoolItems = layoutFieldSchools(schools, equipmentItems, width, height);
  const area = fieldArmyArea(schoolItems, equipmentItems, width, height);
  const armyItems = layoutFieldArmy(army, area);
  for (const item of armyItems) {
    c.drawImage(sprite(item.id), item.x, item.y, item.width, item.height);
  }
  // Equipment is parked from the left along the bottom of the same terrain.
  for (const item of equipmentItems) {
    drawEquipmentOnGround(
      c,
      item.level,
      item.x,
      item.y,
      item.width,
      item.height,
      item.id,
    );
  }
  renderFieldLabels(labelLayer, armyItems, equipmentItems, width, height, schoolItems);
  scenes.set(canvas, { ...cached, key });
  return true;
}
