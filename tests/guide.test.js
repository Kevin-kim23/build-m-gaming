import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, recruit, recruitOffer } from '../src/game.js';
import { guideStep, GUIDE_STEPS } from '../src/guide.js';
import { SCHOOLS } from '../src/schools.js';
import { UNITS } from '../src/units.js';

const T = 1_800_000_000_000;
const fresh = (extra = {}) => ({ ...freshState(T), ...extra });
const army = (soldiers, extra = {}) => fresh({ soldiers, ...extra });

test('a brand-new game is told to tap, with the real price of the first soldier', () => {
  const step = guideStep(fresh());
  assert.equal(step.id, 'tap');
  assert.equal(step.target, null);
  assert.equal(step.pulse, false);
  assert.ok(step.text.includes(`${recruitOffer(fresh(), 'soldier').cost}G`));
});

test('once the first soldier is affordable the shop button is the call to action', () => {
  const step = guideStep(fresh({ gold: recruitOffer(fresh(), 'soldier').cost }));
  assert.equal(step.id, 'first-recruit');
  assert.equal(step.target, 'shop');
  assert.equal(step.pulse, true);
});

test('after the first soldier the guide explains promotion with live progress', () => {
  const s = army(1);
  const step = guideStep(s);
  assert.equal(step.id, 'promote');
  assert.match(step.text, /일병 진급까지 전력 1 \/ 4/);
  assert.equal(step.pulse, false);
  assert.equal(guideStep({ ...s, gold: recruitOffer(s, 'soldier').cost }).pulse, true);
});

test('enlisted ranks are told what their newly unlocked specialist earns', () => {
  const step = guideStep(army(5));
  assert.equal(step.id, 'grow');
  assert.ok(step.text.includes(`초당 +${UNITS.administrator.passive}G`));
  assert.ok(step.text.includes(`터치 +${UNITS.administrator.tap}G`));
  assert.match(step.text,/행정병/);
});

test('from sergeant rank the guide points to the NCO school until one is built', () => {
  const s = army(200);
  const step = guideStep(s);
  assert.equal(step.id, 'school');
  assert.equal(step.target, 'school');
  assert.match(step.text,/60만 골드/);
  assert.equal(step.pulse, false);
  assert.equal(guideStep({ ...s, gold: SCHOOLS.nco.costs[0] }).pulse, true);
  assert.notEqual(guideStep({ ...s, ncoSchoolLevel: 1 })?.id, 'school');
});

test('equipment purchase advances to its first enhancement, not another purchase', () => {
  const base = army(400, { ncoSchoolLevel: 2,sergeants:1,facilities:['kitchen'],facilityLevels:{kitchen:2} });
  assert.equal(guideStep(base)?.id, 'equipment');
  assert.equal(guideStep({ ...base, equipment: { ...base.equipment, artillery: { level: 0, deployed: true, count: 1 } } }).id, 'equipment-upgrade');
});

test('established saves see no guide at all', () => {
  const late = fresh({ soldiers: 20000, sergeants: 300, ncoSchoolLevel: 5, officerSchoolLevel: 2, gold: 1e12,facilities:['gym'],facilityLevels:{gym:2} });
  late.equipment.artillery = { level: 5, deployed: true, count: 1 };
  assert.equal(guideStep(late), null);
});

test('guide never changes the state and every step id is known', () => {
  const s = fresh({ gold: 10 });
  const before = structuredClone(s);
  const step = guideStep(s);
  assert.deepEqual(s, before);
  assert.ok(GUIDE_STEPS.includes(step.id));
});

test('recruiting the first soldier moves the guide forward in the real game flow', () => {
  const s = fresh({ gold: 100 });
  assert.equal(guideStep(s).id, 'first-recruit');
  assert.equal(recruit(s, T, 'soldier').ok, true);
  assert.equal(guideStep(s).id, 'promote');
});
