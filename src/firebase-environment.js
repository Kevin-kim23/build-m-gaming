import {DEVELOPMENT_FIREBASE, PRODUCTION_FIREBASE} from './account-config.js';
// Select at build time so the other project's credentials are removed from the bundle.
export const FIREBASE_APP_NAME = import.meta.env?.MODE === 'development' || import.meta.env?.MODE === 'firebase-dev'
  ? 'budae-account-development' : 'budae-account-production';
export const FIREBASE_CONFIG = import.meta.env?.MODE === 'development' || import.meta.env?.MODE === 'firebase-dev'
  ? DEVELOPMENT_FIREBASE : PRODUCTION_FIREBASE;
