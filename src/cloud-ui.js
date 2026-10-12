import {openDetail,onDetailAction} from './detail-popup.js';
import {createCloudController} from './cloud-controller.js';
import {serializeSave} from './money.js';
import {parseSave} from './save.js';
import {armyPower} from './units.js';
import {fmt} from './format.js';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const summary=save=>save?`골드 ${fmt(save.gold)} · 전력 ${fmt(armyPower(save))} · 점령 ${save.campaignCleared}`:'읽을 수 없는 기록';
export function cloudMarkup(state,hasSession=true,localState=null) {
  const busy=state.phase==='busy';
  const remote=state.cloud?.raw?parseSave(state.cloud.raw,Date.now()):null;
  return {title:'닉네임 · 서버 기록',kicker:'계정에 연결된 게임 기록',body:`<section data-cloud-panel class="account-panel">
    ${state.profile?`<p class="account-summary">닉네임 <strong>${escape(state.profile.nickname)}</strong></p><p>닉네임 변경은 아직 제공하지 않아요. 기존 기록은 검토·승인 후 랭킹에 참여할 수 있어요.</p>`:
      `<label>닉네임 <input id="cloud-nickname" maxlength="24" autocomplete="off" placeholder="글자·숫자·밑줄 2~12자"></label><p>닉네임은 중복 사용할 수 없고 변경 기능은 아직 없어요. 등록하면 계정 식별자·닉네임·생성 시각을 서버에 보관해요.</p><button data-detail-action="cloud-create" ${busy?'disabled':''}>이 닉네임으로 등록</button>`}
    <p>서버 기록: ${state.cloud?`저장 ${state.cloud.revision}회 · ${escape(new Date(state.cloud.savedAt).toLocaleString('ko-KR'))}`:'없음 또는 아직 확인 전'}</p>
    ${hasSession?`<p>이 기기: ${escape(localState?summary(localState):'확인 전')}</p><p>서버: ${escape(remote?summary(remote):'확인 전')}</p>`:''}
    <p>기기 기록과 서버 기록은 자동 합산하지 않아요. 서버 저장·불러오기는 아래 버튼을 누른 뒤 확인해야 실행돼요.</p>
    <p role="status">${escape(state.message|| (busy?'처리 중…':''))}</p>
    <div class="account-actions"><button data-detail-action="cloud-refresh" ${busy?'disabled':''}>서버 기록 다시 확인</button>
    ${hasSession?`<button data-detail-action="cloud-upload-confirm" ${busy||!state.profile?'disabled':''}>기기 기록을 서버에 저장</button><button data-detail-action="cloud-restore-confirm" ${busy||!state.cloud?'disabled':''}>서버 기록을 이 기기에 불러오기</button><button data-detail-action="local-backups-show" ${busy?'disabled':''}>이 기기의 복원 전 백업</button>`:'<p>이 인증 검증 화면은 게임 저장을 읽지 않아요.</p>'}
    <button data-detail-action="account-show">계정으로 돌아가기</button></div></section>`};
}
export function restoreBackupsMarkup(entries,{active=true,message=''}={}) {
  const content=entries===null?'<p>백업 목록을 읽지 못했어요. 기존 백업은 그대로 보관합니다. 저장 공간을 확인해 주세요.</p>'
    :entries.length?[...entries].reverse().map(entry=>{
      const saved=parseSave(entry.raw,Date.now());
      return `<li><p>${entry.createdAt===null?'이전 앱의 복원 전 백업':escape(new Date(entry.createdAt).toLocaleString('ko-KR'))} · ${entry.reason==='local-backup'?'되돌리기 전':'서버 불러오기 전'}</p><p>${escape(summary(saved))}</p><button data-detail-action="local-backup-confirm" data-backup-id="${escape(entry.id)}" ${!active||!saved?'disabled':''}>이 기록으로 되돌리기</button></li>`;
    }).join(''):'<p>아직 복원 전 백업이 없어요.</p>';
  return {title:'이 기기의 복원 전 백업',body:`<section data-local-backups-panel><p>불러오기 전 기록을 각각 보관합니다. 새 백업이 생겨도 이전 백업을 자동으로 지우지 않아요. 저장 공간이 부족하면 불러오기를 중단해요. 앱 데이터 삭제·앱 제거 시에는 백업도 사라질 수 있어요.</p><p>되돌리기는 이 기기에만 적용되고 서버 기록을 바꾸거나 두 기록을 합산하지 않아요.</p>${!active?'<p>다른 게임 창을 닫거나 저장 오류를 해결한 뒤 되돌릴 수 있어요.</p>':''}<p role="status">${escape(message)}</p>${entries?.length?`<ul>${content}</ul>`:content}<button data-detail-action="local-backups-show">백업 목록 다시 확인</button><button data-detail-action="account-show">계정으로 돌아가기</button></section>`};
}
export function createCloudUI({account,call,session}) {
  let confirmation=null;
  let backupConfirmation=null;
  const controller=createCloudController({call,
    localSave:()=>session?.active&&session.flush(true)?serializeSave(session.state):null,
    restore:raw=>session?.restoreCloud(raw)??false,
    onChange:state=>{if(document.querySelector('#detail-modal[open] [data-cloud-panel]'))openDetail(cloudMarkup(state,!!session,session?.state));},
  });
  account.subscribe(state=>controller.setUser(state.user));
  function show(){openDetail(cloudMarkup(controller.state,!!session,session?.state));}
  function showBackups(message='') {
    openDetail(restoreBackupsMarkup(session?.listRestoreBackups()??null,{active:!!session?.active&&controller.state.phase!=='busy',message}));
  }
  onDetailAction((action,data,dialog)=>{
    if(action==='local-backups-show'){backupConfirmation=null;showBackups();}
    if(action==='local-backup-cancel'){backupConfirmation=null;showBackups();}
    if(action==='local-backup-confirm'&&session?.active&&controller.state.phase!=='busy'){
      const selected=session.listRestoreBackups()?.find(entry=>entry.id===data.backupId);
      if(!selected)return showBackups('선택한 백업을 찾지 못했어요.');
      backupConfirmation=selected.id;
      openDetail({title:'선택한 기록으로 되돌릴까요?',body:`<p>${escape(summary(parseSave(selected.raw,Date.now())))}</p><p>이 기기의 현재 진행이 선택한 백업 기록으로 바뀝니다. 되돌리기 직전 기록도 별도 백업으로 보관합니다. 서버에는 전송하지 않습니다.</p><button data-detail-action="local-backup-restore">이 기록으로 되돌리기</button><button data-detail-action="local-backup-cancel">취소</button>`});
    }
    if(action==='local-backup-restore'&&backupConfirmation){
      const selected=backupConfirmation;backupConfirmation=null;
      const restored=controller.state.phase!=='busy'&&session?.restoreLocalBackup(selected);
      showBackups(restored?'선택한 백업으로 되돌렸어요. 되돌리기 직전 기록도 보관했어요.':'되돌리지 못했어요. 현재 기록과 기존 백업은 유지됩니다. 저장 공간과 기록 상태를 확인해 주세요.');
    }
    if(action==='cloud-show'){show();void controller.refresh();}
    if(action==='cloud-refresh'){controller.clearRetry();void controller.refresh();}
    if(action==='cloud-create')void controller.createProfile(dialog.querySelector('#cloud-nickname')?.value??'');
    if(action==='cloud-upload-confirm'||action==='cloud-restore-confirm'){
      confirmation={uid:controller.state.uid,restore:action==='cloud-restore-confirm'};
      openDetail({title:confirmation.restore?'서버 기록으로 바꿀까요?':'이 기기 기록을 서버에 저장할까요?',body:`<p>${confirmation.restore?'이 기기의 현재 진행은 서버 기록으로 바뀝니다. 바꾸기 직전 기록은 이 기기에 각각 보관하며, ‘이 기기의 복원 전 백업’에서 되돌릴 수 있습니다. 백업할 공간이 부족하면 불러오기를 중단합니다.':'현재 골드·병력·장비·진행·설정이 로그인한 계정의 서버에 전송됩니다. 이전 서버 기록을 대체하며 최초 연결 기록과 직전 서버 기록은 복구·검토를 위해 보관합니다.'}</p><p>두 기록의 골드·병력은 합산하지 않습니다.</p><button data-detail-action="cloud-confirm">확인</button><button data-detail-action="cloud-cancel">취소</button>`});
    }
    if(action==='cloud-cancel'){confirmation=null;show();}
    if(action==='cloud-confirm'&&confirmation){const selected=confirmation;confirmation=null;show();void (selected.restore?controller.restore(selected.uid):controller.upload(selected.uid));}
  });
  return {show,showBackups,controller};
}
