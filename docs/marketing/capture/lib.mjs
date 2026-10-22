import puppeteer from 'puppeteer-core';
export const BASE = 'http://127.0.0.1:4240';
export const OUT = new URL('./shots/', import.meta.url);
export async function open({ width = 360, height = 780, dpr = 3 } = {}) {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true, args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', '--mute-audio'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  return { browser, page };
}
export const sleep = ms => new Promise(r => setTimeout(r, ms));

// Synthetic save only — fresh origin on port 4240, never the player's real data.
export async function seed(page, build) {
  await page.goto(BASE + '/tools/ux-candidates/data.js', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.evaluate(async (buildSrc) => {
    const st = await import('/src/state.js');
    const money = await import('/src/money.js');
    const access = await import('/src/access-rules.js');
    const now = Date.now();
    const s = st.freshState(now);
    s.sound = false; s.sfxVolume = 0; s.musicVolume = 0;
    const fn = new Function('s', 'now', 'mods', buildSrc);
    const mods = {
      units: (await import('/src/units.js')).UNITS,
      loot: await import('/src/loot.js'),
    };
    await fn(s, now, mods);
    localStorage.clear();
    localStorage.setItem(st.SAVE_KEY, money.serializeSave(s));
    localStorage.setItem('budae-kiugi-ui-guide-off', '1');
    localStorage.setItem(access.ACCESS_KEY, JSON.stringify({ schema: access.ACCESS_SCHEMA, ageBand: 'adult', ageCheckedAt: now, termsRevision: access.TERMS_REVISION, policyRevision: access.ACCESS_POLICY_REVISION, acceptedAt: now, adsConsent: false, adNoticeRevision: 0 }));
  }, build);
}
export async function shot(page, name) {
  const fs = await import('node:fs');
  fs.mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: new URL(name + '.png', OUT).pathname.slice(1) });
  console.log('shot', name);
}
