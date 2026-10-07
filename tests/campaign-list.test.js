import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignSelection, createCampaignList } from '../src/campaign-map.js';
import { freshState } from '../src/state.js';

function fakeDialog() {
  const list = { scrollTop: 0, clientHeight: 180 };
  let html = '', replacements = 0, focused = null;
  const tokens = new Set();
  return {
    classList: { add: name => tokens.add(name), remove: name => tokens.delete(name) },
    get innerHTML() { return html; },
    set innerHTML(value) { html = value; replacements++; list.scrollTop = 0; },
    querySelector(selector) {
      if (selector === '.campaign-stage-list') return list;
      const region = selector.match(/^\[data-region="(\d+)"\]$/);
      if (region && html.includes(`data-region="${region[1]}"`)) return {
        offsetTop: ((Number(region[1]) - 1) % 20) * 68, offsetHeight: 62,
        focus() { focused = selector; },
      };
      if (selector.startsWith('[data-country=')) return { focus() { focused = selector; } };
      return null;
    },
    get replacements() { return replacements; }, get focused() { return focused; }, get list() { return list; },
  };
}
const target = (name, value = '') => ({ dataset: { [name.replace(/^data-/, '')]: value }, hasAttribute: key => key === name });
const stateAt = cleared => ({ ...freshState(1000), soldiers: 880, sergeants: 40, campaignCleared: cleared });

test('list controller centers the current objective, keeps scroll when replay selection changes, and rejects forged locked input', () => {
  const state = stateAt(7), before = structuredClone(state), dialog = fakeDialog(), decks = [];
  const list = createCampaignList(dialog, () => state, id => { decks.push(id); return []; });
  list.show(); assert.equal(list.countryId, 'serdin'); assert.deepEqual(decks, [8]);
  assert.ok(dialog.list.scrollTop > 0, 'current objective is visible rather than always opening at row 1');
  dialog.list.scrollTop = 310;
  list.handle(target('data-region', '4'));
  assert.equal(dialog.list.scrollTop, 310); assert.equal(dialog.focused, '[data-region="4"]');
  assert.deepEqual(decks, [8, 4]); assert.match(dialog.innerHTML, /data-stage="4" >다시 도전/);
  const replacements = dialog.replacements;
  for (const bad of ['9', '80', 'NaN', '-1']) list.handle(target('data-region', bad));
  for (const bad of ['veloc', 'unknown']) list.handle(target('data-country', bad));
  assert.equal(dialog.replacements, replacements, 'locked or malformed actions never render or prepare a deck');
  assert.deepEqual(state, before, 'navigation does not mutate save data');
});

test('current-objective action jumps from old-country replay to the correct unlocked country, then completion remains replayable', () => {
  const state = stateAt(20), dialog = fakeDialog();
  const list = createCampaignList(dialog, () => state);
  list.show('serdin'); assert.equal(list.countryId, 'serdin');
  list.handle(target('data-current-stage'));
  assert.equal(list.countryId, 'veloc'); assert.equal(dialog.focused, '[data-region="21"]');
  assert.match(dialog.innerHTML, /data-stage="21" >전투 시작/);
  list.handle(target('data-country', 'serdin'));
  assert.equal(list.countryId, 'serdin'); assert.match(dialog.innerHTML, /다시 도전/);
  state.campaignCleared = 80; list.show();
  assert.equal(list.countryId, 'norgard'); assert.match(dialog.innerHTML, /모든 지역 점령 완료/);
  assert.doesNotMatch(dialog.innerHTML, /data-current-stage/);
  assert.equal(list.handle(target('data-battle-close')), false);
});

test('saved stars and progress survive every selection and country transition unchanged', () => {
  const state = stateAt(63); state.campaignStars = Array.from({ length: 80 }, (_, i) => i < 63 ? i % 4 : 0);
  const before = structuredClone(state);
  for (const country of ['serdin', 'veloc', 'istra', 'norgard']) {
    for (let id = 1; id <= 80; id++) {
      const selection = campaignSelection(state, country, id);
      assert.equal(selection.selected.countryId, country);
      assert.ok(selection.selected.id <= 64);
    }
  }
  assert.deepEqual(state, before);
});
