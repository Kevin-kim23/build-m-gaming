'use strict';
const {createSession,CONFIRMATION}=require('./deployment-session.cjs');
// The runner owns sequencing; a transport never selects a request or retries it.
// It is deliberately separate from firebase deploy (which can mutate APIs/IAM,
// retry creates and delete failed functions). No implicit CLI deploy fallback.
async function runPrepared({template,privateValues,archiveHash,confirmation,send,diagnostic,resume=false,wait=ms=>new Promise(r=>setTimeout(r,ms))}) {
  let session;
  try {session=createSession({template,privateValues,archiveHash,confirmation,diagnostic,resume});}
  catch {return {completed:false,stopped:true,phase:'preflight',functions:0,schedules:0,possibleUnconfirmedResource:false};}
  try {
    let next;
    while((next=session.next())!==null) {
      if(session.waitMs())await wait(session.waitMs());
      diagnostic?.reset();
      await session.dispatch(next,send);
    }
  } catch {session.stop();}
  return {...session.summary(),phase:'execution'};
}
async function requestHumanConfirmation(input,output,expected=CONFIRMATION) {
  if(![CONFIRMATION,require('./resume-plan.cjs').RESUME_CONFIRMATION].includes(expected))throw Error('HUMAN_CONFIRMATION_REQUIRED');
  if(!input.isTTY||!output.isTTY)throw Error('HUMAN_CONFIRMATION_REQUIRED');
  const readline=require('node:readline/promises').createInterface({input,output,historySize:0});
  try {
    const answer=await readline.question('별도 최종 배포 승인을 받은 경우에만 입력: '+expected+'\n');
    if(answer!==expected)throw Error('HUMAN_CONFIRMATION_REQUIRED');
    return answer;
  } finally {readline.close();}
}
module.exports={runPrepared,requestHumanConfirmation};
