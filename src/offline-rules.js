import { operativeOwned } from './loot.js';
export const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;
export const OFFLINE_POPUP_MS = 60 * 60 * 1000;
export const offlineLimitMs = state => operativeOwned(state,'quartermaster') ? 12 * 60 * 60 * 1000 : MAX_OFFLINE_MS;
