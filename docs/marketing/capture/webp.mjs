// Re-encode PNGs to WebP with headless Chrome canvas: node webp.mjs <dir> <maxWidth>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [dir, maxW] = [process.argv[2], Number(process.argv[3])];
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const p = await b.newPage();
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.png'))) {
  const src = 'data:image/png;base64,' + fs.readFileSync(path.join(dir, f)).toString('base64');
  const out = await p.evaluate(async (src, maxW) => { const i = new Image(); i.src = src; await i.decode(); const w = Math.min(maxW, i.width), h = Math.round(i.height * w / i.width); const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(i, 0, 0, w, h); return c.toDataURL('image/webp', 0.86); }, src, maxW);
  fs.writeFileSync(path.join(dir, f.replace(/\.png$/, '.webp')), Buffer.from(out.split(',')[1], 'base64')); fs.unlinkSync(path.join(dir, f));
}
await b.close();
