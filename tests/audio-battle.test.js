import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameAudio } from '../src/audio.js';

function fakeContext() {
  let started = 0, active = 0, peak = 0;
  const node = () => ({ connect() {}, disconnect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, frequency: { setValueAtTime() {} } });
  const ctx = {
    currentTime: 0, destination: {}, resume: () => Promise.resolve(),
    createGain: node,
    createOscillator() { const o = node(); o.start = () => { started++; active++; peak = Math.max(peak, active); }; o.stop = () => {}; return o; },
  };
  return { ctx, get started() { return started; }, get peak() { return peak; } };
}

test('battle sounds play only when enabled and never stack more than twelve voices at once', () => {
  const f = fakeContext(), audio = createGameAudio(() => f.ctx);
  audio.battle('deploy', false); assert.equal(f.started, 0, 'muted: nothing plays');
  for (const kind of ['deploy', 'shot', 'boom', 'hit', 'win', 'lose']) audio.battle(kind, true);
  assert.ok(f.started >= 6, 'every kind makes a sound');
  for (let i = 0; i < 40; i++) audio.battle('boom', true);
  assert.ok(f.peak <= 12, `voice cap holds (peak ${f.peak})`);
});
