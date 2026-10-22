import { open, seed, shot, sleep, BASE } from './lib.mjs';
import { stages } from './fixtures.mjs';
const only = process.argv[2];
const { browser, page } = await open();
for (const [name, build] of Object.entries(stages)) {
  if (only && name !== only) continue;
  await seed(page, build);
  const issue = await page.evaluate(async () => { const sv = await import('/src/save.js'); const st = await import('/src/state.js'); return JSON.stringify(sv.inspectSave(localStorage.getItem(st.SAVE_KEY), Date.now()).issue); });
  console.log(name, 'issue', issue);
  await page.goto(BASE + '/', { waitUntil: 'networkidle2' });
  await sleep(6000); await page.mouse.click(180, 560); await sleep(2500);
  await shot(page, 'home-' + name);
}
await browser.close();
