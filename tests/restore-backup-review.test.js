import test from 'node:test';
import assert from 'node:assert/strict';
import {appendRestoreBackup,readRestoreBackups,deleteRestoreBackup,LEGACY_RESTORE_BACKUP_KEY,RESTORE_BACKUP_LIMIT} from '../src/restore-backups.js';
import {createGameSession} from '../src/session.js';
import {createCloudUI} from '../src/cloud-ui.js';
import {freshState,SAVE_KEY} from '../src/state.js';
import {serializeSave} from '../src/money.js';
const T=1800000000000;

function fixture() {
  const values=new Map([[SAVE_KEY,serializeSave({...freshState(T),gold:55})]]);
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  return {values,storage};
}

test('deleting a migrated legacy copy never also deletes a different unconfirmed old-key record',()=>{
  const h=fixture();
  const original=serializeSave({...freshState(T),gold:100});
  const laterOldAppBackup=serializeSave({...freshState(T),gold:200});
  h.values.set(LEGACY_RESTORE_BACKUP_KEY,original);
  appendRestoreBackup(h.storage,'another synthetic backup',T,'cloud');
  const selected=readRestoreBackups(h.storage).find(entry=>entry.id==='legacy');
  // An older app can update its single key while the migrated envelope survives.
  h.values.set(LEGACY_RESTORE_BACKUP_KEY,laterOldAppBackup);
  deleteRestoreBackup(h.storage,selected);
  assert.ok(h.values.get(LEGACY_RESTORE_BACKUP_KEY)===laterOldAppBackup,'unconfirmed old-key copy must survive');
  assert.ok(readRestoreBackups(h.storage).some(entry=>entry.raw===original));
});

test('diverged legacy copies are both visible, count toward the limit and can each be deleted independently',()=>{
  for(const remove of ['old-key','migrated']){
    const h=fixture();
    const original=serializeSave({...freshState(T),gold:100});
    const laterOldAppBackup=serializeSave({...freshState(T),gold:200});
    h.values.set(LEGACY_RESTORE_BACKUP_KEY,original);
    for(let i=1;i<RESTORE_BACKUP_LIMIT;i++)appendRestoreBackup(h.storage,`synthetic backup ${i}`,T+i,'cloud');
    h.values.set(LEGACY_RESTORE_BACKUP_KEY,laterOldAppBackup);
    const unchanged=new Map(h.values),entries=readRestoreBackups(h.storage);
    assert.equal(entries.length,RESTORE_BACKUP_LIMIT+1);
    assert.equal(new Set(entries.map(entry=>entry.id)).size,entries.length);
    assert.ok(entries.some(entry=>entry.raw===original));
    assert.ok(entries.some(entry=>entry.raw===laterOldAppBackup));
    assert.deepEqual(h.values,unchanged,'listing never writes a migration');
    assert.throws(()=>appendRestoreBackup(h.storage,'one more',T+20,'cloud'),/restore-backup-limit/);
    assert.deepEqual(h.values,unchanged);
    const selected=entries.find(entry=>entry.raw===(remove==='old-key'?laterOldAppBackup:original));
    assert.equal(deleteRestoreBackup(h.storage,selected),true);
    const remaining=readRestoreBackups(h.storage);
    assert.equal(remaining.length,RESTORE_BACKUP_LIMIT);
    assert.equal(remaining.some(entry=>entry.raw===selected.raw),false);
    assert.ok(remaining.some(entry=>entry.raw===(remove==='old-key'?original:laterOldAppBackup)));
    assert.equal(h.values.get(SAVE_KEY),unchanged.get(SAVE_KEY));
  }
});

test('a restore confirmation cannot follow a reused backup ID to different saved progress',()=>{
  const originalDocument=globalThis.document;
  let click;
  const dialog={open:false,innerHTML:'',scrollTop:0,setAttribute(){},
    addEventListener(name,listener){if(name==='click')click=listener;},showModal(){this.open=true;}};
  globalThis.document={createElement:()=>dialog,body:{append(){}},querySelector:()=>null};
  const h=fixture();
  const session=createGameSession({storage:h.storage,now:()=>T,setTimer:()=>1,clearTimer:()=>{}});
  try {
    session.start();
    session.restoreCloud(serializeSave({...freshState(T),gold:100}));
    const selected=session.listRestoreBackups()[0];
    const ui=createCloudUI({account:{subscribe:()=>()=>{}},session,call:async()=>{throw Error('unexpected network request');}});
    const action=(name,data={})=>click({target:{closest:selector=>selector==='[data-detail-action]'?{dataset:{detailAction:name,...data}}:null}});
    ui.showBackups();action('local-backup-confirm',{backupId:selected.id});
    assert.match(dialog.innerHTML,/선택한 기록으로 되돌릴까요/);
    session.deleteRestoreBackup(selected);
    session.restoreCloud(serializeSave({...freshState(T),gold:200}));
    assert.equal(session.listRestoreBackups()[0].id,selected.id);
    assert.notEqual(session.listRestoreBackups()[0].raw,selected.raw);
    action('local-backup-restore');
    assert.equal(session.state.gold,200,'stale confirmation must leave current progress unchanged');
  } finally {
    session.pause();
    if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
  }
});
