import {openDetail,onDetailAction} from './detail-popup.js';
import {createCloudController} from './cloud-controller.js';
import {serializeSave} from './money.js';
import {parseSave} from './save.js';
import {armyPower} from './units.js';
import {fmt} from './format.js';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function cloudMarkup(state,hasSession=true,localState=null) {
  const busy=state.phase==='busy';
  const remote=state.cloud?.raw?parseSave(state.cloud.raw,Date.now()):null;
  const summary=save=>save?`골드 ${fmt(save.gold)} · 전력 ${fmt(armyPower(save))} · 점령 ${save.campaignCleared}`:'확인 전';
  return {title:'닉네임 · 서버 기록',kicker:'계정에 연결된 게임 기록',body:`<section data-cloud-panel class="account-panel">
    ${state.profile?`<p class="account-summary">닉네임 <strong>${escape(state.profile.nickname)}</strong></p><p>닉네임 변경은 아직 제공하지 않아요. 기존 기록은 검토·승인 후 랭킹에 참여할 수 있어요.</p>`:
      `<label>닉네임 <input id="cloud-nickname" maxlength="24" autocomplete="off" placeholder="글자·숫자·밑줄 2~12자"></label><p>닉네임은 중복 사용할 수 없고 변경 기능은 아직 없어요. 등록하면 계정 식별자·닉네임·생성 시각을 서버에 보관해요.</p><button data-detail-action="cloud-create" ${busy?'disabled':''}>이 닉네임으로 등록</button>`}
    <p>서버 기록: ${state.cloud?`저장 ${state.cloud.revision}회 · ${escape(new Date(state.cloud.savedAt).toLocaleString('ko-KR'))}`:'없음 또는 아직 확인 전'}</p>
    ${hasSession?`<p>이 기기: ${escape(summary(localState))}</p><p>서버: ${escape(summary(remote))}</p>`:''}
    <p>기기 기록과 서버 기록은 자동 합산하지 않아요. 서버 저장·불러오기는 아래 버튼을 누른 뒤 확인해야 실행돼요.</p>
    <p role="status">${escape(state.message|| (busy?'처리 중…':''))}</p>
    <div class="account-actions"><button data-detail-action="cloud-refresh" ${busy?'disabled':''}>서버 기록 다시 확인</button>
    ${hasSession?`<button data-detail-action="cloud-upload-confirm" ${busy||!state.profile?'disabled':''}>기기 기록을 서버에 저장</button><button data-detail-action="cloud-restore-confirm" ${busy||!state.cloud?'disabled':''}>서버 기록을 이 기기에 불러오기</button>`:'<p>이 인증 검증 화면은 게임 저장을 읽지 않아요.</p>'}
    <button data-detail-action="account-show">계정으로 돌아가기</button></div></section>`};
}
export function createCloudUI({account,call,session}) {
  let confirmation=null;
  const controller=createCloudController({call,
    localSave:()=>session?.active&&session.flush(true)?serializeSave(session.state):null,
    restore:raw=>session?.restoreCloud(raw)??false,
    onChange:state=>{if(document.querySelector('#detail-modal[open] [data-cloud-panel]'))openDetail(cloudMarkup(state,!!session,session?.state));},
  });
  account.subscribe(state=>controller.setUser(state.user));
  function show(){openDetail(cloudMarkup(controller.state,!!session,session?.state));}
  onDetailAction((action,data,dialog)=>{
    if(action==='cloud-show'){show();void controller.refresh();}
    if(action==='cloud-refresh'){controller.clearRetry();void controller.refresh();}
    if(action==='cloud-create')void controller.createProfile(dialog.querySelector('#cloud-nickname')?.value??'');
    if(action==='cloud-upload-confirm'||action==='cloud-restore-confirm'){
      confirmation={uid:controller.state.uid,restore:action==='cloud-restore-confirm'};
      openDetail({title:confirmation.restore?'서버 기록으로 바꿀까요?':'이 기기 기록을 서버에 저장할까요?',body:`<p>${confirmation.restore?'이 기기의 현재 진행은 서버 기록으로 바뀝니다. 바꾸기 직전 기록은 이 기기에 복구용으로 보관합니다.':'현재 골드·병력·장비·진행·설정이 로그인한 계정의 서버에 전송됩니다. 이전 서버 기록을 대체하며 최초 연결 기록과 직전 서버 기록은 복구·검토를 위해 보관합니다.'}</p><p>두 기록의 골드·병력은 합산하지 않습니다.</p><button data-detail-action="cloud-confirm">확인</button><button data-detail-action="cloud-cancel">취소</button>`});
    }
    if(action==='cloud-cancel'){confirmation=null;show();}
    if(action==='cloud-confirm'&&confirmation){const selected=confirmation;confirmation=null;show();void (selected.restore?controller.restore(selected.uid):controller.upload(selected.uid));}
  });
  return {show,controller};
}
