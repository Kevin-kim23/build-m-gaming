import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { openDetail, onDetailAction } from './detail-popup.js';
import { createAccountController } from './account-controller.js';
import { accountEnabled } from './account-config.js';
import { accountMarkup, accountDeleteMarkup } from './account-view.js';
import { reportError } from './diagnostics.js';
import './account.css';
import {DEVELOPMENT_POLICY} from './policy-mode.js';
import {createCloudUI} from './cloud-ui.js';

export async function createAccountUI(session) {
  const native = Capacitor.isNativePlatform();
  const appId = native ? (await App.getInfo()).id : '';
  if (!accountEnabled(import.meta.env.MODE, native, appId)) return null;
  let backend;
  const account = createAccountController({onError: reportError, loadAdapter: async () => {
    const {createFirebaseAuthAdapter} = await import('./firebase-auth-adapter.js');
    backend=createFirebaseAuthAdapter({native});return backend;
  }});
  createCloudUI({account,session,call:(name,data)=>backend.call(name,data)});
  let deletionUid = null;
  function show() { openDetail(accountMarkup(account.state, DEVELOPMENT_POLICY)); void account.initialize(); }
  account.subscribe(state => {
    if (document.querySelector('#detail-modal[open] [data-account-panel]')) openDetail(accountMarkup(state, DEVELOPMENT_POLICY));
  });
  onDetailAction(action => {
    if (action === 'account-show') show();
    if (action === 'account-retry') void account.initialize();
    if (action === 'account-sign-in') void account.signIn();
    if (action === 'account-sign-out') void account.signOut();
    if (action === 'account-delete-confirm') { deletionUid = account.state.user?.uid; openDetail(accountDeleteMarkup(DEVELOPMENT_POLICY)); }
    if (action === 'account-delete') { const pending = account.deleteAccount(deletionUid); deletionUid = null; show(); void pending; }
  });
  return {show};
}
