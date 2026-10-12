import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudUI} from '../src/cloud-ui.js';
import {createAccountController} from '../src/account-controller.js';
import {createGameSession} from '../src/session.js';
import {freshState,SAVE_KEY} from '../src/state.js';
import {serializeSave} from '../src/money.js';
import {RESTORE_BACKUP_LIMIT} from '../src/restore-backups.js';

test('local backup buttons work after auth SDK failure, require confirmation, and never call a server',async()=>{
  const original=globalThis.document,T=1800000000000;
  let click,requests=0;
  const dialog={open:false,innerHTML:'',scrollTop:0,setAttribute(){},
    addEventListener(name,listener){if(name==='click')click=listener;},showModal(){this.open=true;}};
  globalThis.document={createElement:()=>dialog,body:{append(){}},querySelector:()=>null};
  try{
    const values=new Map([[SAVE_KEY,serializeSave({...freshState(T),gold:55})]]);
    const session=createGameSession({storage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)},now:()=>T,setTimer:()=>1,clearTimer:()=>{}});
    session.start();session.restoreCloud(serializeSave({...freshState(T),gold:200}));
    const selected=session.listRestoreBackups()[0].id;
    const account=createAccountController({loadAdapter:()=>{throw Error('synthetic SDK failure');}});
    const ui=createCloudUI({account,session,call:async()=>requests++});
    assert.equal(await account.initialize(),false);assert.equal(account.state.phase,'error');
    const action=(name,data={})=>click({target:{closest:selector=>selector==='[data-detail-action]'?{dataset:{detailAction:name,...data}}:null}});
    // showBackups is independent of adapter initialization and signed-in UID.
    ui.showBackups();assert.match(dialog.innerHTML,/이 기기의 복원 전 백업/);
    action('local-backup-confirm',{backupId:selected});
    assert.match(dialog.innerHTML,/선택한 기록으로 되돌릴까요/);assert.equal(session.state.gold,200);
    action('local-backup-cancel');assert.equal(session.state.gold,200);
    action('local-backup-confirm',{backupId:selected});action('local-backup-restore');
    assert.equal(session.state.gold,55);assert.equal(requests,0);
    assert.match(dialog.innerHTML,/선택한 백업으로 되돌렸어요/);
    assert.equal(session.listRestoreBackups().length,2);
    const count=session.listRestoreBackups().length;
    action('local-backup-restore');assert.equal(session.listRestoreBackups().length,count);
    assert.match(dialog.innerHTML,/이 백업 삭제/);
    assert.match(dialog.innerHTML,/공간이 부족하면 필요 없는 백업/);
    const currentSave=values.get(SAVE_KEY);
    action('local-backup-delete');assert.equal(session.listRestoreBackups().length,count);
    action('local-backup-delete-confirm',{backupId:selected});
    assert.match(dialog.innerHTML,/선택한 백업을 삭제할까요/);
    assert.equal(session.listRestoreBackups().length,count);
    action('local-backup-cancel');action('local-backup-delete');
    assert.equal(session.listRestoreBackups().length,count);
    action('local-backup-delete-confirm',{backupId:selected});action('local-backup-delete');
    assert.equal(session.listRestoreBackups().length,count-1);
    assert.match(dialog.innerHTML,/선택한 백업 하나를 삭제했어요/);
    assert.equal(values.get(SAVE_KEY),currentSave);assert.equal(session.state.gold,55);
    assert.equal(requests,0);
    action('local-backup-delete');assert.equal(session.listRestoreBackups().length,count-1);
    const remaining=session.listRestoreBackups()[0];
    action('local-backup-delete-confirm',{backupId:remaining.id});session.pause();
    action('local-backup-delete');assert.equal(session.listRestoreBackups().length,count-1);
    assert.match(dialog.innerHTML,/백업을 삭제하지 못했어요/);
    session.start();
    while(session.listRestoreBackups().length<RESTORE_BACKUP_LIMIT){
      assert.equal(session.restoreCloud(serializeSave({...freshState(T),gold:300})),true);
    }
    ui.showBackups();assert.match(dialog.innerHTML,/보관 상한 10개/);
    const fullSave=values.get(SAVE_KEY),first=session.listRestoreBackups()[0];
    action('local-backup-confirm',{backupId:first.id});action('local-backup-restore');
    assert.match(dialog.innerHTML,/보관 상한 10개에 도달해 되돌리기를 중단/);
    assert.equal(values.get(SAVE_KEY),fullSave);assert.equal(session.state.gold,300);
    assert.equal(session.listRestoreBackups().length,RESTORE_BACKUP_LIMIT);
    assert.equal(requests,0);
    account.dispose();session.pause();
  }finally{
    if(original===undefined)delete globalThis.document;else globalThis.document=original;
  }
});
