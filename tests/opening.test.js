import test from 'node:test';
import assert from 'node:assert/strict';
import { createOpeningScreen, OPENING_LOAD_TIMEOUT_MS, OPENING_STALL_TIMEOUT_MS,
  OPENING_MAX_PLAY_MS } from '../src/opening.js';
import { createGameLifecycle } from '../src/game-lifecycle.js';
import { createGameSession } from '../src/session.js';
import { createBackHandler } from '../src/back-button.js';
import { freshState, SAVE_KEY } from '../src/state.js';
import { serializeSave } from '../src/money.js';

const drain = async () => { await Promise.resolve(); await Promise.resolve(); };
function fixture({play, onStart, artLoaded = true, soundEnabled = true} = {}) {
  let time = 0, serial = 0, starts = 0;
  const timers = new Map(), errors = [], nodes = new Map();
  const node = selector => {
    if (!nodes.has(selector)) {
      const listeners = new Map();
      nodes.set(selector, {
        hidden: false, dataset: {}, currentTime: 0, focused: 0, playCalls: 0, pauseCalls: 0,
        complete: artLoaded, naturalWidth: artLoaded ? 1080 : 0,
        classList: {toggle() {}},
        addEventListener(type, handler) {
          if (!listeners.has(type)) listeners.set(type, new Set());
          listeners.get(type).add(handler);
        },
        removeEventListener(type, handler) { listeners.get(type)?.delete(handler); },
        emit(type) {
          const event = {prevented: false, stopped: false,
            preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }};
          for (const handler of listeners.get(type) ?? []) handler(event);
          return event;
        },
        focus() { this.focused++; },
        play() { this.playCalls++; return play?.(); },
        pause() { this.pauseCalls++; },
        removeAttribute(name) { this[name] = null; },
        load() { this.unloaded = true; },
        listenerCount() { return [...listeners.values()].reduce((total, set) => total + set.size, 0); },
      });
    }
    return nodes.get(selector);
  };
  const root = {querySelector: node};
  node('#opening-title').hidden = true;
  const opening = createOpeningScreen({root, soundEnabled, now: () => time,
    setTimer: (callback, delay) => { const id = ++serial; timers.set(id, {callback, at: time + delay}); return id; },
    clearTimer: id => timers.delete(id), onError: (area, error) => errors.push({area, error}),
    onStart: () => { starts++; onStart?.(); },
  });
  function advance(delta) {
    const end = time + delta;
    while (true) {
      const next = [...timers].sort((a,b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      time = next[1].at; timers.delete(next[0]); next[1].callback();
    }
    time = end;
  }
  return {opening, node, timers, errors, advance, nodes, get starts() { return starts; }};
}

test('a launch plays the inline logo with its sound, then waits for exactly one title click', () => {
  const f = fixture(), video = f.node('#opening-video'), title = f.node('#opening-title');
  f.opening.setActive(true);
  assert.equal(video.playCalls, 1);
  assert.equal(video.muted, false); assert.equal(video.playsInline, true);
  assert.equal(f.node('#app').inert, true);
  title.emit('click'); assert.equal(f.starts, 0);
  video.emit('ended');
  assert.equal(f.opening.stage, 'title'); assert.equal(title.hidden, false);
  assert.equal(video.hidden, true);
  assert.equal(f.starts, 0); assert.equal(f.timers.size, 0);
  const click = title.emit('click');
  assert.equal(click.prevented, true); assert.equal(click.stopped, true);
  assert.equal(f.opening.stage, 'complete'); assert.equal(f.starts, 1);
  assert.equal(f.node('#opening').hidden, true); assert.equal(f.node('#app').inert, false);
  assert.equal(video.unloaded, true);
  title.emit('click'); video.emit('ended'); f.opening.setActive(false); f.opening.setActive(true);
  assert.equal(f.starts, 1); assert.equal(video.playCalls, 1);
  assert.equal([...f.nodes.values()].reduce((sum, n) => sum + n.listenerCount(), 0), 0);
});

test('a title cannot launch while inactive, and no skip control is required', () => {
  const f = fixture(); f.opening.setActive(true);
  assert.equal(f.nodes.has('#opening-skip'), false);
  f.node('#opening-video').emit('ended'); assert.equal(f.starts, 0);
  assert.equal(f.opening.stage, 'title');
  f.opening.setActive(false); f.node('#opening-title').emit('click');
  assert.equal(f.starts, 0);
  f.opening.setActive(true); f.node('#opening-title').emit('click');
  assert.equal(f.starts, 1);
});

test('autoplay rejection and media decoding errors recover to an usable title', async () => {
  const blocked = fixture({play: () => Promise.reject(Object.assign(new Error('Autoplay blocked'), {name: 'NotAllowedError'}))});
  blocked.opening.setActive(true); await drain();
  assert.equal(blocked.opening.stage, 'title'); assert.equal(blocked.errors[0].area, 'opening.video');
  assert.equal(blocked.starts, 0);
  const broken = fixture(); broken.opening.setActive(true); broken.node('#opening-video').emit('error');
  assert.equal(broken.opening.stage, 'title'); assert.equal(broken.timers.size, 0);
  broken.node('#opening-title').emit('click'); assert.equal(broken.starts, 1);
});

test('disabled game sound mutes the clip, and browser autoplay policy retries the same clip muted', async () => {
  const silent = fixture({soundEnabled: false}); silent.opening.setActive(true);
  assert.equal(silent.node('#opening-video').muted, true);
  let attempts = 0;
  const browser = fixture({play: () => {
    attempts++;
    if (attempts === 1) return Promise.reject(Object.assign(new Error('Gesture required'), {name: 'NotAllowedError'}));
    return Promise.resolve();
  }});
  browser.opening.setActive(true); await drain();
  assert.equal(attempts, 2); assert.equal(browser.node('#opening-video').muted, true);
  assert.equal(browser.opening.stage, 'logo'); assert.equal(browser.errors.length, 0);
  browser.node('#opening-video').currentTime = 1.5;
  browser.opening.setActive(false); browser.opening.setActive(true);
  assert.equal(browser.node('#opening-video').currentTime, 1.5);
  assert.equal(browser.node('#opening-video').muted, true); assert.equal(browser.starts, 0);
});

test('first-install logo sound is enabled without changing the default game preference or saved mute', () => {
  const T = 1800000000000;
  for (const [raw, expectedMute] of [[null, false], [serializeSave({...freshState(T), sound: false}), true],
    [serializeSave({...freshState(T), sound: true}), false], ['broken save', true]]) {
    let writes = 0;
    const session = createGameSession({storage: {getItem: key => key === SAVE_KEY ? raw : null,
      setItem: () => writes++}, now: () => T, setTimer: () => 1, clearTimer: () => {}});
    const f = fixture({soundEnabled: !session.hasSavedProgress || session.state.sound});
    f.opening.setActive(true);
    assert.equal(f.node('#opening-video').muted, expectedMute);
    assert.equal(writes, 0); assert.equal(session.active, false);
    if (raw === null) assert.equal(session.state.sound, false);
  }
});

test('missing image leaves a usable text title and reports the asset failure', () => {
  const f = fixture({artLoaded: false}); f.opening.setActive(true);
  f.node('#opening-art').emit('error'); f.node('#opening-video').emit('ended');
  assert.equal(f.node('#opening-art').hidden, true);
  assert.equal(f.errors[0].area, 'opening.image');
  f.node('#opening-title').emit('click'); assert.equal(f.starts, 1);
});

test('a never-resolving play request, playback stall, and endless clip each have a finite bound', () => {
  const loading = fixture({play: () => new Promise(() => {})}); loading.opening.setActive(true);
  loading.advance(OPENING_LOAD_TIMEOUT_MS);
  assert.equal(loading.opening.stage, 'title');
  const stalled = fixture(); stalled.opening.setActive(true); stalled.node('#opening-video').emit('playing');
  stalled.advance(OPENING_STALL_TIMEOUT_MS - 1); stalled.node('#opening-video').emit('timeupdate');
  stalled.advance(1); assert.equal(stalled.opening.stage, 'title');
  const endless = fixture(); endless.opening.setActive(true);
  for (let second = 1; second <= OPENING_MAX_PLAY_MS / 1000; second++) {
    endless.advance(1000); endless.node('#opening-video').currentTime = second;
    endless.node('#opening-video').emit('timeupdate');
  }
  assert.equal(endless.opening.stage, 'title'); assert.equal(endless.errors.length, 1);
});

test('backgrounding pauses the logo and its timeout, and ignores a stale interrupted play promise', async () => {
  let reject;
  const f = fixture({play: () => new Promise((_, failure) => { reject = failure; })});
  f.opening.setActive(true); const oldReject = reject;
  f.node('#opening-video').currentTime = 2;
  f.opening.setActive(false); oldReject(new Error('AbortError')); await drain();
  f.advance(60000); assert.equal(f.opening.stage, 'logo'); assert.equal(f.timers.size, 0);
  assert.equal(f.errors.length, 0);
  f.opening.setActive(true);
  assert.equal(f.node('#opening-video').currentTime, 2); assert.equal(f.node('#opening-video').playCalls, 2);
  f.node('#opening-video').emit('ended');
  f.opening.setActive(false); f.opening.setActive(true);
  assert.equal(f.opening.stage, 'title'); assert.equal(f.node('#opening-video').playCalls, 2);
});

test('separate page loads always show the logo without persisting a skip preference', () => {
  const first = fixture(); first.opening.setActive(true); first.node('#opening-video').emit('ended');
  first.node('#opening-title').emit('click');
  const next = fixture(); assert.equal(next.opening.stage, 'logo'); assert.equal(next.starts, 0);
});

test('visibility, page restore and native callbacks never start a session behind the opening', () => {
  let hidden = false, starts = 0, pauses = 0, cleanup = 0;
  const active = [];
  const lifecycle = createGameLifecycle({session: {start() { starts++; }, pause() { pauses++; }},
    opening: {setActive: value => active.push(value)}, onPause: () => cleanup++, isHidden: () => hidden});
  lifecycle.syncVisibility(); lifecycle.pageShow(); lifecycle.setNativeActive(false);
  lifecycle.setNativeActive(true); lifecycle.pageHide(); lifecycle.pageShow();
  assert.equal(starts, 0); assert.equal(pauses, 0); assert.equal(lifecycle.canRun, false);
  lifecycle.start(); lifecycle.start(); lifecycle.syncVisibility(); lifecycle.pageShow();
  assert.equal(starts, 1); assert.equal(lifecycle.canRun, true);
  hidden = true; lifecycle.syncVisibility(); lifecycle.setNativeActive(false); lifecycle.pageHide();
  assert.equal(pauses, 1); assert.equal(cleanup, 1);
  hidden = false; lifecycle.syncVisibility(); lifecycle.pageShow();
  assert.equal(starts, 1); assert.equal(active.at(-1), false);
  lifecycle.setNativeActive(true); lifecycle.syncVisibility(); lifecycle.pageShow();
  assert.equal(starts, 2); assert.equal(lifecycle.canRun, true);
});

test('the start gesture does not earn tap gold, overwrite a save, or duplicate return rewards', () => {
  const T = 1800000000000, original = serializeSave({...freshState(T), soldiers: 3, gold: 777});
  let time = T + 3600000, writes = 0, lifecycle;
  const data = new Map([[SAVE_KEY, original]]);
  const session = createGameSession({storage: {getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { writes++; data.set(key, value); }}, now: () => time,
    setTimer: () => 1, clearTimer: () => {}});
  const f = fixture({onStart: () => lifecycle.start()});
  lifecycle = createGameLifecycle({session, opening: f.opening, isHidden: () => false});
  lifecycle.syncVisibility(); lifecycle.pageShow();
  session.tick();
  assert.equal(session.active, false); assert.equal(writes, 0); assert.equal(data.get(SAVE_KEY), original);
  f.node('#opening-video').emit('ended');
  assert.equal(session.state.offlineReward, null); assert.equal(session.state.gold, 777);
  f.node('#opening-title').emit('click');
  assert.equal(session.active, true); assert.equal(session.state.gold, 777);
  assert.equal(session.state.offlineReward.amount, 10800);
  const id = session.state.offlineReward.id;
  lifecycle.pageShow(); lifecycle.syncVisibility();
  assert.equal(session.state.offlineReward.id, id); assert.equal(session.state.offlineReward.amount, 10800);
  lifecycle.pageHide(); time += 1000; lifecycle.pageShow();
  assert.equal(f.opening.stage, 'complete'); assert.equal(session.state.gold, 777);
  assert.equal(session.state.offlineReward.amount, 10803);
  lifecycle.pageHide();
});

test('Android back on either opening screen requests exit without starting or accepting the title', () => {
  for (const stage of ['logo', 'title']) {
    const f = fixture(); f.opening.setActive(true);
    if (stage === 'title') f.node('#opening-video').emit('ended');
    let exits = 0, hints = 0;
    const back = createBackHandler({root: {querySelector: () => null}, now: () => 100,
      hint: () => hints++, exit: () => { exits++; f.opening.setActive(false); }});
    assert.equal(back(), 'hint'); assert.equal(back(), 'exit');
    assert.equal(exits, 1); assert.equal(hints, 1); assert.equal(f.starts, 0);
    assert.equal(f.opening.stage, stage);
  }
});
