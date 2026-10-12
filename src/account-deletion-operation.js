// Isolated from Firebase so account-switch races can be tested without a real
// account, browser persistence, or a network request.
export function createAccountDeletion({currentUser,deleteServerAccount,signOutLocal,loadNativeSignOut}) {
  const changed=()=>Object.assign(new Error('account-changed'),{code:'auth/user-mismatch'});
  return async()=>{
    const uid=currentUser()?.uid;
    if(!uid)throw changed();
    await deleteServerAccount();
    // Server deletion belongs to the UID at request time. A newer JS session
    // must survive the old request's eventual response.
    if(currentUser()?.uid!==uid)throw changed();
    await signOutLocal();
    if(currentUser())throw changed();
    if(!loadNativeSignOut)return;
    const signOutNative=await loadNativeSignOut();
    // Loading the native plugin is another async boundary at which a new user
    // can sign in. The successful local sign-out should still be in effect.
    if(currentUser())throw changed();
    await signOutNative();
  };
}
