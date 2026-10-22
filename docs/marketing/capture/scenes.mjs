import { open, seed, shot, sleep, BASE } from './lib.mjs';
import { stages, helpers } from './fixtures.mjs';
const only = process.argv[2];
const { browser, page } = await open();
async function boot(build){ await seed(page, build); await page.goto(BASE + '/', { waitUntil: 'networkidle2' }); await sleep(6000); await page.mouse.click(180, 560); await sleep(2000); }
async function click(text){ const ok = await page.evaluate(t=>{const els=[...document.querySelectorAll('button,[role=button],a')].filter(b=>b.offsetParent&&((b.getAttribute('aria-label')||'')+b.textContent).includes(t));if(!els.length)return false;els[0].click();return true;},text); if(!ok) console.log('NOCLICK',text); await sleep(1200); return ok; }
async function buttons(){ console.log(await page.evaluate(()=>[...document.querySelectorAll('button')].filter(b=>b.offsetParent).map(b=>(b.getAttribute('aria-label')||b.textContent).trim().replace(/\s+/g,' ').slice(0,28)).join(' | '))); }
async function layers(){ console.log(await page.evaluate(()=>{const out=[];const walk=(el,d)=>{if(d>4)return;for(const c of el.children){const r=c.getBoundingClientRect();if(r.height>300)out.push('  '.repeat(d)+c.tagName+'.'+String(c.className).slice(0,60)+' #'+c.id+' '+getComputedStyle(c).position);walk(c,d+1);}};walk(document.body,0);return out.join('\n');})); }
const deploy=async()=>{await page.evaluate(()=>{const c=[...document.querySelectorAll('button')].filter(b=>b.offsetParent&&/마나/.test(b.getAttribute('aria-label')||'')&&!b.disabled);if(c.length){c[Math.floor(Math.random()*c.length)].click();const l=[...document.querySelectorAll('button')].filter(b=>/레인에 출격/.test(b.getAttribute('aria-label')||''));if(l.length)l[Math.floor(Math.random()*l.length)].click();}});};
const S = {
  async mid(){ await boot(stages.mid); await shot(page,'home-mid'); },
  async early(){ await boot(stages.early); await shot(page,'home-early'); },
  async equip(){ await boot(stages.late); await click('군사 장비'); await sleep(800); await shot(page,'equip'); },
  async fac(){ await boot(stages.late); await click('시설'); await sleep(800); await shot(page,'facility'); },
  async road(){ await boot(stages.late); await click('전투'); await sleep(1500); await shot(page,'road'); },
  async battle(){ await boot(stages.late); await click('전투'); await sleep(1200); await click('출격'); await sleep(1200); await shot(page,'loadout'); await click('전투 시작'); await sleep(2500);
    for(let i=0;i<5;i++){await deploy(); await sleep(450);} await shot(page,'battle'); await deploy(); await sleep(700); await shot(page,'battle2');
    for(let i=0;i<40;i++){await deploy(); await sleep(500);} await shot(page,'victory'); },
  async loot(){ await boot(stages.late + `s.loot.balance=48000;for(const o of mods.loot.OPERATIVES)mods.loot.recruitOperative(s,o.id,now);`); await click('전리품 상점'); await sleep(1000); await shot(page,'loot'); },
  async promo(){ await boot(helpers + `power(327679);s.gold=50_000_000_000;s.ncoSchoolLevel=5;s.officerSchoolLevel=5;s.advancedSchoolLevel=5;s.fieldTheme='concrete';s.campaignCleared=60;s.campaignStars.fill(3,0,60);equip(['artillery','tank','selfPropelled','helicopter','rocketLauncher','transport'],22);`);
    await click('군대 모집'); await sleep(800); await click('일반병 1명 모집'); await page.evaluate(()=>{document.getElementById('modal').style.visibility='hidden';});
    let last=0; for(const t of [1600,1900]){await sleep(t-last); last=t; await shot(page,'promo-'+t);} },
  async offline(){ await boot(stages.mid + `s.lastAccrual=now-5*3600*1000;`); await shot(page,'offline'); },
};
for (const [k,f] of Object.entries(S)) { if (only && !only.split(',').includes(k)) continue; try { await f(); } catch(e){ console.log('ERR',k,e.message); } }
await browser.close();
