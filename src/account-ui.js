import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { openDetail, onDetailAction } from './detail-popup.js';
import { createAccountController } from './account-controller.js';
import { accountTestingEnabled } from './account-config.js';
import { accountMarkup, accountDeleteMarkup } from './account-view.js';
import { reportError } from './diagnostics.js';
import './account.css';

export async function createAccountUI() {
  const native = Capacitor.isNativePlatform();
  const appId = native ? (await App.getInfo()).id : '';
  if (!accountTestingEnabled(import.meta.env.MODE, native, appId)) return null;
  const account = createAccountController({onError: reportError, loadAdapter: async () => {
    const {createFirebaseAuthAdapter} = await import('./firebase-auth-adapter.js');
    return createFirebaseAuthAdapter({native});
  }});
  let deletionUid = null;
  function show() { openDetail(accountMarkup(account.state)); void account.initialize(); }
  account.subscribe(state => {
    if (document.querySelector('#detail-modal[open] [data-account-panel]')) openDetail(accountMarkup(state));
  });
  onDetailAction(action => {
    if (action === 'account-show') show();
    if (action === 'account-retry') void account.initialize();
    if (action === 'account-sign-in') void account.signIn();
    if (action === 'account-sign-out') void account.signOut();
    if (action === 'account-delete-confirm') { deletionUid = account.state.user?.uid; openDetail(accountDeleteMarkup()); }
    if (action === 'account-delete') { const pending = account.deleteAccount(deletionUid); deletionUid = null; show(); void pending; }
  });
  return {show};
}
