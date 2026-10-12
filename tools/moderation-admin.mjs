import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
const require=createRequire(new URL('../server/package.json',import.meta.url));
const {GoogleAuth}=require('google-auth-library');
const SERVER_ERRORS=['admin-access-denied','invalid-admin-request','invalid-moderation-request','moderation-report-unavailable',
  'moderation-action-unavailable','moderation-record-invalid','moderation-report-changed','moderation-target-unavailable',
  'moderation-target-changed','moderation-action-conflict','moderation-action-reverted','moderation-nickname-conflict',
  'account-deleting','moderation-cleanup-pending','moderation-failed'];
const args=process.argv.slice(2),operation=args[0];
if(!operation||operation==='--help') {
  console.log('비공개 닉네임 관리 도구 — 배포나 로그인을 대신 실행하지 않습니다.');
  console.log('승인 후 MODERATION_ADMIN_URL에 해당 프로젝트의 비공개 함수 주소를 설정하세요.');
  console.log('본인에게 승인된 서비스계정 임시 인증(ADC)을 사용하며 비밀키 파일은 다운로드하지 마세요.');
  console.log('list [--cursor ID] | inspect --report ID');
  console.log('resolve --report ID --version N --decision warn|default-rename|dismiss [--action UUID] --confirm');
  console.log('revert --report ID --version N --original UUID [--action UUID] --confirm');
  console.log('--confirm이 없으면 변경은 미리보기만 합니다. 결과가 불명확하면 같은 --action 값으로 재시도하세요.');
} else {
  let code=0;
  try {
    if(!['list','inspect','resolve','revert'].includes(operation))throw Error('invalid-command');
    const read=name=>{const index=args.indexOf(name);return index<0?undefined:args[index+1];};
    const allowed={list:['--cursor'],inspect:['--report'],
      resolve:['--report','--version','--decision','--action','--confirm'],
      revert:['--report','--version','--original','--action','--confirm']}[operation];
    const seen=new Set();
    for(let index=1;index<args.length;index++){
      const flag=args[index];
      if(!allowed.includes(flag)||seen.has(flag))throw Error('invalid-command');
      seen.add(flag);
      if(flag!=='--confirm'&&(!args[++index]||args[index].startsWith('--')))throw Error('invalid-command');
    }
    const reportId=read('--report'),version=read('--version'),decision=read('--decision');
    const actionId=read('--action')??randomUUID(),originalActionId=read('--original'),cursor=read('--cursor');
    if(reportId&&!/^[a-f0-9]{64}$/.test(reportId))throw Error('invalid-report-id');
    if(version!==undefined&&!/^\d{1,9}$/.test(version))throw Error('invalid-version');
    if(decision&&!['warn','default-rename','dismiss'].includes(decision))throw Error('invalid-decision');
    if(!/^[a-f0-9-]{36}$/.test(actionId)||(originalActionId&&!/^[a-f0-9-]{36}$/.test(originalActionId)))throw Error('invalid-action-id');
    if(cursor&&!/^[a-f0-9]{64}$/.test(cursor))throw Error('invalid-cursor');
    if(operation!=='list'&&!reportId)throw Error('report-required');
    if(['resolve','revert'].includes(operation)&&version===undefined)throw Error('version-required');
    if(operation==='resolve'&&!decision||operation==='revert'&&!originalActionId)throw Error('invalid-command');
    const body={operation,...(reportId?{reportId}:{}),...(cursor?{cursor}:{}),
      ...(version!==undefined?{expectedVersion:Number(version)}:{}),
      ...(['resolve','revert'].includes(operation)?{actionId}:{}),
      ...(decision?{decision}:{}),...(originalActionId?{originalActionId}:{})};
    const write=['resolve','revert'].includes(operation);
    if(write&&!args.includes('--confirm')){
      console.log('PREVIEW ONLY; no credentials loaded and no request sent.');
      console.log(JSON.stringify(body,null,2));
    } else {
      const url=process.env.MODERATION_ADMIN_URL;
      if(!url||!/^https:\/\/asia-northeast3-budae-kiugi-(dev|prod)\.cloudfunctions\.net\/moderateNicknames$/.test(url))
        throw Error('approved-private-url-required');
      // Authorization remains available for in-container signature verification;
      // Cloud Run checks X-Serverless-Authorization independently through IAM.
      const client=await new GoogleAuth().getIdTokenClient(url);
      const headers=await client.getRequestHeaders(url);
      headers.set('X-Serverless-Authorization',headers.get('Authorization'));
      headers.set('Content-Type','application/json');
      if(write)console.log('Action ID for a same-request retry: '+actionId);
      const response=await fetch(url,{method:'POST',headers,body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(65_000)});
      const result=await response.json();
      if(!response.ok){
        if(result.error==='moderation-cleanup-pending')console.error('조치는 이미 반영됐습니다. 정리가 남았으니 같은 actionId로 재시도하세요.');
        throw Error(SERVER_ERRORS.includes(result.error)?result.error:'private-request-failed');
      }
      console.log(JSON.stringify(result.result,null,2));
    }
  } catch(error) {
    // SDK/fetch exceptions can embed tokens and headers. Emit a fixed category.
    const safe=[...SERVER_ERRORS,'invalid-command','invalid-report-id','invalid-version','invalid-decision','invalid-action-id','invalid-cursor',
      'report-required','version-required','approved-private-url-required','moderation-conflict','report-not-found',
      'report-already-handled','moderation-cleanup-pending','admin-access-denied','private-request-failed'];
    console.error(safe.includes(error?.message)?error.message:'Authentication or connection failed; no credential details displayed.');
    code=1;
  }
  process.exitCode=code;
}
