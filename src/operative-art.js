// Original pixel illustrations: clothing, tools and insignia use only our own geometry.
// No external images, fonts, heraldry or protected medical symbols are embedded.
import { OPERATIVES } from './loot.js';

const cache = new Map();
function canvas() {
  const shapes = [];
  return {
    r: (x, y, w, h, fill) => shapes.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`),
    p: (d, fill) => shapes.push(`<path d="${d}" fill="${fill}"/>`),
    svg: (width, height) => `<svg viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${shapes.join('')}</svg>`,
  };
}

// A bevelled supply case. Large faces and the central latch remain readable at 24px.
const lootArt = (() => {
  const { r, p, svg } = canvas();
  p('M8 39h32v4H8z', '#07141b55');
  p('M3 13 12 7h28l6 7v25l-9 6H9l-6-5z', '#162a30');
  p('M5 14 13 9h26l5 6-8 5H10z', '#f3cf80');
  p('M10 20h26v22H10L5 38V15z', '#b18b45');
  p('M36 20 44 15v23l-8 4z', '#765b32');
  r(11, 22, 24, 3, '#efd08c'); r(11, 25, 24, 11, '#c49a50'); r(11, 36, 24, 3, '#a17838');
  p('M7 14 14 10h23l3 3-6 4H12z', '#ffe5a4');
  p('M8 17h4v23H8zM33 19h4v24h-4z', '#3b4c4e');
  r(9, 20, 2, 18, '#82918a'); r(34, 22, 2, 18, '#a5aa8d');
  r(13, 27, 19, 2, '#a57c39'); r(13, 30, 19, 2, '#d5af64');
  r(20, 17, 8, 15, '#665735'); r(21, 18, 6, 12, '#f8d98e');
  r(22, 22, 4, 5, '#4b5650'); r(23, 23, 2, 3, '#a9b9aa');
  r(16, 7, 15, 2, '#2f454a'); r(16, 6, 3, 3, '#74918b'); r(28, 6, 3, 3, '#74918b');
  r(6, 15, 3, 3, '#fff0bc'); r(38, 18, 2, 3, '#d1b16b');
  r(12, 23, 2, 2, '#fff0b5'); r(31, 37, 2, 2, '#ead398');
  return svg(48, 48);
})();
export const lootIcon = () => lootArt;

const skin = { light: '#e9c5a0', mid: '#c69774', shadow: '#92644e', deep: '#4b3e37' };
function face(c, x, y, mask = false) {
  const { r, p } = c;
  p(`M${x + 3} ${y}h22v5h3v16h-4v6H${x + 7}v-3h-4v-5H${x}v-13h3z`, skin.shadow);
  r(x + 4, y + 2, 19, 20, skin.mid); r(x + 5, y + 2, 15, 16, skin.light);
  r(x + 1, y + 9, 4, 8, skin.mid); r(x + 24, y + 9, 3, 7, skin.shadow);
  r(x + 5, y + 8, 6, 2, skin.deep); r(x + 17, y + 8, 5, 2, skin.deep);
  r(x + 8, y + 10, 2, 2, '#182b31'); r(x + 18, y + 10, 2, 2, '#182b31');
  r(x + 13, y + 10, 3, 7, skin.mid); r(x + 15, y + 15, 3, 2, skin.shadow);
  r(x + 9, y + 21, 10, 2, skin.shadow); r(x + 9, y + 26, 11, 5, skin.mid);
  if (mask) { r(x + 3, y + 16, 22, 10, '#263b42'); r(x + 5, y + 17, 18, 2, '#5c7071'); r(x + 7, y + 21, 14, 1, '#162b33'); }
}
function legs(c, colors, wide = false) {
  const { r, p } = c;
  p(wide ? 'M26 74h45v10h-3v16H52V86H43v14H27z' : 'M28 74h38v9h-2v17H50V87H43v13H29z', colors.dark);
  r(30, 76, 11, 22, colors.mid); r(52, 78, 10, 19, colors.mid);
  r(31, 77, 3, 18, colors.light); r(53, 82, 2, 13, colors.light);
  r(29, 87, 12, 7, colors.dark); r(53, 88, 10, 6, colors.dark);
  r(31, 88, 8, 2, colors.mid); r(55, 89, 6, 2, colors.mid);
  p('M27 97h17v10H23v-5h4zM50 97h15v5h7v5H49z', '#14232a');
  r(27, 99, 13, 3, '#415158'); r(52, 99, 11, 3, '#35474e');
  r(24, 105, 19, 2, '#09191f'); r(50, 105, 21, 2, '#09191f');
  for (const x of [31, 55]) { r(x, 99, 5, 1, '#81918c'); r(x, 102, 5, 1, '#60716f'); }
}
function pouch(c, x, y, colors, width = 10) {
  c.r(x, y, width, 13, colors.dark); c.r(x + 1, y + 1, width - 2, 10, colors.mid);
  c.r(x + 1, y + 1, width - 2, 3, colors.light); c.r(x + 4, y + 4, 2, 5, colors.dark);
  c.r(x + 4, y + 5, 2, 2, '#b4bba5');
}
function torso(c, colors, accent) {
  const { r, p } = c;
  p('M28 40h12v-4h16v4h12v4h9v31h-9v7H26v-7h-8V47h10z', colors.dark);
  p('M28 43h38v34H27z', colors.mid); r(30, 44, 7, 29, colors.light);
  p('M36 40h8l4 10-8 4zM52 40h8l-7 14-5-4z', colors.light);
  r(44, 48, 9, 29, colors.dark); r(47, 51, 2, 24, '#a6ada0');
  r(20, 47, 8, 22, colors.mid); r(21, 47, 3, 15, colors.light);
  r(67, 47, 8, 23, colors.mid); r(71, 51, 4, 17, colors.dark);
  r(20, 51, 8, 5, accent); r(21, 52, 6, 2, '#d5dbc6');
  pouch(c, 32, 55, colors); pouch(c, 55, 55, colors);
  r(27, 75, 41, 5, '#192c31'); r(44, 75, 10, 5, '#b6a776'); r(46, 76, 6, 3, '#45534e');
}

function duty(c) {
  const { r, p } = c;
  const a = { dark: '#233b49', mid: '#476477', light: '#7d97a4' };
  r(64, 30, 12, 29, '#263b44'); r(66, 32, 8, 23, '#5b7480');
  legs(c, a); torso(c, a, '#8cbdd0'); face(c, 33, 13);
  p('M29 16V9h5V6h24v3h5v11H33v-4z', '#233945');
  r(35, 8, 21, 6, '#66889b'); r(35, 8, 17, 2, '#9cb5bb');
  r(31, 14, 31, 5, '#304d5e'); r(32, 15, 21, 2, '#84a8b6');
  r(40, 10, 8, 3, '#d6cb99'); r(42, 9, 4, 2, '#f5e4b2');
  p('M30 19h-3v16h5v-6h-2zM61 18h4v15h-6v-9h2z', '#152a35');
  r(27, 22, 5, 10, '#77949d'); r(61, 22, 5, 10, '#758993');
  r(28, 24, 3, 6, '#314b59'); r(62, 24, 3, 6, '#263d49');
  p('M64 31h3v7H54v-3h10z', '#1c3039'); r(52, 34, 5, 3, '#8ba5a9');
  // Slanted field tablet with a map grid and a bright cursor.
  p('M40 58h36v5h4v26H43v-5h-3z', '#142b35');
  p('M43 60h30v5h4v20H46v-5h-3z', '#5c7b87');
  r(47, 64, 25, 17, '#172f3c'); r(49, 66, 21, 13, '#2a5363');
  for (const x of [53, 60, 67]) r(x, 66, 1, 13, '#416c75');
  for (const y of [70, 75]) r(49, y, 21, 1, '#416c75');
  p('M51 76h6v-7h7v4h5v2h-7v-4h-3v7h-8z', '#a0d9cf');
  r(65, 67, 4, 3, '#f4df9f'); r(73, 72, 2, 6, '#c0cbb7');
  p('M21 67h9v4h12v9H27v-3h-6z', '#7e969f');
  r(35, 71, 10, 8, skin.mid); r(36, 71, 8, 3, skin.light);
  r(74, 65, 7, 11, skin.mid); r(75, 65, 5, 4, skin.light);
  r(28, 44, 10, 3, '#a4b3af'); r(30, 45, 6, 1, '#d7e5d5');
}

function scout(c) {
  const { r, p } = c;
  const a = { dark: '#263f38', mid: '#4f6c52', light: '#91a480' };
  // Wide weather cloak and raised binoculars give this scout a distinct outline.
  p('M26 37h43l9 45H65v7H24V76H17l5-29z', '#203b36');
  legs(c, a, true); torso(c, a, '#89bbb1'); face(c, 32, 14);
  p('M24 31V15h5V9h7V5h23v4h7v8h6v22H60v-9h3V18h-6v-6H39v6h-7v13z', '#29453b');
  p('M25 22V14h6v-4h8V7h17v4H38v7h-7v15h-6z', '#7c9470');
  p('M62 15h5v12h4v11H61v-8h3V18h-2z', '#526f50');
  p('M26 37h12l-2 22-8 10-2 16H16l6-16V50z', '#718467');
  p('M59 37h11l7 20v26H66l-2-20z', '#4d694f');
  for (const [x, y, w, h, col] of [[29, 11, 8, 3, a.dark], [24, 24, 6, 5, a.mid], [23, 48, 8, 4, a.dark], [18, 74, 7, 4, a.dark], [61, 45, 10, 4, a.light], [67, 62, 8, 5, a.dark], [58, 72, 7, 4, a.light], [31, 81, 7, 4, a.dark]]) r(x, y, w, h, col);
  p('M25 47h9v-8h7v-7h8v12h-9v12H25z', '#879b79');
  p('M60 43h9v6h6v10H63v-9h-7z', '#647d5b');
  r(36, 33, 8, 8, skin.mid); r(36, 33, 7, 3, skin.light);
  r(58, 35, 8, 8, skin.mid); r(59, 35, 6, 3, skin.light);
  r(40, 25, 25, 15, '#152c2b'); r(44, 24, 5, 3, '#78958c');
  r(41, 26, 9, 13, '#587872'); r(55, 26, 9, 13, '#587872');
  r(42, 28, 7, 8, '#0d252d'); r(56, 28, 7, 8, '#0d252d');
  r(43, 29, 4, 4, '#91d3cd'); r(57, 29, 4, 4, '#91d3cd');
  r(44, 29, 3, 1, '#e0f4e7'); r(58, 29, 3, 1, '#e0f4e7');
  r(51, 29, 3, 8, '#77958c'); r(50, 38, 5, 2, '#111f27');
  pouch(c, 20, 80, a, 12); r(66, 79, 8, 14, '#2c4540'); r(68, 80, 4, 8, '#96aa8c');
}

function supply(c) {
  const { r, p } = c;
  const a = { dark: '#4a4536', mid: '#81775b', light: '#b7ad87' };
  p('M22 32h49v45H20V39z', '#4a493b'); r(23, 36, 12, 28, '#82775a');
  r(21, 39, 4, 28, '#afa17b'); r(69, 35, 7, 37, '#3c4035');
  r(24, 33, 46, 5, '#b4a47c');
  legs(c, a, true); torso(c, a, '#dfa578'); face(c, 33, 13);
  p('M28 16V9h5V5h24v3h7v9h5v6H28z', '#4c5143');
  r(34, 7, 22, 8, '#a3a484'); r(35, 7, 17, 3, '#d2c5a0');
  r(29, 15, 36, 5, '#69745e'); r(30, 16, 25, 2, '#b3b18a');
  r(59, 12, 5, 7, '#303e36'); r(29, 21, 4, 9, '#516353');
  r(40, 11, 12, 3, '#52604a'); r(43, 11, 6, 2, '#dfcf8f');
  p('M35 41h6v13h-6zM58 41h5v13h-5z', '#d6b484');
  r(36, 43, 3, 7, '#6a5844'); r(59, 43, 3, 7, '#6a5844');
  // Chest-level load, reinforced lid, straps, steel corners and shipping chevrons.
  p('M16 62 24 54h48l9 8v31H24l-8-7z', '#3a3e35');
  p('M19 62 26 57h45l6 5-7 6H25z', '#d9b579');
  p('M25 68h45v23H25l-6-6V63z', '#967343');
  p('M70 68 78 62v24l-8 5z', '#5e553b');
  r(27, 69, 41, 3, '#cda265'); r(27, 73, 41, 12, '#b08c55'); r(27, 86, 41, 3, '#705c3d');
  r(31, 63, 6, 28, '#384b43'); r(58, 63, 6, 28, '#384b43');
  r(32, 65, 2, 23, '#89958a'); r(59, 65, 2, 23, '#89958a');
  r(41, 72, 13, 11, '#384b43'); r(43, 74, 9, 7, '#d9c18d');
  p('M44 76h2v-1h3v1h2v2h-3v2h-2v-2h-2z', '#8b6b3d');
  r(21, 63, 5, 4, '#e2ce9a'); r(66, 66, 4, 4, '#dfc58d');
  r(14, 67, 9, 12, skin.mid); r(15, 67, 7, 4, skin.light);
  r(75, 65, 9, 13, skin.mid); r(76, 65, 7, 4, skin.light);
  r(15, 73, 6, 1, skin.shadow); r(78, 73, 5, 1, skin.shadow);
}

function quartermaster(c) {
  const { r, p } = c;
  const a = { dark: '#303447', mid: '#51566b', light: '#8c91a4' };
  legs(c, a);
  p('M28 39h12v-3h16v3h12v6h7v29l5 20H52l-5-11-5 11H17l5-23V46h6z', a.dark);
  p('M29 42h16v39l-6 10H23l5-29zM53 42h13l1 23 8 26H55l-6-11V47z', a.mid);
  p('M31 42h7l-7 45h-5z', a.light); r(60, 47, 4, 28, '#73788c');
  r(22, 47, 8, 25, a.mid); r(23, 47, 3, 17, a.light); r(67, 47, 8, 24, a.mid);
  face(c, 33, 12);
  p('M27 14V8h7V4h25v4h6v9H29z', '#262d3c');
  r(34, 6, 25, 7, '#777e93'); r(35, 6, 19, 2, '#b2b6c0');
  r(28, 13, 36, 4, '#c5af78'); r(28, 17, 34, 4, '#222b37');
  r(32, 17, 24, 2, '#637080'); r(44, 7, 7, 6, '#d7bd7d'); r(46, 8, 3, 3, '#f4e4a5');
  p('M37 39h8l3 7 5-7h7l-4 16-7-4-9 4z', '#abb3bc');
  p('M45 41h6l-2 5 3 17-5 4-4-4 3-17z', '#273341');
  r(28, 42, 10, 3, '#d9bb79'); r(59, 42, 10, 3, '#d9bb79');
  for (const y of [57, 66, 75]) { r(41, y, 2, 2, '#e4ca8f'); r(53, y, 2, 2, '#e4ca8f'); }
  r(26, 73, 42, 5, '#24303b'); r(44, 73, 10, 5, '#bdab7c'); r(46, 74, 6, 3, '#58636d');
  // Field ledger under the left arm, pocket watch held outward on a short chain.
  p('M13 60h21v29H16v-3h-3z', '#202b39'); r(16, 62, 15, 24, '#9781a6');
  r(18, 64, 11, 3, '#d5c6c6'); r(18, 71, 11, 1, '#5e526d'); r(18, 74, 9, 1, '#5e526d');
  r(16, 84, 15, 2, '#ddd2b8'); r(18, 57, 9, 10, skin.mid); r(19, 57, 6, 4, skin.light);
  p('M68 65h9v6h-6v6h-5V66z', skin.mid); r(69, 64, 7, 4, skin.light);
  p('M59 76h3v3h3v3h4v-7h2v10h-7v-3h-4v-3h-1z', '#bea86e');
  r(73, 69, 4, 4, '#d8be79'); p('M69 73h12v3h3v12h-3v3H69v-3h-3V76h3z', '#8e774b');
  p('M70 74h10v3h3v10h-3v3H70v-3h-3V77h3z', '#e6c989');
  r(70, 77, 10, 10, '#f4e7bd'); r(74, 78, 2, 6, '#404d5a'); r(75, 82, 4, 2, '#404d5a');
  r(71, 77, 7, 1, '#fff5da');
}

function operative(c) {
  const { r, p } = c;
  const a = { dark: '#182833', mid: '#344956', light: '#637580' };
  r(25, 27, 47, 44, '#14232c'); r(66, 29, 9, 38, '#344853'); r(69, 30, 2, 32, '#657984');
  r(70, 15, 2, 19, '#a8b4ac'); r(69, 12, 4, 5, '#273d47');
  legs(c, a, true); torso(c, a, '#c9ae70'); face(c, 32, 12, true);
  p('M27 22V10h6V5h25v4h7v14h-7v-6H35v5z', '#14232d');
  p('M29 16v-6h6V7h21v4H35v5z', '#687b83'); r(32, 13, 27, 7, '#3e5662');
  r(30, 20, 34, 10, '#111f28'); r(33, 21, 12, 8, '#8d784c'); r(49, 21, 12, 8, '#8d784c');
  r(35, 22, 8, 5, '#cfb56c'); r(51, 22, 8, 5, '#cfb56c');
  r(35, 22, 7, 2, '#fff1b4'); r(51, 22, 7, 2, '#fff1b4'); r(45, 23, 4, 4, '#536a72');
  r(30, 31, 5, 10, '#1b2e38'); r(59, 29, 7, 10, '#1b2e38');
  r(29, 24, 3, 5, '#819492'); r(62, 24, 3, 5, '#819492');
  p('M32 42h30v29H32z', '#283c47'); r(35, 43, 24, 3, '#5a707c');
  for (const y of [49, 56, 63]) { r(35, y, 24, 3, '#152a35'); r(35, y, 22, 1, '#78908f'); }
  r(39, 42, 4, 28, '#455e66'); r(53, 42, 4, 28, '#455e66');
  r(20, 46, 8, 8, '#b59d67'); r(21, 48, 6, 2, '#e4ca84');
  pouch(c, 22, 69, a, 11); pouch(c, 61, 67, a, 11);
  // Armoured gold case held low, matching the Max booster supply role.
  p('M52 77v-4h19v4h9v23H48V77z', '#12242d');
  r(56, 74, 11, 4, '#a99b70'); r(58, 75, 7, 2, '#253a43');
  r(51, 79, 26, 18, '#aa8545'); r(52, 79, 24, 4, '#e2c581');
  r(53, 85, 22, 9, '#c7a45d'); r(54, 86, 20, 2, '#e8cc8b');
  r(51, 80, 4, 17, '#5b6260'); r(73, 80, 4, 17, '#5b6260');
  r(52, 82, 2, 13, '#b2b69a'); r(74, 82, 2, 13, '#999e87');
  r(61, 84, 7, 9, '#465653'); r(63, 85, 3, 5, '#e7cd8b');
  r(64, 89, 1, 2, '#3a4d4c'); r(52, 79, 3, 2, '#fff0b7');
  r(61, 68, 9, 8, '#223843'); r(62, 69, 7, 3, '#697d83');
  r(19, 67, 9, 11, '#192f3a'); r(20, 68, 7, 3, '#60767d');
  r(22, 79, 4, 15, '#1a303a'); r(23, 80, 2, 8, '#8da09b');
}

const draw = { duty, scout, supply, quartermaster, operative };
export function operativeIcon(id) {
  if (cache.has(id)) return cache.get(id);
  if (!OPERATIVES.some(o => o.id === id)) throw new RangeError('Unknown operative');
  const c = canvas();
  c.p('M21 104h53v3h6v3H16v-3h5z', '#07151b66');
  draw[id](c);
  const svg = c.svg(96, 112);
  cache.set(id, svg);
  return svg;
}
