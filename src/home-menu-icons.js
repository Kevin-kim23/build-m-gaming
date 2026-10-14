// Original, static menu drawings. No font glyphs or external image requests.
const shapes = {
  recruit: '<path d="M6 10V8a6 6 0 0 1 12 0v2M4 10h16M8 11v2a4 4 0 0 0 8 0v-2M3 22v-3l5-3 4 3 4-3 5 3v3M12 4v3"/>',
  equipment: '<path d="M8 12V8h8l2 4M15 8l7-3M4 12h14l3 4H2zM5 16h13a3 3 0 0 1 0 6H5a3 3 0 0 1 0-6Z"/><path d="M6 19h.01M11 19h.01M16 19h.01" stroke-width="3"/>',
  shop: '<path d="m4 3-2 6v3h20V9l-2-6ZM4 12v9h16v-9M9 21v-6h6v6M8 3l-1 9M16 3l1 9M2 9h20"/>',
  facilities: '<path d="M3 22V7l8-4v19M11 10h10v12M1 22h22M6 8v2M6 13v2M6 18v2M15 13h2M15 17h2M16 22v-2"/>',
  personal: '<path d="m11 13 1-7 9-4-4 9-6 2ZM12 6l5 5M8 10l6 6M10 14l-6 6M2 18l4 4"/>',
  items: '<path d="M8 2h8v4H8zM9 6 5 10v10l2 2h10l2-2V10l-4-4M5 11h14"/><path d="m13 12-4 5h3l-1 4 5-6h-3z" fill="currentColor" stroke="none"/>',
};
const icons = Object.fromEntries(Object.entries(shapes).map(([key,shape])=>[key,
  `<svg class="home-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${shape}</svg>`]));
export function homeMenuIcon(key) { return icons[key] ?? ''; }
