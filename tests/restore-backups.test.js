import test from 'node:test';
import assert from 'node:assert/strict';
import {appendRestoreBackup,readRestoreBackups,deleteRestoreBackup,RESTORE_BACKUPS_KEY,LEGACY_RESTORE_BACKUP_KEY,RESTORE_BACKUP_LIMIT} from '../src/restore-backups.js';
import {SAVE_KEY,freshState} from '../src/state.js';
import {serializeSave} from '../src/money.js';
const T=1800000000000;
function fixture() {
  const current=serializeSave({...freshState(T),gold:10n**27n});
  const values=new Map([[SAVE_KEY,current],[SAVE_KEY+'-backup',current]]),writes=[];
  let failed=null;
  return {values,writes,fail:key=>{failed=key;},storage:{
    getItem:key=>values.get(key)??null,
    setItem(key,value){if(failed===key)throw Error('quota');writes.push(key);values.set(key,value);},
    removeItem(key){if(failed===key)throw Error('blocked');writes.push(key);values.delete(key);},
  }};
}
test('individual deletion removes only the selected backup and never the active or regular recovery save',()=>{
  const h=fixture(),current=h.values.get(SAVE_KEY);
  const first=appendRestoreBackup(h.storage,'first',T,'cloud');
  appendRestoreBackup(h.storage,'second',T+1,'cloud');
  assert.equal(deleteRestoreBackup(h.storage,first),true);
  assert.deepEqual(readRestoreBackups(h.storage).map(entry=>entry.raw),['second']);
  assert.equal(h.values.get(SAVE_KEY),current);assert.equal(h.values.get(SAVE_KEY+'-backup'),current);
  assert.ok(h.writes.every(key=>[RESTORE_BACKUPS_KEY,LEGACY_RESTORE_BACKUP_KEY].includes(key)));
});
test('a confirmed legacy deletion removes both old and migrated copies without reappearing',()=>{
  for(const migrated of [false,true]){
    const h=fixture();h.values.set(LEGACY_RESTORE_BACKUP_KEY,'old saved progress');
    if(migrated)appendRestoreBackup(h.storage,'new backup',T,'cloud');
    const selected=readRestoreBackups(h.storage).find(entry=>entry.id==='legacy');
    assert.equal(deleteRestoreBackup(h.storage,selected),true);
    assert.equal(h.values.has(LEGACY_RESTORE_BACKUP_KEY),false);
    assert.deepEqual(readRestoreBackups(h.storage).map(entry=>entry.raw),migrated?['new backup']:[]);
  }
});
test('failed legacy deletion preserves a recoverable copy and can be retried',()=>{
  for(const failedKey of [RESTORE_BACKUPS_KEY,LEGACY_RESTORE_BACKUP_KEY]){
    const h=fixture();h.values.set(LEGACY_RESTORE_BACKUP_KEY,'old saved progress');
    appendRestoreBackup(h.storage,'new backup',T,'cloud');
    const selected=readRestoreBackups(h.storage).find(entry=>entry.id==='legacy');
    h.fail(failedKey);assert.throws(()=>deleteRestoreBackup(h.storage,selected));
    assert.equal(readRestoreBackups(h.storage).find(entry=>entry.id==='legacy').raw,'old saved progress');
    h.fail(null);assert.equal(deleteRestoreBackup(h.storage,selected),true);
  }
});
test('stale confirmation, arbitrary storage keys and corrupt index cannot delete other records',()=>{
  const h=fixture(),selected=appendRestoreBackup(h.storage,'first',T,'cloud');
  assert.equal(deleteRestoreBackup(h.storage,{...selected,id:SAVE_KEY}),false);
  assert.equal(deleteRestoreBackup(h.storage,{...selected,raw:'changed'}),false);
  assert.equal(deleteRestoreBackup(h.storage,selected),true);
  const replacement=appendRestoreBackup(h.storage,'different content',T+1,'cloud');
  assert.equal(replacement.id,selected.id);
  assert.equal(deleteRestoreBackup(h.storage,selected),false);
  const before=new Map(h.values);
  h.values.set(RESTORE_BACKUPS_KEY,'unreadable synthetic index');
  assert.throws(()=>deleteRestoreBackup(h.storage,replacement));
  assert.equal(h.values.get(SAVE_KEY),before.get(SAVE_KEY));
  assert.equal(h.values.get(RESTORE_BACKUPS_KEY),'unreadable synthetic index');
});
test('ten-backup limit counts the legacy slot, preserves every copy and resumes after explicit deletion',()=>{
  const h=fixture();assert.equal(RESTORE_BACKUP_LIMIT,10);
  h.values.set(LEGACY_RESTORE_BACKUP_KEY,'legacy saved progress');
  for(let i=1;i<RESTORE_BACKUP_LIMIT;i++)appendRestoreBackup(h.storage,`synthetic-${i}`,T+i,'cloud');
  const before=new Map(h.values);
  assert.equal(readRestoreBackups(h.storage).length,RESTORE_BACKUP_LIMIT);
  assert.throws(()=>appendRestoreBackup(h.storage,'eleventh',T+20,'cloud'),/restore-backup-limit/);
  assert.deepEqual(h.values,before);
  const selected=readRestoreBackups(h.storage)[1];
  assert.equal(deleteRestoreBackup(h.storage,selected),true);
  appendRestoreBackup(h.storage,'replacement',T+21,'cloud');
  assert.equal(readRestoreBackups(h.storage).length,RESTORE_BACKUP_LIMIT);
  assert.equal(readRestoreBackups(h.storage)[0].id,'legacy');
});
test('older installations already over the limit retain all records until user-selected deletion',()=>{
  const h=fixture(),entries=Array.from({length:12},(_,i)=>({id:`restore-${i+1}`,createdAt:T+i,reason:'cloud',raw:`synthetic-${i}`}));
  h.values.set(RESTORE_BACKUPS_KEY,JSON.stringify({version:1,entries}));
  const before=new Map(h.values);
  assert.equal(readRestoreBackups(h.storage).length,12);
  assert.throws(()=>appendRestoreBackup(h.storage,'new',T+20,'cloud'),/restore-backup-limit/);
  assert.deepEqual(h.values,before);
  for(const entry of entries.slice(0,3))assert.equal(deleteRestoreBackup(h.storage,entry),true);
  appendRestoreBackup(h.storage,'new',T+20,'cloud');
  assert.deepEqual(readRestoreBackups(h.storage).slice(0,-1),entries.slice(3));
});
