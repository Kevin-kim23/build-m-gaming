// 전리품 상점 지원품 그림(48×48 자체 제작 픽셀). 외부 그림·보호 표장 없음. 한 번 그려서 재사용한다.
import { potionIcon } from './potion-art.js';

function canvas() {
  const shapes = [];
  return {
    r: (x, y, w, h, fill) => shapes.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`),
    p: (d, fill) => shapes.push(`<path d="${d}" fill="${fill}"/>`),
    svg: () => `<svg viewBox="0 0 48 48" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${shapes.join('')}</svg>`,
  };
}
const shadow = p => p('M9 41h30v4H9z', '#07141b55');

// 정예 교관단: 챙 넓은 교관모와 금빛 호루라기.
function instructors() {
  const { r, p, svg } = canvas(); shadow(p);
  p('M6 24h36l-3 5H9z', '#3a4a2c'); p('M8 24h32l-2 3H10z', '#6b7f4a');
  p('M14 10h20l4 14H10z', '#55693c'); p('M16 12h16l3 11H13z', '#7d9455'); r(17, 13, 6, 9, '#93ab66');
  r(13, 21, 22, 3, '#2f3b24'); r(14, 21, 20, 1, '#c9a75a');
  p('M20 14h8l-1 6h-6z', '#d8b45f'); r(22, 15, 4, 3, '#fff0b7'); r(23, 16, 2, 1, '#9b7a37');
  p('M24 31h10l3 3-3 3H24z', '#b38a3e'); p('M25 32h8l2 2-2 2h-8z', '#efd08c'); r(26, 33, 5, 1, '#fff4cf');
  r(18, 33, 6, 1, '#d9cfa7'); r(16, 34, 3, 4, '#d9cfa7'); r(19, 37, 5, 1, '#d9cfa7');
  r(35, 33, 3, 2, '#5a4422'); r(37, 30, 2, 2, '#fff2c2');
  return svg();
}
// 장비 연구소: 톱니바퀴 앞의 렌치와 청록 설계도.
function lab() {
  const { r, p, svg } = canvas(); shadow(p);
  r(6, 10, 26, 30, '#1d4656'); r(7, 11, 24, 28, '#2a6476'); for (let i = 0; i < 6; i++) { r(9, 14 + i * 4, 20, 1, '#5fb3c4'); }
  r(10, 16, 9, 7, '#9be0ea'); r(11, 17, 7, 5, '#2a6476'); r(13, 18, 3, 3, '#9be0ea');
  p('M31 14h6l1 3 3 1v6l-3 1-1 3h-6l-1-3-3-1v-6l3-1z', '#5d6a6e'); p('M32 15h4l1 3 3 1v4l-3 1-1 3h-4l-1-3-3-1v-4l3-1z', '#a3afb2');
  r(32, 19, 4, 4, '#3b4549'); r(33, 20, 2, 2, '#d7e0e2');
  p('M14 37l13-13 4 4-13 13z', '#7c8a8e'); p('M15 37l12-12 2 2-12 12z', '#d5dcdd');
  p('M25 21l5-4 5 5-4 5-3-3 2-2-2-2-2 2z', '#7c8a8e'); r(29, 19, 3, 2, '#eef3f3');
  r(12, 39, 4, 3, '#4b5659');
  return svg();
}
// 전투 교본: 금장 모서리와 별 문장이 있는 두꺼운 교범.
function manual() {
  const { r, p, svg } = canvas(); shadow(p);
  p('M9 9h28l3 3v29H12l-3-3z', '#3b1f1a'); p('M10 9h27v29H10z', '#8f3a2c'); r(11, 10, 25, 27, '#b24a36');
  r(37, 12, 3, 28, '#e9dcc0'); r(38, 13, 1, 26, '#fff8e6'); r(12, 38, 27, 3, '#e9dcc0');
  r(10, 9, 5, 5, '#d8b45f'); r(32, 9, 5, 5, '#d8b45f'); r(10, 33, 5, 5, '#d8b45f'); r(32, 33, 5, 5, '#d8b45f');
  r(14, 15, 19, 1, '#e3b36a'); r(14, 31, 19, 1, '#e3b36a');
  p('M23 17l2 5h5l-4 3 2 5-5-3-5 3 2-5-4-3h5z', '#f3d07a'); p('M23 19l1 4h4l-3 2 1 3-3-2-3 2 1-3-3-2h4z', '#fff0b7');
  r(16, 11, 2, 2, '#ffe6a8');
  return svg();
}
// 군수 금고: 금화가 비치는 강철 금고.
function vault() {
  const { r, p, svg } = canvas(); shadow(p);
  r(7, 10, 34, 31, '#2c3a40'); r(8, 11, 32, 29, '#5c6e75'); r(9, 12, 30, 2, '#9fb1b6'); r(9, 37, 30, 2, '#3c4a50');
  r(12, 15, 24, 20, '#43545a'); r(13, 16, 22, 18, '#6f838a');
  p('M24 18a7 7 0 1 1 0 14a7 7 0 1 1 0-14z', '#c9a75a'); p('M24 20a5 5 0 1 1 0 10a5 5 0 1 1 0-10z', '#f0d48c');
  r(23, 19, 2, 12, '#7a5c26'); r(18, 24, 12, 2, '#7a5c26'); r(23, 24, 2, 2, '#fff4cf');
  r(37, 20, 2, 10, '#2c3a40'); r(10, 41, 5, 2, '#2c3a40'); r(33, 41, 5, 2, '#2c3a40');
  for (const [x, y] of [[4, 34], [40, 30], [42, 36]]) { r(x, y, 4, 4, '#a87d2e'); r(x, y, 4, 2, '#f3d07a'); r(x + 1, y, 2, 1, '#fff4cf'); }
  return svg();
}
const draw = { instructors, lab, manual, vault };
const cache = new Map();
export function marketIcon(item) {
  if (item.potion) return potionIcon(item.potion);
  if (!cache.has(item.id)) cache.set(item.id, draw[item.id]());
  return cache.get(item.id);
}
