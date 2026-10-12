import test from 'node:test';
import assert from 'node:assert/strict';
import {readRestoreBackups,appendRestoreBackup,RESTORE_BACKUPS_KEY} from '../src/restore-backups.js';
import {restoreBackupsMarkup} from '../src/cloud-ui.js';
import {freshState} from '../src/state.js';
import {serializeSave} from '../src/money.js';
const T=1800000000000;

test('backup envelope rejects unknown formats, duplicate IDs and invalid metadata without a write',()=>{
  const valid={id:'restore-1',createdAt:T,reason:'cloud',raw:'save'};
  for(const envelope of [
    {version:2,entries:[]},{version:1,entries:{}},
    {version:1,entries:[valid,valid]},
    {version:1,entries:[{...valid,raw:{gold:55}}]},
    {version:1,entries:[{...valid,createdAt:-1}]},
    {version:1,entries:[{...valid,reason:'unknown'}]},
  ]){
    let writes=0;
    const storage={getItem:key=>key===RESTORE_BACKUPS_KEY?JSON.stringify(envelope):null,setItem:()=>writes++};
    assert.throws(()=>readRestoreBackups(storage));
    assert.throws(()=>appendRestoreBackup(storage,'save',T,'cloud'));
    assert.equal(writes,0);
  }
});
test('backup UI shows separate recoverable records, escapes metadata, and handles missing or damaged backups',()=>{
  const raw=serializeSave({...freshState(T),gold:10n**27n});
  const markup=restoreBackupsMarkup([{id:'<script>',createdAt:null,reason:'legacy',raw}],{});
  assert.match(markup.body,/이전 앱의 복원 전 백업/);assert.match(markup.body,/data-backup-id="&lt;script&gt;"/);
  assert.doesNotMatch(markup.body,/<script>/);assert.match(markup.body,/자동으로 지우지/);
  assert.match(markup.body,/서버 기록을 바꾸거나/);assert.match(markup.body,/local-backup-confirm/);
  assert.match(restoreBackupsMarkup([]).body,/아직 복원 전 백업이 없어요/);
  assert.match(restoreBackupsMarkup(null).body,/백업 목록을 읽지 못했어요/);
  assert.match(restoreBackupsMarkup([{id:'broken',createdAt:null,reason:'legacy',raw:'{bad'}]).body,/disabled/);
  assert.match(restoreBackupsMarkup([{id:'one',createdAt:T,reason:'cloud',raw}],{active:false}).body,/disabled/);
});
