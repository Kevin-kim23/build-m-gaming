import test from 'node:test';
import assert from 'node:assert/strict';
import { settingsMarkup, adSettingsMarkup, policySettingsMarkup } from '../src/preferences-markup.js';

const actions = markup => [...markup.matchAll(/data-detail-action="([^"]+)"/g)].map(match => match[1]);
const contents = panel => panel.body + (panel.footer ?? '');

test('settings retain both volume controls and group less frequent choices without exposing diagnostics', () => {
  const state = Object.freeze({ sfxVolume: 0, musicVolume: 0.83 });
  const panel = settingsMarkup(state);
  assert.equal(panel.title, '설정');
  const sliders = [...panel.body.matchAll(/<input\b[^>]*data-volume="(sfxVolume|musicVolume)"[^>]*>/g)];
  assert.equal(sliders.length, 2);
  for (const [, key] of sliders) {
    const slider = sliders.find(match => match[1] === key)[0];
    assert.match(slider, /type="range"/);
    assert.match(slider, /min="0"/);
    assert.match(slider, /max="100"/);
    assert.ok(slider.includes(`value="${Math.round(state[key] * 100)}"`));
    assert.ok(panel.body.includes(`for="${key}"`), 'every volume input has a label');
  }
  const destinations = actions(contents(panel));
  for (const action of ['settings-achievements', 'settings-guide', 'settings-ad-menu', 'settings-policy-menu', 'settings-info'])
    assert.ok(destinations.includes(action), action);
  assert.equal(new Set(destinations).size, destinations.length);
  assert.doesNotMatch(panel.body, /error-report|copy-error-log|clear-error-log/);
});

test('advertising choices retain separate app withdrawal and Google privacy controls with a return path', () => {
  const panel = adSettingsMarkup();
  const destinations = actions(contents(panel));
  for (const action of ['settings-ad-choice', 'settings-ad-privacy', 'settings-back'])
    assert.ok(destinations.includes(action), action);
  assert.match(panel.body, /동의 철회/);
  assert.match(panel.body, /data-ad-privacy-status[^>]*role="status"|role="status"[^>]*data-ad-privacy-status/);
});

test('policy menu keeps both full legal documents available and returns to settings', () => {
  const destinations = actions(contents(policySettingsMarkup()));
  for (const action of ['settings-privacy', 'settings-terms', 'settings-back'])
    assert.ok(destinations.includes(action), action);
});
