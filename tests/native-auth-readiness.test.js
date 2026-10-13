import test from 'node:test';
import assert from 'node:assert/strict';
import {createFirebaseAuthAdapter} from '../src/firebase-auth-adapter.js';

test('native authentication readiness never assimilates the Capacitor plugin proxy', async () => {
  let thenCalls = 0, signOutCalls = 0, signInCalls = 0;
  const plugin = new Proxy({}, {get(_target, method) {
    if (method === 'then') return () => { thenCalls++; };
    if (method === 'signOut') return async () => { signOutCalls++; };
    if (method === 'signInWithGoogle') return async () => { signInCalls++; };
  }});
  const adapter = createFirebaseAuthAdapter({native: true, nativePlugin: plugin});
  let timer;
  try {
    const outcome = await Promise.race([
      adapter.ready().then(() => 'ready'),
      new Promise(resolve => { timer = setTimeout(() => resolve('pending'), 1000); }),
    ]);
    assert.equal(thenCalls, 0, 'Promise must not invoke the native proxy as a thenable');
    assert.equal(outcome, 'ready');
    assert.equal(signInCalls, 0, 'initialization must not start Google sign-in');
    assert.equal(adapter.currentUser(), null);
    await adapter.signOut();
    assert.equal(signOutCalls, 1);
  } finally { clearTimeout(timer); }
});
