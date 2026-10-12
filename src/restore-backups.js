import {SAVE_KEY} from './state.js';

export const RESTORE_BACKUPS_KEY = SAVE_KEY + '-restore-backups';
export const LEGACY_RESTORE_BACKUP_KEY = SAVE_KEY + '-before-cloud-restore';
export const RESTORE_BACKUP_LIMIT = 10;

function nextRestoreId(entries) {
  const ids=new Set(entries.map(entry=>entry.id));
  let serial=entries.length+1;
  while(ids.has(`restore-${serial}`))serial++;
  return `restore-${serial}`;
}

export function matchesRestoreBackup(entry, selected) {
  return !!selected&&entry.id===selected.id&&entry.raw===selected.raw
    &&entry.createdAt===selected.createdAt&&entry.reason===selected.reason;
}

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
  const migrated=entries.find(entry=>entry.id==='legacy');
  if(legacy!==null&&migrated&&migrated.raw!==legacy){
    // A downgraded app can replace only the old key. These are now two distinct
    // backups, not duplicate migration copies. Give the envelope copy a regular
    // ID in this read-only view; the next successful mutation persists both.
    const archived={...migrated,id:nextRestoreId(entries)};
    entries=entries.map(entry=>entry.id==='legacy'?archived:entry);
  }
  if (legacy !== null && !entries.some(entry => entry.id === 'legacy')) {
    entries = [{id:'legacy', createdAt:null, reason:'legacy', raw:legacy}, ...entries];
  }
  return entries;
}

export function appendRestoreBackup(storage, raw, createdAt, reason) {
  const entries = readRestoreBackups(storage);
  // Existing installations may already have more than the chosen limit. Never
  // prune those copies: require the user to explicitly free a slot first.
  if (entries.length >= RESTORE_BACKUP_LIMIT) throw new Error('restore-backup-limit');
  const entry = {id:nextRestoreId(entries), createdAt, reason, raw};
  // A single atomic storage write adds a copy without replacing existing
  // entries. No automatic pruning: quota errors stop the requested restore.
  storage.setItem(RESTORE_BACKUPS_KEY, JSON.stringify({version:1, entries:[...entries, entry]}));
  return entry;
}

// The caller passes the record shown in its confirmation dialog, not a storage
// key. Comparing its contents also rejects stale confirmations after ID reuse.
export function deleteRestoreBackup(storage, selected) {
  const entries = readRestoreBackups(storage);
  const target = entries.find(entry => matchesRestoreBackup(entry,selected));
  if (!target) return false;
  if (target.id === 'legacy') {
    const envelope = storage.getItem(RESTORE_BACKUPS_KEY);
    const hasMigratedCopy = envelope !== null
      && JSON.parse(envelope).entries.some(entry => entry.id === 'legacy'&&entry.raw===target.raw);
    // Remove the old key first. If the following envelope write fails, its
    // migrated copy still survives and the user can retry. With only an old
    // key, this single removal completes the deletion without a quota write.
    storage.removeItem(LEGACY_RESTORE_BACKUP_KEY);
    if (!hasMigratedCopy) return true;
  }
  storage.setItem(RESTORE_BACKUPS_KEY, JSON.stringify({version:1,
    entries:entries.filter(entry => entry.id !== target.id)}));
  return true;
}
