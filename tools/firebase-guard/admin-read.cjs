'use strict';
const {PROJECT}=require('./constants.cjs');
const ADMIN_ACCOUNTS=Object.freeze(['moderation-caller','moderation-runtime']);
const accountEmail=name=>name+'@'+PROJECT+'.iam.gserviceaccount.com';
function summarizeAccount(name,body) {
  if(!ADMIN_ACCOUNTS.includes(name)||!body||body.email!==accountEmail(name)||
    body.projectId!==PROJECT||(body.disabled!==undefined&&typeof body.disabled!=='boolean')) {
    throw new Error('GUARD_INVALID_ACCOUNT_RESPONSE');
  }
  // Absence of the proto boolean disabled means false. Never forward the body.
  return {account:name,exists:true,disabled:body.disabled===true};
}
async function readAdminAccounts(lib,output) {
  for(const name of ADMIN_ACCOUNTS) {
    const body=await lib('gcp/iam').getServiceAccount(PROJECT,name);
    output.emit('admin-account-ok',summarizeAccount(name,body));
  }
}
module.exports={ADMIN_ACCOUNTS,accountEmail,summarizeAccount,readAdminAccounts};
