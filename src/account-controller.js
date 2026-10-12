// Authentication is deliberately independent of the local army save. No game state is accepted here.
import {cloudErrorMessage} from './cloud-controller.js';

const CANCELLED = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/cancelled']);
const SERVER_ERRORS=Object.freeze({
  'rate-limit':'functions/resource-exhausted',
  'rate-limit-exceeded':'functions/resource-exhausted',
  'app-check-required':'functions/permission-denied',
  'app-check-unavailable':'functions/failed-precondition',
  'account-unavailable':'functions/unauthenticated',
  'security-unavailable':'functions/unavailable',
  'deletion-pending':'functions/unavailable',
  'account-deleting':'functions/failed-precondition',
  'sign-in-required':'functions/unauthenticated',
});
export function accountErrorCode(error) {
  if(['functions/failed-precondition','functions/unauthenticated'].includes(error?.code)&&error?.message==='recent-login-required')return 'auth/requires-recent-login';
  // Only accept known server code/message pairs. Provider messages and details
  // may contain account identifiers or tokens and must never enter diagnostics.
  if(Object.hasOwn(SERVER_ERRORS,error?.message)&&SERVER_ERRORS[error.message]===error?.code)return `server/${error.message}`;
  if (/cancel(?:l)?ed|12501/i.test(error?.message ?? '')) return 'auth/cancelled';
  return typeof error?.code === 'string' && /^auth\/[a-z0-9-]+$/.test(error.code)
    ? error.code : 'auth/unknown';
}
export function accountErrorMessage(code) {
  if (CANCELLED.has(code)) return '로그인을 취소했어요. 기존 게임 기록은 그대로예요.';
  if(typeof code==='string'&&code.startsWith('server/')&&Object.hasOwn(SERVER_ERRORS,code.slice(7)))return cloudErrorMessage({message:code.slice(7)});
  return ({
    'auth/popup-blocked': '로그인 창이 차단됐어요. 브라우저에서 팝업을 허용한 뒤 다시 눌러 주세요.',
    'auth/unauthorized-domain': '이 미리보기 주소의 로그인 설정이 필요해요. 개발자에게 알려 주세요.',
    'auth/network-request-failed': '인터넷 연결을 확인하고 다시 시도해 주세요.',
    'auth/too-many-requests': '요청이 많아요. 잠시 후 다시 시도해 주세요.',
    'auth/requires-recent-login': '계정 삭제 전에 로그아웃 후 다시 로그인해 주세요.',
    'auth/user-disabled': '이 계정은 이용이 중지됐어요. 문의 이메일로 연락해 주세요.',
  })[code] ?? '계정 연결을 완료하지 못했어요. 다시 시도해 주세요. 게임 기록은 그대로예요.';
}
function publicUser(user) {
  return user ? Object.freeze({uid: user.uid, email: user.email ?? ''}) : null;
}

export function createAccountController({loadAdapter, onError = () => {}}) {
  let adapter, initialization, unsubscribe, disposed = false;
  let accountGeneration=0;
  let state = Object.freeze({phase: 'idle', user: null, message: ''});
  const listeners = new Set();
  function publish(patch) {
    if (disposed) return;
    state = Object.freeze({...state, ...patch});
    for (const listener of listeners) listener(state);
  }
  function failure(area, error) {
    const code = accountErrorCode(error);
    // Never record SDK messages/objects: these can contain email addresses, credentials or tokens.
    if (!CANCELLED.has(code)) onError(`account.${area}`, new Error(code));
    return accountErrorMessage(code);
  }
  function initialize() {
    if (disposed) return Promise.resolve(false);
    if (initialization) return initialization;
    publish({phase: 'loading', message: ''});
    initialization = (async () => {
      try {
        // Defer even a synchronous adapter error until initialization has been assigned.
        await Promise.resolve();
        adapter = await loadAdapter();
        await adapter.ready();
        if (disposed) return false;
        unsubscribe = adapter.subscribe(user => {
          if(user&&user.uid!==state.user?.uid)accountGeneration++;
          publish({user: publicUser(user)});
        });
        publish({phase: 'ready', user: publicUser(adapter.currentUser())});
        return true;
      } catch (error) {
        initialization = null;
        publish({phase: 'error', message: failure('initialize', error)});
        return false;
      }
    })();
    return initialization;
  }
  // Called directly from the button click after initialization, preserving browser popup activation.
  function run(action) {
    if (disposed || state.phase !== 'ready' || !adapter) return Promise.resolve(false);
    if (action !== 'signIn' && !state.user) return Promise.resolve(false);
    const startedUid=state.user?.uid, accountTicket=accountGeneration;
    function changedAccount() {
      const user=publicUser(adapter.currentUser());
      if(action==='signIn'||(accountTicket===accountGeneration&&(!user||user.uid===startedUid)))return false;
      publish({phase:'ready',user,message:'로그인 계정이 달라졌어요. 현재 계정을 확인해 주세요.'});
      return true;
    }
    publish({phase: 'busy', message: ''});
    let operation;
    try { operation = adapter[action](); } catch (error) { operation = Promise.reject(error); }
    return Promise.resolve(operation).then(() => {
      if(changedAccount())return false;
      publish({phase: 'ready', user: publicUser(adapter.currentUser()), message:
        action === 'signIn' ? '구글 로그인 완료 · 서버 기록은 닉네임·서버 기록 화면에서 확인해 주세요.'
          : action === 'deleteAccount' ? '서버 계정과 기록을 삭제했어요. 이 기기의 게임 기록은 유지돼요.'
            : '로그아웃했어요. 이 기기의 게임 기록은 유지돼요.'});
      return true;
    }, error => {
      if(changedAccount())return false;
      publish({phase: 'ready', user: publicUser(adapter.currentUser()), message: failure(action, error)});
      return false;
    });
  }
  return {
    get state() { return state; }, initialize,
    signIn: () => run('signIn'), signOut: () => run('signOut'),
    deleteAccount: confirmedUid => {
      if (!confirmedUid || confirmedUid !== state.user?.uid) {
        publish({message: '로그인 계정이 달라졌어요. 현재 계정을 확인한 뒤 다시 삭제해 주세요.'});
        return Promise.resolve(false);
      }
      return run('deleteAccount');
    },
    subscribe(listener) { listeners.add(listener); listener(state); return () => listeners.delete(listener); },
    dispose() { disposed = true; unsubscribe?.(); listeners.clear(); },
  };
}
