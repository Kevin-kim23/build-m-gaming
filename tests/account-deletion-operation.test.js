import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountDeletion} from '../src/account-deletion-operation.js';

test('deletion response cannot sign out another account selected while the server request was pending',async()=>{
  let user={uid:'original'},finish,local=0,native=0;
  const remove=createAccountDeletion({currentUser:()=>user,
    deleteServerAccount:()=>new Promise(resolve=>{finish=resolve;}),
    signOutLocal:async()=>{local++;user=null;},loadNativeSignOut:async()=>async()=>native++});
  const pending=remove();user={uid:'new-account'};finish();
  await assert.rejects(pending,{message:'account-changed'});
  assert.equal(user.uid,'new-account');assert.equal(local,0);assert.equal(native,0);
});
test('unchanged account is deleted before JS and native sessions are signed out',async()=>{
  for(const native of [false,true]){
    let user={uid:'original'};const actions=[];
    const remove=createAccountDeletion({currentUser:()=>user,
      deleteServerAccount:async()=>{actions.push('delete');assert.equal(user.uid,'original');},
      signOutLocal:async()=>{actions.push('js-sign-out');user=null;},
      loadNativeSignOut:native?async()=>{actions.push('native-ready');return async()=>actions.push('native-sign-out');}:undefined});
    await remove();assert.equal(user,null);
    assert.deepEqual(actions,native?['delete','js-sign-out','native-ready','native-sign-out']:['delete','js-sign-out']);
  }
});
test('a new account selected while JS sign-out completes is not signed out by the native plugin',async()=>{
  let user={uid:'original'},finish,started,native=0;
  const reached=new Promise(resolve=>{started=resolve;});
  const remove=createAccountDeletion({currentUser:()=>user,deleteServerAccount:async()=>{},
    signOutLocal:()=>{user=null;started();return new Promise(resolve=>{finish=resolve;});},
    loadNativeSignOut:async()=>async()=>native++});
  const pending=remove();await reached;user={uid:'new-account'};finish();
  await assert.rejects(pending,{message:'account-changed'});
  assert.equal(user.uid,'new-account');assert.equal(native,0);
});
test('a new account selected while the native plugin loads is not signed out',async()=>{
  let user={uid:'original'},finish,started,native=0;
  const reached=new Promise(resolve=>{started=resolve;});
  const remove=createAccountDeletion({currentUser:()=>user,deleteServerAccount:async()=>{},
    signOutLocal:async()=>{user=null;},
    loadNativeSignOut:()=>{started();return new Promise(resolve=>{finish=resolve;});}});
  const pending=remove();await reached;user={uid:'new-account'};finish(async()=>native++);
  await assert.rejects(pending,{message:'account-changed'});
  assert.equal(user.uid,'new-account');assert.equal(native,0);
});
test('missing account and failed server deletion cannot trigger either sign-out',async()=>{
  let user=null;const actions=[];
  const remove=createAccountDeletion({currentUser:()=>user,
    deleteServerAccount:async()=>{actions.push('delete');throw Error('deletion-pending');},
    signOutLocal:async()=>actions.push('js-sign-out'),loadNativeSignOut:async()=>async()=>actions.push('native-sign-out')});
  await assert.rejects(remove(),{message:'account-changed'});assert.deepEqual(actions,[]);
  user={uid:'original'};
  await assert.rejects(remove(),{message:'deletion-pending'});
  assert.deepEqual(actions,['delete']);assert.equal(user.uid,'original');
});
