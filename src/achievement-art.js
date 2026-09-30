import { ACHIEVEMENTS } from "./achievements.js";

// Original 24 × 28 pixel insignia, not reproductions of real military medals.
const cache = new Map();
const palettes = [
  ["#54765a", "#92ad79", "#976842", "#d4b181"],
  ["#456478", "#8bacbd", "#8b9797", "#e0e5cc"],
  ["#8e7446", "#d3b879", "#b78d37", "#ffe3a0"],
  ["#526480", "#a1bfd1", "#a0aeb7", "#eff0d7"],
  ["#52726c", "#8cb9a4", "#ae8949", "#eaddaa"],
  ["#705573", "#b894bd", "#c39346", "#ffe4a6"],
  ["#4b7480", "#8ac6ca", "#c8a151", "#fff0c3"],
  ["#8f5452", "#dfa093", "#d9ad43", "#fff2b2"],
];
const rect = (x, y, w, h, color) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`;

export function medalSvg(id) {
  if (cache.has(id)) return cache.get(id);
  const definition = ACHIEVEMENTS.find((item) => item.id === id);
  if (!definition) throw new RangeError("Unknown achievement medal");
  const tier = definition.tier, [ribbon, stripe, metal, shine] = palettes[tier];
  let pixels = rect(7, 0, 10, 7, ribbon) + rect(9, 7, 6, 4, ribbon);
  pixels += rect(9, 0, 2, 7, stripe) + rect(14, 0, 1, 7, stripe);
  if (tier >= 2) pixels += rect(7, 0, 10, 1, shine);
  if (tier >= 4) pixels += rect(5, 0, 2, 8, ribbon) + rect(17, 0, 2, 8, ribbon);
  if (tier >= 6) pixels += rect(5, 1, 2, 2, shine) + rect(17, 1, 2, 2, shine);
  // Wings and wreaths grow within the same fixed footprint as rank increases.
  if (tier >= 3) {
    for (let n = 0; n < 3; n++) {
      pixels += rect(n, 12 + n * 2, 5 - n, 2, n === 0 ? shine : metal);
      pixels += rect(19 + n, 12 + n * 2, 5 - n, 2, n === 0 ? shine : metal);
    }
  }
  if (tier >= 4) {
    for (let n = 0; n < 3; n++) {
      pixels += rect(2 + n, 19 + n * 2, 2, 3, n % 2 ? shine : metal);
      pixels += rect(20 - n, 19 + n * 2, 2, 3, n % 2 ? shine : metal);
    }
  }
  pixels += rect(9, 9, 6, 3, "#26372d") + rect(10, 9, 4, 2, metal);
  pixels += rect(6, 12, 12, 12, "#24362e") + rect(4, 15, 16, 7, "#24362e");
  pixels += rect(7, 12, 10, 13, metal) + rect(5, 15, 14, 7, metal);
  pixels += rect(8, 13, 8, 2, shine) + rect(6, 16, 2, 4, shine);
  pixels += rect(9, 15, 6, 7, ribbon);
  if (tier === 0) {
    pixels += rect(10, 17, 4, 2, shine);
  } else if (tier < 3) {
    pixels += rect(11, 15, 2, 7, shine) + rect(9, 17, 6, 3, shine);
    if (tier === 2) pixels += rect(11, 18, 2, 1, metal);
  } else {
    pixels += rect(11, 14, 2, 10, shine) + rect(8, 17, 8, 4, shine);
    pixels += rect(10, 16, 4, 6, shine) + rect(11, 18, 2, 2, tier >= 6 ? stripe : metal);
  }
  if (tier >= 5) pixels += rect(9, 25, 6, 2, metal) + rect(11, 26, 2, 2, shine);
  if (tier === 7) {
    pixels += rect(11, 4, 2, 5, shine) + rect(10, 5, 4, 2, shine);
    pixels += rect(1, 9, 2, 2, shine) + rect(21, 9, 2, 2, shine);
  }
  const svg = `<svg class="achievement-medal-svg" viewBox="0 0 24 28" aria-hidden="true" focusable="false" shape-rendering="crispEdges">${pixels}</svg>`;
  cache.set(id, svg);
  return svg;
}
