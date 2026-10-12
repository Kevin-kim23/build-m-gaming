import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameSession} from '../src/session.js';
import {SAVE_KEY,freshState} from '../src/state.js';
import {serializeSave} from '../src/money.js';
import {parseSave} from '../src/save.js';
import {RESTORE_BACKUPS_KEY,LEGACY_RESTORE_BACKUP_KEY} from '../src/restore-backups.js';
const T=1800000000000;
function setup(){
  const values=new Map([[SAVE_KEY,serializeSave({...freshState(T),gold:55})]]);let fail=false;
  const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(fail===true||fail===k)throw Error('quota');values.set(k,v);}};
  const reports=[];
  const session=createGameSession({storage,now:()=>T,setTimer:()=>1,clearTimer:()=>{},onError:(area,error)=>reports.push([area,error.message])});session.start();
  return {session,values,reports,fail:(key=true)=>{fail=key;}};
}
test('cloud restore preserves prior local record and large money without merging balances',()=>{
  const h=setup();assert.equal(h.session.restoreCloud(serializeSave({...freshState(T),gold:10n**27n})),true);
  assert.equal(h.session.state.gold,10n**27n);
  assert.equal(parseSave(h.session.listRestoreBackups()[0].raw,T).gold,55);
  assert.equal(parseSave(h.values.get(SAVE_KEY),T).gold,10n**27n);
});
test('invalid data, failed backup and inactive session cannot replace local progress',()=>{
  const h=setup();assert.equal(h.session.restoreCloud('{bad'),false);assert.equal(h.session.state.gold,55);
  h.fail();assert.equal(h.session.restoreCloud(serializeSave(freshState(T))),false);assert.equal(h.session.state.gold,55);
  h.session.pause();assert.equal(h.session.restoreCloud(serializeSave(freshState(T))),false);
});
test('a second cloud restore must keep the first local record recoverable',()=>{
  const h=setup();
  assert.equal(h.session.restoreCloud(serializeSave({...freshState(T),gold:100})),true);
  assert.equal(h.session.restoreCloud(serializeSave({...freshState(T),gold:200})),true);
  assert.deepEqual(h.session.listRestoreBackups().map(entry=>parseSave(entry.raw,T).gold),[55,100]);
  assert.equal(new Set(h.session.listRestoreBackups().map(entry=>entry.id)).size,2);
});
test('selecting an older backup preserves all backups and also backs up the state being replaced',()=>{
  const h=setup();
  h.session.restoreCloud(serializeSave({...freshState(T),gold:10n**27n}));
  const first=h.session.listRestoreBackups()[0];
  h.session.restoreCloud(serializeSave({...freshState(T),gold:200}));
  assert.equal(h.session.restoreLocalBackup(first.id),true);
  assert.equal(h.session.state.gold,55);
  const entries=h.session.listRestoreBackups();
  assert.deepEqual(entries.map(entry=>parseSave(entry.raw,T).gold),[55,10n**27n,200]);
  assert.equal(entries[2].reason,'local-backup');
  assert.equal(h.session.restoreLocalBackup(entries[2].id),true);
  assert.equal(h.session.state.gold,200);
  assert.equal(h.session.listRestoreBackups().length,4);
});
test('legacy single-slot backup is readable, migrated without deletion, and can be restored',()=>{
  const h=setup();const legacy=serializeSave({...freshState(T),version:37,campaignStars:Array(160).fill(0),gold:10n**27n});
  h.values.set(LEGACY_RESTORE_BACKUP_KEY,legacy);
  assert.deepEqual(h.session.listRestoreBackups().map(entry=>entry.id),['legacy']);
  assert.equal(h.session.restoreLocalBackup('legacy'),true);
  assert.equal(h.session.state.gold,10n**27n);
  assert.equal(h.values.get(LEGACY_RESTORE_BACKUP_KEY),legacy);
  assert.equal(h.session.listRestoreBackups().length,2);
  assert.equal(h.session.listRestoreBackups()[0].raw,legacy);
  assert.equal(parseSave(h.session.listRestoreBackups()[1].raw,T).gold,55);
  assert.equal(parseSave(h.values.get(SAVE_KEY),T).version,38);
});
test('backup quota failure stops restore and preserves current progress and every earlier backup',()=>{
  const h=setup();h.session.restoreCloud(serializeSave({...freshState(T),gold:100}));
  const saved=h.values.get(SAVE_KEY),backups=h.values.get(RESTORE_BACKUPS_KEY);
  h.fail(RESTORE_BACKUPS_KEY);
  assert.equal(h.session.restoreCloud(serializeSave({...freshState(T),gold:200})),false);
  assert.equal(h.values.get(SAVE_KEY),saved);assert.equal(h.values.get(RESTORE_BACKUPS_KEY),backups);
  assert.equal(h.session.state.gold,100);
});
test('failure writing replacement keeps current state and retains the new safety backup',()=>{
  const h=setup();h.session.flush();const saved=h.values.get(SAVE_KEY);
  h.fail(SAVE_KEY);
  assert.equal(h.session.restoreCloud(serializeSave({...freshState(T),gold:200})),false);
  assert.equal(h.values.get(SAVE_KEY),saved);assert.equal(h.session.state.gold,55);
  assert.equal(parseSave(h.session.listRestoreBackups()[0].raw,T).gold,55);
});
test('corrupt backup index is not overwritten and diagnostics omit saved text',()=>{
  const h=setup();h.session.flush();const saved=h.values.get(SAVE_KEY);
  h.values.set(RESTORE_BACKUPS_KEY,'private saved text');
  assert.equal(h.session.listRestoreBackups(),null);
  assert.equal(h.session.restoreCloud(serializeSave({...freshState(T),gold:200})),false);
  assert.equal(h.values.get(RESTORE_BACKUPS_KEY),'private saved text');assert.equal(h.values.get(SAVE_KEY),saved);
  assert.doesNotMatch(JSON.stringify(h.reports),/private saved text/);
});
test('unknown, unreadable, future-format and inactive backup restores do not alter local state',()=>{
  const h=setup();h.session.flush();const saved=h.values.get(SAVE_KEY);
  h.values.set(LEGACY_RESTORE_BACKUP_KEY,'{bad');
  assert.equal(h.session.restoreLocalBackup('missing'),false);
  assert.equal(h.session.restoreLocalBackup('legacy'),false);
  h.values.set(LEGACY_RESTORE_BACKUP_KEY,serializeSave({...freshState(T),version:999,gold:200}));
  assert.equal(h.session.restoreLocalBackup('legacy'),false);
  assert.equal(h.values.get(SAVE_KEY),saved);assert.equal(h.values.has(RESTORE_BACKUPS_KEY),false);
  h.values.set(LEGACY_RESTORE_BACKUP_KEY,serializeSave({...freshState(T),gold:200}));
  h.session.pause();assert.equal(h.session.restoreLocalBackup('legacy'),false);
  assert.equal(h.session.state.gold,55);
});
test('backup choices survive a new session without changing the current saved progress',()=>{
  const h=setup();h.session.restoreCloud(serializeSave({...freshState(T),gold:100}));
  h.session.restoreCloud(serializeSave({...freshState(T),gold:200}));h.session.pause();
  const before=new Map(h.values);
  const session=createGameSession({storage:{getItem:key=>h.values.get(key)??null,setItem:(key,value)=>h.values.set(key,value)},now:()=>T,setTimer:()=>1,clearTimer:()=>{}});
  assert.deepEqual(session.listRestoreBackups().map(entry=>parseSave(entry.raw,T).gold),[55,100]);
  assert.equal(session.state.gold,200);assert.deepEqual(h.values,before);
  session.start();assert.equal(session.restoreLocalBackup(session.listRestoreBackups()[0].id),true);
  assert.equal(session.state.gold,55);
});
test('local backup restore also refuses to proceed if its safety backup cannot be saved',()=>{
  const h=setup();h.session.restoreCloud(serializeSave({...freshState(T),gold:100}));
  const first=h.session.listRestoreBackups()[0],before=new Map(h.values);
  h.fail(RESTORE_BACKUPS_KEY);
  assert.equal(h.session.restoreLocalBackup(first.id),false);
  assert.equal(h.session.state.gold,100);assert.deepEqual(h.values,before);
});
