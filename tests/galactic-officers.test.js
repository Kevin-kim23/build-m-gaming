import test from 'node:test';
import assert from 'node:assert/strict';
import { GALACTIC_OFFICERS } from '../src/galactic-officers.js';
import { UNIT_LIST, troopIncome } from '../src/units.js';
import { RANKS, RANK_REQUIREMENTS, rankForArmy } from '../src/ranks.js';
import { schoolOffer } from '../src/schools.js';
import { schoolUnlockPreview, schoolDetailMarkup } from '../src/school-panels.js';
import { freshState, MAX_SOLDIERS } from '../src/state.js';
import { recruit, recruitOffer, unitCost, upgradeSchool, perTap, perSecond, accrue, tapGold } from '../src/game.js';
import { MAX_GOLD, exact, subtractMoney, serializeSave } from '../src/money.js';
import { parseSave } from '../src/save.js';
import { officerDetails } from '../src/officer-art.js';

const T = 1_800_000_000_000;
const army = rank => ({ ...freshState(T), gold:MAX_GOLD,
  soldiers:RANK_REQUIREMENTS[RANKS.indexOf(rank)]-3000, sergeants:300,
  ncoSchoolLevel:5, officerSchoolLevel:5, advancedSchoolLevel:5, commandSchoolLevel:5 });

test('galactic academy requires command academy completion plus rank and exact gold for each sequential level', () => {
  const state = army('부사령관');
  state.commandSchoolLevel = 4;
  assert.equal(schoolOffer(state, 'galactic').visible, false);
  assert.equal(upgradeSchool(state, T, 'galactic').reason, 'locked');
  state.commandSchoolLevel = 5;
  for (const grade of GALACTIC_OFFICERS) {
    const power = RANK_REQUIREMENTS[RANKS.indexOf(grade.unlockRank)];
    state.soldiers = power - 3001;
    assert.equal(upgradeSchool(state, T, 'galactic').reason, 'locked');
    state.soldiers++;
    state.gold = subtractMoney(grade.academyCost, 1);
    const before = serializeSave(state);
    assert.equal(upgradeSchool(state, T, 'galactic').reason, 'gold');
    assert.equal(serializeSave(state), before);
    const offer = schoolOffer(state, 'galactic');
    assert.match(schoolUnlockPreview(offer), new RegExp(grade.name));
    state.gold = grade.academyCost;
    assert.equal(upgradeSchool(state, T, 'galactic').level, grade.schoolLevel);
    assert.equal(state.gold, 0);
    for (const candidate of GALACTIC_OFFICERS)
      assert.equal(recruitOffer(state, candidate.id).locked, candidate.schoolLevel > grade.schoolLevel);
  }
  assert.equal(upgradeSchool(state, T, 'galactic').reason, 'max');
  const details = schoolDetailMarkup(state, 'galactic').body;
  assert.match(details, /부사령관 이상 필수/);
  assert.match(details, /은하 대장 이상 필수/);
  assert.doesNotMatch(details, /undefined|NaN/);
});

test('56 academy recruits bridge each eight-formation promotion with exact independent affordable prices', () => {
  for (const grade of GALACTIC_OFFICERS) {
    const state = army(grade.unlockRank);
    state.galacticSchoolLevel = grade.schoolLevel;
    const other = GALACTIC_OFFICERS.find(unit => unit.id !== grade.id);
    const otherCost = unitCost(0, other.id);
    for (let count=0; count<56; count++) {
      const [base, linear, quadratic] = grade.price.map(exact);
      const n = BigInt(count), expected = base + linear*n + quadratic*n*n;
      const price = unitCost(count, grade.id);
      assert.equal(exact(price), expected);
      assert.ok(price <= MAX_GOLD);
      state.gold = subtractMoney(price, 1);
      assert.equal(recruit(state, T, grade.id).reason, 'gold');
      state.gold = price;
      const result = recruit(state, T, grade.id);
      assert.equal(result.ok, true);
      assert.equal(state.gold, 0);
      assert.equal(state[grade.field], count+1);
      assert.equal(result.promoted, count===55);
      assert.equal(unitCost(0, other.id), otherCost);
    }
    assert.equal(RANKS[rankForArmy(state)], grade.name);
    assert.equal(parseSave(serializeSave(state), T)?.[grade.field], 56);
  }
});

test('late troop income crosses safe integers exactly and wallet settlement retains its one-gold boundary', () => {
  for (const unit of UNIT_LIST) {
    const count = Math.floor((MAX_SOLDIERS-8000)/unit.power);
    const state = { ...army('은하 원수'), soldiers:5000, sergeants:300,
      [unit.field]:count, galacticSchoolLevel:5, gold:0 };
    for (const kind of ['passive','tap']) {
      const expected = UNIT_LIST.reduce((sum, candidate) => sum + BigInt(state[candidate.field] ?? 0)*BigInt(candidate[kind]), 0n);
      assert.equal(exact(troopIncome(state, kind)), expected, `${unit.id}/${kind}`);
    }
    assert.ok(perTap(state, T)>0 && perSecond(state)>0);
  }
  const grade = GALACTIC_OFFICERS.at(-1), state = army('은하 대장');
  state.galacticSchoolLevel = 5;
  state[grade.field] = 56;
  state.gold = MAX_GOLD-1n;
  assert.equal(tapGold(state, T), 1);
  assert.equal(state.gold, MAX_GOLD);
  state.gold = MAX_GOLD-1n;
  assert.equal(accrue(state, T+1000), 1);
  assert.equal(state.gold, MAX_GOLD);
  assert.equal(parseSave(serializeSave(state), T+1000)?.gold, MAX_GOLD);
});

test('galactic officer portraits use original purple uniforms and copper details in front and overhead views', () => {
  const variants=[];
  for (const grade of GALACTIC_OFFICERS) {
    for (const overhead of [false,true]) {
      const rects=[], ctx={fillRect(x,y,w,h){
        assert.ok([x,y,w,h].every(Number.isFinite));
        assert.ok(x>=0 && y>=0 && w>0 && h>0 && x+w<=grade.width && y+h<=grade.height);
        rects.push([this.fillStyle,x,y,w,h]);
      }};
      officerDetails(ctx,grade,overhead);
      assert.ok(rects.some(([color])=>color===grade.color));
      assert.ok(rects.some(([color])=>color==='#dfad72'));
      assert.ok(rects.some(([color])=>color===(overhead?'#ffdab0':'#ffedc5')));
      variants.push(JSON.stringify(rects));
    }
  }
  assert.equal(new Set(variants).size,10);
});
