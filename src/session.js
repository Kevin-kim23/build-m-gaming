import { serializeSave } from './money.js';
import { SAVE_KEY, LEGACY_KEY, freshState, SAVE_VERSION } from './state.js';
import { accrue, tapGold } from './game.js';
import { inspectSave } from './save.js';
import { prepareOfflineReward, claimOfflineReward } from './offline-reward.js';

export const SAVE_DELAY = 2000;
export const RECOVERY_KEY = SAVE_KEY + '-recovery';
// One visible writer holds the same lock used by older versions. Touches never
// access storage; handoff flushes synchronously before releasing ownership.
export function createGameSession({ storage, locks, now = Date.now,
  setTimer = setTimeout, clearTimer = clearTimeout,
  onChange = () => {}, onError = () => {} }) {
  let state = freshState(now()), active = false, wanted = false;
  let invalid = false, storageError = false, recovered = false;
  let dirty = false, timer = null, committed = null, release = null;
  let controller = null, generation = 0;
  let saveIssue = null, pendingRecovery = null;
  let claiming = false;
  const reportedIssues = new Map();
  const notify = (roster = false) => { if (!claiming) onChange(state, roster); };
  function failure(area, error) {
    storageError = true;
    onError(area, error);
  }
  function inspect(raw, source) {
    const result = inspectSave(raw, now());
    if (!result.issue) reportedIssues.delete(source);
    else {
      const { code, field, version } = result.issue;
      const signature = `${code}:${field}:${version}`;
      if (reportedIssues.get(source) !== signature) {
        reportedIssues.set(source, signature);
        // Do not pass native JSON errors: their messages can contain private save text.
        onError('save.parse', new Error(`${source}: ${code}; field=${field ?? '-'}; version=${version ?? 'unknown'}`));
      }
    }
    return result;
  }
  function load() {
    try {
      const raw = storage.getItem(SAVE_KEY);
      const sources = raw !== null
        ? [[SAVE_KEY, raw], [SAVE_KEY + '-backup']]
        : [[SAVE_KEY, raw], [SAVE_KEY + '-backup'], [LEGACY_KEY], [LEGACY_KEY + '-backup']];
      let loaded = null;
      recovered = false;
      invalid = false;
      saveIssue = null;
      pendingRecovery = null;
      for (const [key, primary] of sources) {
        const candidate = key === SAVE_KEY ? primary : storage.getItem(key);
        const result = inspect(candidate, key);
        if (result.state) {
          loaded = result.state;
          recovered = !!saveIssue || key.endsWith('-backup');
          break;
        }
        if (result.issue) {
          saveIssue ??= result.issue;
          pendingRecovery ??= candidate;
          // An older app must not replace a newer-format save with an old backup.
          if (result.issue.code === 'unsupported-version' && result.issue.version > SAVE_VERSION) {
            saveIssue = result.issue;
            break;
          }
        }
      }
      invalid = !!saveIssue && !loaded;
      state = loaded ?? freshState(now());
      committed = loaded ? serializeSave(loaded) : null;
      storageError = false;
    } catch (error) { invalid = true; failure('save.load', error); }
  }
  function cancelSave() {
    if (timer !== null) clearTimer(timer);
    timer = null;
  }
  function schedule() {
    if (invalid) return;
    dirty = true;
    if (timer !== null) return;
    timer = setTimer(() => { timer = null; flush(); }, SAVE_DELAY);
  }
  function settle() {
    if (invalid) return;
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
      const raw = serializeSave(next);
      // Preserve the most recent damaged original before replacing it with recovered progress.
      // If this write fails, leave the original and the working backup untouched.
      if (pendingRecovery !== null) storage.setItem(RECOVERY_KEY, pendingRecovery);
      if (backup && committed) storage.setItem(SAVE_KEY + '-backup', committed);
      storage.setItem(SAVE_KEY, raw);
      pendingRecovery = null;
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
    const prepared = !invalid && prepareOfflineReward(state, now());
    if (prepared) dirty = true;
    settle();
    if (prepared) flush();
    else schedule();
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
    if (!active || invalid) return 0;
    const earned = tapGold(state, now());
    schedule();
    notify();
    return earned;
  }
  function change(action) {
    if (!active || invalid) return undefined;
    settle();
    const result = action(state);
    dirty = true;
    flush(result?.ok !== false);
    notify(true);
    return result;
  }
  function tick() {
    if (!active || invalid) return;
    settle();
    schedule();
    notify();
  }
  function receive(raw) {
    if (active || dirty) return;
    const latest = inspect(raw, SAVE_KEY).state;
    if (latest && latest.revision >= state.revision) {
      state = latest;
      notify(true);
    }
  }
  function retryLoad() {
    if (!active || !invalid) return false;
    load();
    if (!invalid && prepareOfflineReward(state, now())) dirty = true;
    settle();
    schedule();
    notify(true);
    return !invalid;
  }
  function claimOffline(id, multiplier = 1) {
    if (!active || invalid) return {ok:false,reason:'inactive'};
    settle();
    const previous = state;
    state = {...state};
    const result = claimOfflineReward(state,id,multiplier);
    if (!result.ok) { state = previous; return result; }
    dirty = true;
    claiming = true;
    let saved;
    try { saved = flush(); }
    finally { claiming = false; }
    if (!saved) state = previous; // Failed persistence cannot consume the reward or expose spendable gold.
    notify(true);
    return saved ? result : {ok:false,reason:'save'};
  }
  load();
  return {
    get state() { return state; },
    // Unknown/unreadable saves must not opt the player into startup sound.
    get hasSavedProgress() { return committed !== null || invalid; },
    get active() { return active && !invalid; },
    get saveNotice() {
      if (storageError) return { kind: invalid ? 'blocked' : 'warning', canRetry: invalid,
        title: '저장 공간을 확인해 주세요',
        message: '기록을 읽거나 저장하지 못했어요. 저장 공간과 브라우저 설정을 확인해 주세요. 게임 정보에서 문의용 정보를 복사할 수 있어요.' };
      if (invalid) return { kind: 'blocked', canRetry: true, title: '저장 기록을 확인해 주세요',
        message: saveIssue?.code === 'unsupported-version'
          ? '이 앱에서 읽을 수 없는 저장 버전이에요. 앱을 업데이트한 뒤 다시 확인해 주세요. 기존 기록은 덮어쓰지 않아요. 문의용 정보를 복사할 수 있어요.'
          : '저장 기록과 보조 저장을 불러오지 못해 진행을 잠시 멈췄어요. 기존 기록은 그대로 보관해요. 앱 데이터를 지우지 말고 문의용 정보를 복사해 주세요.' };
      if (recovered) return { kind: 'recovered', canRetry: false, title: '보조 저장을 불러왔어요',
        message: '읽을 수 있는 보조 기록으로 복구했어요. 최근 진행 일부는 없을 수 있어요. 문제가 계속되면 문의용 정보를 복사해 주세요.' };
      return null;
    },
    get status() {
      if (storageError) return '저장 불가 · 브라우저 설정 확인';
      if (invalid) return '기존 저장 파일 확인 필요';
      if (!active) return '다른 게임 창을 닫거나 전환해 주세요';
      if (recovered) return '보조 저장 복구 완료';
      return locks ? '자동 저장 · 2초 간격' : '자동 저장 · 한 창에서 플레이';
    },
    start, pause, tap, change, tick, flush, receive, retryLoad, claimOffline,
  };
}
