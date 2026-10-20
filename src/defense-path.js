// 무한 방어전 길 계산: 길 위 거리 → 좌표, 점과 길 사이 거리. 길은 한 번만 미리 계산해 둔다.
import { PATH, BASE_POS } from './defense-data.js';

const segments = PATH.slice(1).map(([x, y], i) => {
  const [px, py] = PATH[i];
  return { x0: px, y0: py, dx: x - px, dy: y - py, length: Math.hypot(x - px, y - py) };
});
let start = 0;
for (const s of segments) { s.start = start; start += s.length; }
export const PATH_LENGTH = start;

// 길을 따라 distance만큼 간 곳. 끝을 넘으면 길 끝(기지 앞)에 머문다.
export function pointAt(distance) {
  const d = Math.min(Math.max(distance, 0), PATH_LENGTH);
  const s = segments.find(seg => d <= seg.start + seg.length) ?? segments.at(-1);
  const t = s.length ? (d - s.start) / s.length : 0;
  return [s.x0 + s.dx * t, s.y0 + s.dy * t];
}

const pointToSegment = (x, y, s) => {
  const t = Math.min(1, Math.max(0, ((x - s.x0) * s.dx + (y - s.y0) * s.dy) / (s.length * s.length)));
  return Math.hypot(x - (s.x0 + s.dx * t), y - (s.y0 + s.dy * t));
};
export const distanceToPath = (x, y) => Math.min(...segments.map(s => pointToSegment(x, y, s)));

// 사거리 안에 길이 몇 갈래 들어오는지(명당 판단). 이어진 같은 직선 구간은 하나로 센다.
export function pathStretchesInRange(x, y, range) {
  let count = 0, inside = false;
  for (let d = 0; d <= PATH_LENGTH; d += 4) {
    const [px, py] = pointAt(d), now = Math.hypot(px - x, py - y) <= range;
    if (now && !inside) count++;
    inside = now;
  }
  return count;
}

// 공중 적: 출발점에서 기지까지 직선.
export const airLength = ([x, y]) => Math.hypot(BASE_POS[0] - x, BASE_POS[1] - y);
export function airPointAt(from, distance) {
  const total = airLength(from), t = total ? Math.min(1, Math.max(0, distance / total)) : 1;
  return [from[0] + (BASE_POS[0] - from[0]) * t, from[1] + (BASE_POS[1] - from[1]) * t];
}
