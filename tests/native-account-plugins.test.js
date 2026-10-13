import test from 'node:test';
import assert from 'node:assert/strict';
import {loadNativeAuthentication, loadNativeAppCheck} from '../src/native-account-plugins.js';

function fixture() {
  const calls = [];
  const plugin = new Proxy({}, {get(_target, method) {
    if (method === 'then') return () => { calls.push('then'); };
    return function (...args) {
      assert.equal(this, plugin);
      calls.push({method, args});
      return Promise.resolve({result: 'synthetic'});
    };
  }});
  return {plugin, calls};
}

test('imported authentication proxy is boxed without then assimilation or eager native calls', async () => {
  const {plugin, calls} = fixture();
  const facade = await loadNativeAuthentication(undefined, async () => ({FirebaseAuthentication: plugin}));
  assert.equal(facade.then, undefined);
  assert.deepEqual(calls, []);
  const options = {skipNativeAuth: true, useCredentialManager: true};
  assert.deepEqual(await facade.signInWithGoogle(options), {result: 'synthetic'});
  await facade.signOut();
  assert.deepEqual(calls, [{method: 'signInWithGoogle', args: [options]}, {method: 'signOut', args: []}]);
});

test('App Check proxy waits for an explicit token request and never invokes then', async () => {
  const {plugin, calls} = fixture();
  const facade = await loadNativeAppCheck(async () => ({registerPlugin(name) {
    assert.equal(name, 'GameAppCheck'); return plugin;
  }}));
  assert.equal(facade.then, undefined);
  assert.deepEqual(calls, []);
  assert.deepEqual(await facade.getToken(), {result: 'synthetic'});
  assert.deepEqual(calls, [{method: 'getToken', args: []}]);
});

test('plugin loading failures propagate without replacing security providers', async () => {
  const failed = async () => { throw new Error('synthetic-load-failure'); };
  await assert.rejects(loadNativeAuthentication(undefined, failed), /synthetic-load-failure/);
  await assert.rejects(loadNativeAppCheck(failed), /synthetic-load-failure/);
});
