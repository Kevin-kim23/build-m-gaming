import test from 'node:test';
import assert from 'node:assert/strict';
import { cardsMarkup, evolveRow, towerPanelMarkup, basePanelMarkup, hudValues } from '../src/defense-markup.js';
import { createRun, build, upgrade, buildBay, upgradeBay, openCards, evolve } from '../src/defense-run.js';

// 무한 방어전 3단계: 카드 고르기·진화 화면 글자. 저장은 건드리지 않는다.
const rich = () => { const run = createRun({ seed: 4 }); run.supply = 1e9; return run; };

test('the run starts with one stored card; opening shows three with rarity and a reroll', () => {
  const run = rich();
  assert.equal(hudValues(run).cards, '1');
  openCards(run);
  const html = cardsMarkup(run);
  assert.equal((html.match(/data-pick=/g) ?? []).length, 3);
  assert.match(html, /다시 뽑기 1/);
  run.hand = [{ id: 'lineFocus', line: 'air' }, { id: 'evolve' }, { id: 'supplySpeed' }]; run.rerolls = 0;
  const fixed = cardsMarkup(run);
  assert.match(fixed, /대공 특화<\/b><small>대공 공격 \+20%/);
  assert.match(fixed, /defense-pick rare/);
  assert.match(fixed, /data-reroll disabled/);
});

test('evolution row: level hint, ticket hint, then one button or two branch buttons', () => {
  const run = rich();
  build(run, 0, 'firepower');
  assert.match(evolveRow(run, 0), /Lv10부터 진화권으로 진화 → 자주포/);
  upgrade(run, 0, 9);
  assert.match(evolveRow(run, 0), /진화권 카드가 필요해요/);
  run.evoTickets = 1;
  assert.match(evolveRow(run, 0), /data-evolve="0">진화 → 자주포/);
  evolve(run, { pad: 0 });
  upgrade(run, 0, 10); run.evoTickets = 1;
  const html = evolveRow(run, 0);
  assert.match(html, /진화 → 다연장 로켓포/);
  assert.match(html, /data-evolve="1">진화 → 타이탄 공성포/);
  evolve(run, { pad: 0 }, 0);
  assert.equal(evolveRow(run, 0), '');
  assert.match(towerPanelMarkup(run, 0), /다연장 로켓포 Lv20/);
});

test('support bays evolve at Lv20 with a ticket into one of two branches', () => {
  const run = rich();
  buildBay(run, 'transport');
  assert.match(basePanelMarkup(run, 'transport'), /Lv20 \+ 진화권 → 공중요새/);
  upgradeBay(run, 'transport', 19); run.evoTickets = 1;
  assert.match(basePanelMarkup(run, 'transport'), /data-bay-evolve="1">수송 편대/);
  evolve(run, { bay: 'transport' }, 1);
  assert.match(basePanelMarkup(run, 'transport'), /진화: 수송 편대/);
});

test('ICBM label shows ready or seconds left', () => {
  const run = rich();
  assert.equal(hudValues(run).icbm, '');
  run.skills.icbm = { cooldown: 40, ready: 0 };
  assert.equal(hudValues(run).icbm, '준비');
  run.skills.icbm.ready = 12.2;
  assert.equal(hudValues(run).icbm, '13초');
});
