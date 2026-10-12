import {openDetail,onDetailAction} from './detail-popup.js';
import {reportError} from './diagnostics.js';
import {cloudErrorMessage} from './cloud-controller.js';

const REASONS=Object.freeze({impersonation:'운영자 사칭',abuse:'심한 욕설',hate:'혐오 표현',sexual:'성적 표현','personal-info':'개인정보 노출'});
const ERROR_MESSAGES=Object.freeze({
  'invalid-nickname':'신고할 닉네임을 정확히 입력해 주세요.',
  'invalid-report-reason':'신고 사유를 선택해 주세요.',
  'report-target-unavailable':'해당 닉네임을 찾을 수 없거나 신고할 수 없는 상태예요.',
  'self-report':'자신의 닉네임은 신고할 수 없어요.',
  'profile-required':'내 닉네임을 먼저 등록한 뒤 신고해 주세요.',
});
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function nicknameReportMarkup(state) {
  const disabled=!state.uid||state.busy;
  return {title:'닉네임 신고',kicker:'운영자 검토 요청',body:`<section data-nickname-report-panel class="account-panel">
    <p>문제가 있는 닉네임과 사유를 보내 주세요. 신고만으로 상대 계정을 자동 제재하지 않아요.</p>
    <label>신고할 닉네임 <input id="report-nickname" maxlength="24" autocomplete="off" value="${escape(state.nickname)}" ${disabled?'disabled':''}></label>
    <label>신고 사유 <select id="report-reason" ${disabled?'disabled':''}><option value="">선택해 주세요</option>${Object.entries(REASONS).map(([value,label])=>`<option value="${value}" ${state.reason===value?'selected':''}>${label}</option>`).join('')}</select></label>
    <p>신고자·대상 계정 식별자, 대상 닉네임, 사유, 접수 시각과 처리 상태를 운영 검토용으로 서버에 보관해요. 신고 내용과 신고자 정보는 다른 이용자에게 공개하지 않아요.</p>
    <p>같은 대상·사유의 신고는 한 건으로 접수돼요. 연락처나 추가 개인정보는 입력하지 마세요.</p>
    <p role="status">${escape(state.message||(!state.uid?'로그인한 뒤 신고할 수 있어요.':state.busy?'신고를 보내는 중…':''))}</p>
    <div class="account-actions"><button data-detail-action="nickname-report-submit" ${disabled?'disabled':''}>운영자에게 신고 보내기</button><button data-detail-action="account-show">계정으로 돌아가기</button></div></section>`};
}

export function createNicknameReportController({call,onChange=()=>{},onError=()=>{}}) {
  let generation=0;
  let state={uid:null,busy:false,nickname:'',reason:'',message:''};
  const publish=patch=>{state={...state,...patch};onChange(state);};
  return {
    get state(){return state;},
    setUser(user){
      if(state.uid===(user?.uid??null))return;
      generation++;
      publish({uid:user?.uid??null,busy:false,nickname:'',reason:'',message:''});
    },
    async submit(nickname,reason) {
      if(!state.uid||state.busy)return false;
      if(typeof nickname!=='string'||!nickname.trim()||!Object.hasOwn(REASONS,reason)){
        publish({nickname:typeof nickname==='string'?nickname:'',reason:Object.hasOwn(REASONS,reason)?reason:'',message:'닉네임과 신고 사유를 확인해 주세요.'});return false;
      }
      const ticket=generation;
      publish({busy:true,nickname,reason,message:''});
      try {
        await call('reportNickname',{nickname,reason});
        if(ticket!==generation)return false;
        publish({busy:false,message:'신고를 접수했어요. 운영자가 확인한 뒤 처리해요.'});return true;
      }catch(error){
        if(ticket!==generation)return false;
        const message=Object.hasOwn(ERROR_MESSAGES,error?.message)?ERROR_MESSAGES[error.message]:cloudErrorMessage(error,null);
        if(!message)onError('account.nickname-report',new Error('request-failed'));
        publish({busy:false,message:message??'신고를 보내지 못했어요. 잠시 뒤 다시 시도해 주세요.'});return false;
      }
    },
  };
}

export function createNicknameReportUI({account,call}) {
  const controller=createNicknameReportController({call,onError:reportError,onChange:state=>{
    if(document.querySelector('#detail-modal[open] [data-nickname-report-panel]'))openDetail(nicknameReportMarkup(state));
  }});
  account.subscribe(state=>controller.setUser(state.user));
  function show(){openDetail(nicknameReportMarkup(controller.state));}
  onDetailAction((action,data,dialog)=>{
    if(action==='nickname-report-show')show();
    if(action==='nickname-report-submit')void controller.submit(dialog.querySelector('#report-nickname')?.value??'',dialog.querySelector('#report-reason')?.value??'');
  });
  return {show,controller};
}
