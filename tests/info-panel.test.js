import test from 'node:test';
import assert from 'node:assert/strict';
import { infoPanelMarkup } from '../src/info-panel.js';
import { APP_VERSION } from '../src/version.js';
import { homeMarkup } from '../src/home-view.js';
import { freshState } from '../src/game.js';

const base = { version: '0.28.0', platform: 'android', status: '자동 저장 · 2초 간격', saveVersion: 16, report: 'REPORT' };

test('the info popup shows version, environment, save status and the error count', () => {
  const { title, body } = infoPanelMarkup({ ...base, entries: [] });
  assert.equal(title, '게임 정보');
  for (const label of ['버전', '실행 환경', '저장 상태', '저장 형식']) assert.ok(body.includes(`<dt>${label}</dt>`), label);
  assert.match(body, /<dd>v0\.28\.0<\/dd>/);
  assert.match(body, /최근 오류 기록 · 0개/);
  assert.match(body, /기록된 오류가 없어요/);
  assert.match(body, /data-detail-action="clear-error-log" disabled/);
});

test('errors are listed newest first with their repeat count', () => {
  const entries = [
    { at: 1_000_000, area: 'save.write', message: 'first', count: 1 },
    { at: 2_000_000, area: 'audio.play', message: 'second', count: 4 },
  ];
  const { body } = infoPanelMarkup({ ...base, entries });
  assert.ok(body.indexOf('audio.play') < body.indexOf('save.write'));
  assert.match(body, /audio\.play<\/b> ×4/);
  assert.match(body, /최근 오류 기록 · 2개/);
  assert.doesNotMatch(body, /clear-error-log" disabled/);
});

test('error text from the running app can never inject markup', () => {
  const evil = '<img src=x onerror=alert(1)>"&\'';
  const { body } = infoPanelMarkup({ ...base, entries: [{ at: 0, area: '<b>area</b>', message: evil, count: 1 }], report: evil });
  assert.doesNotMatch(body, /<img|<b>area/);
  assert.match(body, /&lt;img src=x onerror=alert\(1\)&gt;&quot;&amp;&#39;/);
});

test('the copy button and a selectable copy of the report are always offered', () => {
  const { body } = infoPanelMarkup({ ...base, entries: [] });
  assert.match(body, /data-detail-action="copy-error-log"/);
  assert.match(body, /<textarea id="error-report" readonly[^>]*>REPORT<\/textarea>/);
  assert.match(body, /data-copy-status role="status"/);
  assert.match(body, /게임 저장 내용.*들어 있지 않습니다/);
});

test('the home footer carries the version and the info button', () => {
  assert.equal(APP_VERSION, 'dev'); // plain node has no build-time replacement
  const html = homeMarkup(freshState(0));
  assert.match(html, /<button type="button" id="open-info"[^>]*>정보 · v/);
  assert.equal((html.match(/id="open-info"/g) ?? []).length, 1);
});
