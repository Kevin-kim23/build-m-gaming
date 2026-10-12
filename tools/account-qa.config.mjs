import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const page=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>부대 키우기 · 개발 로그인 검증</title>
<style>body{padding:20px;font:16px/1.6 system-ui;background:#151b19;color:#f0eddc}button{padding:14px;margin:8px}</style>
<h1>구글 로그인 검증</h1><p>개발 서버 연결 · 게임 진행 저장을 읽거나 바꾸지 않는 별도 화면입니다.</p>
<button id="open-account">구글 계정 연결 열기</button><p id="qa-status" role="status"></p>
<script type="module">
import '/src/detail.css'; import {createAccountUI} from '/src/account-ui.js';
import {onDetailAction,openDetail,closeDetail} from '/src/detail-popup.js';
import {privacyPolicyMarkup} from '/src/privacy-policy.js';
onDetailAction(action=>{if(action==='settings-privacy')openDetail(privacyPolicyMarkup());if(action==='settings-back')closeDetail();});
const ui=await createAccountUI();document.querySelector('#open-account').onclick=()=>ui.show();
document.querySelector('#qa-status').textContent=ui?'계정 화면 준비 완료':'개발 모드에서 실행하세요.';
</script></html>`;
export default {root,server:{host:'127.0.0.1',port:4214,strictPort:true},plugins:[{name:'account-qa-only',configureServer(server){
  server.middlewares.use((req,res,next)=>{if(req.url!=='/__account')return next();res.setHeader('Content-Type','text/html; charset=utf-8');res.end(page);});
}}]};
