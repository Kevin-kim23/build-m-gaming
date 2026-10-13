#!/usr/bin/env node
'use strict';
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {installOutput}=require('./privacy.cjs');
const rawWrite=process.stdout.write.bind(process.stdout);
const ttyOutput=new (require('node:stream').Writable)({write(chunk,_encoding,done){rawWrite(chunk);done();}});
ttyOutput.isTTY=process.stdout.isTTY;
const output=installOutput();
const fixed=result=>rawWrite(JSON.stringify({requestsCompleted:result.completed===true,stopped:result.stopped!==false,
  functions:Number.isSafeInteger(result.functions)?result.functions:0,schedules:Number.isSafeInteger(result.schedules)?result.schedules:0,
  possibleUnconfirmedResource:result.possibleUnconfirmedResource===true})+'\n');
const fatal=()=>{fixed({stopped:true,possibleUnconfirmedResource:true});process.exit(1);};
process.on('uncaughtException',fatal);
process.on('unhandledRejection',fatal);
process.on('warning',fatal);
async function main() {
  const [cliDir,privateFile,...extra]=process.argv.slice(2),repo=path.resolve(__dirname,'../..');
  if(process.versions.node.split('.')[0]!=='22'||extra.length||!path.isAbsolute(cliDir||'')||!privateFile||
    Object.keys(process.env).some(k=>['NODE_OPTIONS','FIREBASE_TOKEN','GOOGLE_APPLICATION_CREDENTIALS','HTTP_PROXY','HTTPS_PROXY','ALL_PROXY'].includes(k.toUpperCase())&&process.env[k])||
    Object.keys(process.env).some(k=>/^FIREBASE_/i.test(k)))throw Error('PREFLIGHT');
  // This subprocess has no credential reads, writes or external network capability.
  const audit=JSON.parse(execFileSync(process.execPath,[path.join(__dirname,'capture-deploy-offline.cjs'),cliDir],{encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true,timeout:30000}));
  if(audit.offlineCapture!=='passed'||audit.templateMatches!==true||audit.externalTransmissions!==0)throw Error('CAPTURE');
  const {readPrivateValues,archiveCommittedSource}=require('./deployment-input.cjs');
  const privateValues=readPrivateValues(repo,privateFile);
  const {archive,archiveHash}=await archiveCommittedSource(cliDir,repo);
  const {requestHumanConfirmation,runPrepared}=require('./deployment-runner.cjs');
  const confirmation=await requestHumanConfirmation(process.stdin,ttyOutput);
  // Input validation is repeated before the transport even reads CLI credentials.
  require('./deployment-session.cjs').createSession({privateValues,archiveHash,confirmation});
  const send=require('./deployment-transport.cjs').createDeploymentTransport(cliDir,archive,archiveHash,output);
  const result=await runPrepared({privateValues,archiveHash,confirmation,send});
  fixed(result);process.exitCode=result.completed?0:1;
}
main().catch(()=>{fixed({stopped:true});process.exitCode=1;});
