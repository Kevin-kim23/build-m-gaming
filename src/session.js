import { SAVE_KEY, LEGACY_KEY, freshState, parseSave, accrue, tapGold } from './game.js';

export const SAVE_DELAY = 2000;
// One visible writer holds the same lock used by older versions. Touches never
// access storage; handoff flushes synchronously before releasing ownership.
export function createGameSession({ storage, locks, now = Date.now,
  setTimer = setTimeout, clearTimer = clearTimeout,
  onChange = () => {}, onError = () => {} }) {
  let state = freshState(now()), active = false, wanted = false;
  let invalid = false, storageError = false, recovered = false;
  let dirty = false, timer = null, committed = null, release = null;
  let controller = null, generation = 0;
  const notify = (roster = false) => onChange(state, roster);
  function failure(area, error) {
    storageError = true;
    onError(area, error);
  }
  function load() {
    try {
      const raw = storage.getItem(SAVE_KEY);
      let loaded = parseSave(raw, now());
      recovered = false;
      invalid = false;
      if (raw && !loaded) {
        loaded = parseSave(storage.getItem(SAVE_KEY + '-backup'), now());
        recovered = !!loaded;
        invalid = !loaded;
      } else if (!raw) {
        loaded = parseSave(storage.getItem(LEGACY_KEY), now()) ??
          parseSave(storage.getItem(LEGACY_KEY + '-backup'), now());
      }
      state = loaded ?? freshState(now());
      committed = loaded ? JSON.stringify(loaded) : null;
      storageError = false;
    } catch (error) { invalid = true; failure('save.load', error); }
  }
  function cancelSave() {
    if (timer !== null) clearTimer(timer);
    timer = null;
  }
  function schedule() {
    dirty = true;
    if (timer !== null || invalid) return;
    timer = setTimer(() => { timer = null; flush(); }, SAVE_DELAY);
  }
  function settle() {
    const before = state.lastAccrual;
    accrue(state, now());
    if (state.lastAccrual !== before) dirty = true;
  }
  function flush(backup = false) {
    cancelSave();
    if (!active || invalid) return false;
    settle();
    if (!dirty) return true;
    try {
      const next = { ...state, revision: state.revision + 1 };
      const raw = JSON.stringify(next);
      if (backup && committed) storage.setItem(SAVE_KEY + '-backup', committed);
      storage.setItem(SAVE_KEY, raw);
      state.revision = next.revision;
      committed = raw;
      dirty = false;
      storageError = false;
      notify();
      return true;
    } catch (error) {
      failure('save.write', error);
      schedule();
      notify();
      return false;
    }
  }
  function activate() {
    // Retain unsaved in-memory progress after storage failures on this page.
    if (!dirty) load();
    active = true;
    settle();
    schedule();
    notify(true);
  }
  function start() {
    if (wanted) return;
    wanted = true;
    if (release) { activate(); return; }
    if (!locks) { activate(); return; }
    controller = new AbortController();
    const ticket = ++generation;
    locks.request(SAVE_KEY, { signal: controller.signal }, async () => {
      if (!wanted || ticket !== generation) return;
      const held = new Promise((resolve) => { release = resolve; });
      activate();
      await held;
    }).catch((error) => {
      if (error.name !== 'AbortError') {
        onError('save.lock', error);
        if (ticket === generation) {
          wanted = false;
          active = false;
          notify();
        }
      }
    });
    notify();
  }
  function pause() {
    if (active) flush();
    cancelSave();
    active = false;
    wanted = false;
    // A failed write must not hand a stale balance to another writer. Keep the
    // lock until this page resumes and retries, or the browser closes the page.
    if (dirty && storageError && release) { notify(); return; }
    generation++;
    controller?.abort();
    controller = null;
    release?.();
    release = null;
    notify();
  }
  function tap() {
    if (!active) return 0;
    const earned = tapGold(state, now());
    schedule();
    notify();
    return earned;
  }
  function change(action) {
    if (!active) return undefined;
    settle();
    const result = action(state);
    dirty = true;
    flush(result?.ok !== false);
    notify(true);
    return result;
  }
  function tick() {
    if (!active) return;
    settle();
    schedule();
    notify();
  }
  function receive(raw) {
    if (active || dirty) return;
    const latest = parseSave(raw, now());
    if (latest && latest.revision >= state.revision) {
      state = latest;
      notify(true);
    }
  }
  load();
  return {
    get state() { return state; },
    get active() { return active; },
    get status() {
      if (storageError) return '저장 불가 · 브라우저 설정 확인';
      if (invalid) return '기존 저장 파일 확인 필요';
      if (!active) return '다른 게임 창을 닫거나 전환해 주세요';
      if (recovered) return '보조 저장 복구 완료';
      return locks ? '자동 저장 · 2초 간격' : '자동 저장 · 한 창에서 플레이';
    },
    start, pause, tap, change, tick, flush, receive,
  };
}
