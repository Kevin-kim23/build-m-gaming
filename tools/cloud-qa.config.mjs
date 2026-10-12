import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const page=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>서버 기록 화면 검증 · 메모리 전용</title>
<style>body{padding:20px;font:16px/1.6 system-ui;background:#151b19;color:#f0eddc}button{padding:12px;margin:6px}</style>
<h1>서버 기록 화면 검증</h1><p>합성 기록·메모리 저장만 사용합니다. 실제 계정·기기 기록·Firebase에 접근하지 않습니다.</p><button id="open">계정 화면</button>
<script type="module">
import '/src/detail.css';import '/src/account.css';
import {openDetail,onDetailAction} from '/src/detail-popup.js';
import {accountMarkup} from '/src/account-view.js';import {createCloudUI} from '/src/cloud-ui.js';
import {createGameSession} from '/src/session.js';import {createProfileService} from '/server/profile-service.js';import {createCloudService} from '/server/cloud-service.js';
import {freshState,SAVE_KEY} from '/src/state.js';import {parseSave} from '/src/save.js';import {serializeSave} from '/src/money.js';import {armyPower} from '/src/units.js';
const records=new Map(),local=new Map([[SAVE_KEY,serializeSave({...freshState(Date.now()),gold:10n**27n,soldiers:10})]]);
const tx=async operation=>operation({get:async p=>records.get(p),set:(p,v)=>records.set(p,v),delete:p=>records.delete(p)});
const profiles=createProfileService({transact:tx}),cloud=createCloudService({transact:tx,validate:raw=>{const state=parseSave(raw);return {raw:serializeSave(state),power:String(armyPower(state))};}});
const session=createGameSession({storage:{getItem:k=>local.get(k)??null,setItem:(k,v)=>local.set(k,v)},setTimer:()=>1,clearTimer:()=>{}});session.start();
const state={phase:'ready',user:{uid:'synthetic-local-only',email:'qa@example.invalid'},message:''};
const account={subscribe:fn=>{fn(state);return ()=>{};}};
createCloudUI({account,session,call:async(name,data)=>{
 if(name==='readProfile')return profiles.read(state.user.uid);if(name==='createProfile')return profiles.create(state.user.uid,data.nickname);
 if(name==='readCloudSave')return cloud.read(state.user.uid);if(name==='saveCloudProgress')return cloud.save(state.user.uid,data);throw Error('unsupported-qa-action');
}});
const show=()=>openDetail(accountMarkup(state));document.querySelector('#open').onclick=show;
onDetailAction(action=>{if(action==='account-show')show();});show();
</script></html>`;
export default {root,server:{host:'127.0.0.1',port:4215,strictPort:true},plugins:[{name:'cloud-memory-qa',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url!=='/__cloud')return next();res.setHeader('Content-Type','text/html; charset=utf-8');res.end(page);});}}]};
