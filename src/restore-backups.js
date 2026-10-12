import {SAVE_KEY} from './state.js';

export const RESTORE_BACKUPS_KEY = SAVE_KEY + '-restore-backups';
export const LEGACY_RESTORE_BACKUP_KEY = SAVE_KEY + '-before-cloud-restore';

// The envelope contains serialized saves, not game state. Save migrations and
// large-number serialization continue to belong to inspectSave/serializeSave.
export function readRestoreBackups(storage) {
  const raw = storage.getItem(RESTORE_BACKUPS_KEY);
  let entries = [];
  if (raw !== null) {
    let envelope;
    try { envelope = JSON.parse(raw); }
    catch { throw new Error('restore-backup-envelope-unreadable'); }
    const ids = new Set();
    if (envelope?.version !== 1 || !Array.isArray(envelope.entries)) {
      throw new Error('restore-backup-envelope-unsupported');
    }
    for (const entry of envelope.entries) {
      if (!entry || typeof entry.id !== 'string' || !/^(legacy|restore-\d+)$/.test(entry.id)
        || ids.has(entry.id) || typeof entry.raw !== 'string'
        || !(entry.createdAt === null || Number.isSafeInteger(entry.createdAt) && entry.createdAt >= 0)
        || !['legacy', 'cloud', 'local-backup'].includes(entry.reason)) {
        throw new Error('restore-backup-entry-unreadable');
      }
      ids.add(entry.id);
    }
    entries = envelope.entries;
  }
  // Retain the old single-slot key as well. A failed write must never remove the
  // only surviving copy from an older version of the app.
  const legacy = storage.getItem(LEGACY_RESTORE_BACKUP_KEY);
  if (legacy !== null && !entries.some(entry => entry.id === 'legacy')) {
    entries = [{id:'legacy', createdAt:null, reason:'legacy', raw:legacy}, ...entries];
  }
  return entries;
}

export function appendRestoreBackup(storage, raw, createdAt, reason) {
  const entries = readRestoreBackups(storage);
  const ids = new Set(entries.map(entry => entry.id));
  let serial = entries.length + 1;
  while (ids.has(`restore-${serial}`)) serial++;
  const entry = {id:`restore-${serial}`, createdAt, reason, raw};
  // A single atomic storage write adds a copy without replacing existing
  // entries. No automatic pruning: quota errors stop the requested restore.
  storage.setItem(RESTORE_BACKUPS_KEY, JSON.stringify({version:1, entries:[...entries, entry]}));
  return entry;
}
