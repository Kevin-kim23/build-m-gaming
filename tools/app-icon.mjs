import { generalRankBadge } from '../src/rank-frame.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

// Use the exact, original two-star major-general emblem from the game.
// Pass the installed sharp package path when regenerating; no runtime dependency.
const require = createRequire(import.meta.url);
const sharp = require(process.argv[2] || 'sharp');
const root = new URL('../', import.meta.url);
const badge = generalRankBadge(2).replaceAll('data-rank-star ', 'data-rank-star="true" ').replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
const svg = (size, margin, bg = true, shape = 'square') => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 108 108">${bg ? (shape === 'round' ? '<circle cx="54" cy="54" r="52" fill="#260d13"/>' : shape === 'rounded' ? '<rect x="3" y="3" width="102" height="102" rx="22" fill="#260d13"/>' : '<rect width="108" height="108" fill="#260d13"/>') : ''}<svg x="${margin}" y="${margin}" width="${108-2*margin}" height="${108-2*margin}" viewBox="0 0 96 96">${badge.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</svg></svg>`;
const dest = new URL('docs/store/assets/', root);
await mkdir(dest, { recursive: true });
await writeFile(new URL('app-icon.svg', dest), svg(512, 8));
await sharp(Buffer.from(svg(512, 8))).png().toFile(new URL('app-icon-512.png', dest).pathname.replace(/^\/([A-Z]:)/, '$1'));
for (const [density, size, foreground] of [['mdpi',48,108],['hdpi',72,162],['xhdpi',96,216],['xxhdpi',144,324],['xxxhdpi',192,432]]) {
  const dir = new URL(`android/app/src/main/res/mipmap-${density}/`, root);
  for (const name of ['ic_launcher', 'ic_launcher_round', 'ic_launcher_foreground']) {
    const adaptive = name.endsWith('foreground');
    const bytes = await sharp(Buffer.from(svg(adaptive ? foreground : size, adaptive ? 24 : name.endsWith('round') ? 19 : 8, !adaptive, name.endsWith('round') ? 'round' : 'rounded'))).png().toBuffer();
    await writeFile(new URL(name + '.png', dir), bytes);
  }
}

await writeFile(new URL('public/icon.svg', root), svg(512, 8));
const feature = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500"><defs><linearGradient id="bg"><stop stop-color="#14231c"/><stop offset="1" stop-color="#304232"/></linearGradient></defs><rect width="1024" height="500" fill="url(#bg)"/><path d="M0 405L1024 170M0 470L1024 235" stroke="#92a57a" opacity=".08" stroke-width="35"/><g fill="none" stroke="#d9bb72" opacity=".25"><rect x="22" y="22" width="980" height="456" rx="22"/></g><svg x="60" y="95" width="280" height="280" viewBox="0 0 96 96">${badge.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</svg><g font-family="Malgun Gothic, sans-serif"><text x="394" y="156" font-size="18" letter-spacing="6" fill="#d9bb72">DONGRAMCO</text><text x="390" y="246" font-size="70" font-weight="bold" fill="#f5eed9">부대 키우기</text><text x="394" y="302" font-size="26" fill="#c6d1bb">작은 부대에서, 대륙의 사령관으로</text><text x="394" y="360" font-size="20" fill="#d9bb72">병력 모집 · 장비 강화 · 대륙 점령</text></g></svg>`;
await writeFile(new URL('feature.svg', dest), feature);
await writeFile(new URL('feature-1024x500.png', dest), await sharp(Buffer.from(feature)).png().toBuffer());
