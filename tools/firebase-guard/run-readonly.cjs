#!/usr/bin/env node
'use strict';
const path=require('node:path');
const {installOutput}=require('./privacy.cjs');
const {installFileGuard}=require('./file-guard.cjs');
const {createPolicy}=require('./request-policy.cjs');
const {installNetworkGuard}=require('./network-guard.cjs');
const {installCliBridge}=require('./cli-bridge.cjs');
const {checkSource}=require('./source-check.cjs');
const {PROJECT}=require('./constants.cjs');
const output=installOutput();
const diagnostic=process.argv[3]==='inventory:remaining'?require('./diagnostics.cjs').createDiagnostics(output):undefined;
let policy;
process.on('uncaughtException',()=>{policy?.stop();output.emit('command-failed');process.exitCode=1;});
process.on('unhandledRejection',()=>{policy?.stop();output.emit('command-failed');process.exitCode=1;});
process.on('warning',()=>{policy?.stop();output.emit('warning-stopped');process.exitCode=1;});
async function main() {
  const [cliDir,command,...extra]=process.argv.slice(2);
  if(process.versions.node.split('.')[0]!=='22'){output.emit('node-mismatch');process.exitCode=1;return;}
  if(!cliDir||extra.length||!['projects:list','functions:list','admin-accounts:get','inventory:remaining','build-account:get'].includes(command)){output.emit('configuration-invalid');process.exitCode=1;return;}
  // Only absolute external CLI package directories; no user tokens/keys/ADC/proxies.
  if(!path.isAbsolute(cliDir)||cliDir.startsWith(path.resolve(__dirname,'../..')+path.sep)||
    ['FIREBASE_TOKEN','GOOGLE_APPLICATION_CREDENTIALS','HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy','NODE_OPTIONS'].some(k=>process.env[k])) {
    output.emit('configuration-invalid');process.exitCode=1;return;
  }
  try{checkSource(cliDir);}catch{output.emit('source-mismatch');process.exitCode=1;return;}
  policy=createPolicy({mode:command==='build-account:get'?'build-account':command==='projects:list'?'projects':'inventory',diagnostic});
  installFileGuard(()=>{policy.stop();output.emit('file-write-blocked');});
  const network=installNetworkGuard({policy,onBlocked:()=>output.emit('request-blocked'),diagnostic});
  const {lib}=installCliBridge(cliDir,policy,network,output,diagnostic);
  const auth=lib('auth');
  // Do not let requireAuth fall through to ADC, metadata servers or key files.
  const account=auth.getGlobalDefaultAccount();
  if(!account?.user||!account.tokens||(!account.tokens.access_token&&!account.tokens.refresh_token)) {
    output.emit('not-logged-in');process.exitCode=2;return;
  }
  output.emit('guard-ready');
  if(command==='projects:list') {
    // Official CLI command.runner: prepare + requireAuth + pagination + action.
    const commandModule=lib('commands/projects-list').command;
    const projects=await commandModule.runner()({nonInteractive:true,json:true,project:undefined});
    if(policy.isStopped()||!Array.isArray(projects))throw new Error('GUARD_INVALID_RESULT');
    output.emit('projects-list-ok',{count:projects.length,devVisible:projects.some(p=>p.projectId===PROJECT)});
  } else {
    auth.setActiveAccount({},account);
    if(command==='build-account:get') {
      await require('./build-account-read.cjs').readBuildAccount(lib,output);
      if(policy.isStopped())throw new Error('GUARD_STOPPED');
      return;
    }
    if(command==='inventory:remaining') {
      const {readInventory,cliInventoryGet}=require('./inventory-read.cjs');
      await readInventory(cliInventoryGet(lib),output,require('../../firestore.indexes.json'),diagnostic);
      if(policy.isStopped())throw new Error('GUARD_STOPPED');
      return;
    }
    if(command==='admin-accounts:get') {
      await require('./admin-read.cjs').readAdminAccounts(lib,output);
      if(policy.isStopped())throw new Error('GUARD_STOPPED');
      return;
    }
    const first=await lib('gcp/cloudfunctions').listAllFunctions(PROJECT);
    const second=await lib('gcp/cloudfunctionsv2').listAllFunctions(PROJECT);
    if(policy.isStopped()||first.unreachable?.length||second.unreachable?.length||
      !Array.isArray(first.functions)||!Array.isArray(second.functions))throw new Error('GUARD_INCOMPLETE_INVENTORY');
    output.emit('inventory-ok',{count:first.functions.length+second.functions.length});
  }
}
main().catch(()=>{policy?.stop();output.emit('command-failed');process.exitCode=1;});
