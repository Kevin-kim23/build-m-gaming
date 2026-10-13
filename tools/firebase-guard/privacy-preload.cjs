'use strict';
// Synthetic child verification entry. No real CLI/login/deploy is launched here.
const {installOutput}=require('./privacy.cjs');
const {installFileGuard}=require('./file-guard.cjs');
const output=installOutput();
installFileGuard(()=>output.emit('file-write-blocked'));
process.on('uncaughtException',()=>{output.emit('command-failed');process.exitCode=1;});
process.on('unhandledRejection',()=>{output.emit('command-failed');process.exitCode=1;});
