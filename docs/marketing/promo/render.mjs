// creatives.html의 각 <section id>를 정확한 크기의 PNG로 저장합니다.
// 실행(이 폴더에서): npx -p puppeteer-core@23 node render.mjs [id,id,...]
// 저장 위치를 바꾸려면 OUT 환경 변수에 폴더를 지정합니다(기본: ./out/).
import puppeteer from 'puppeteer-core';
import { pathToFileURL, fileURLToPath } from 'node:url';
import fs from 'node:fs';
const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.OUT || here + 'out/';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true, args: ['--allow-file-access-from-files', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: 3600, height: 2400, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(here + 'creatives.html').href, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
const only = process.argv[2]?.split(',');
for (const id of await page.$$eval('section[id]', s => s.map(x => x.id))) {
  if (only && !only.includes(id)) continue;
  await (await page.$('#' + id)).screenshot({ path: out + id + '.png' });
  console.log('saved', id);
}
await browser.close();
