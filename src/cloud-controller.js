export function cloudErrorMessage(error) {
  return ({'nickname-taken':'이미 사용 중인 닉네임이에요. 다른 이름을 입력해 주세요.',
    'invalid-nickname':'닉네임은 글자·숫자·밑줄로 2~12자까지 입력해 주세요.',
    'reserved-nickname':'운영자를 사칭할 수 있는 이름은 사용할 수 없어요.',
    'nickname-change-unavailable':'닉네임 변경은 아직 제공하지 않아요.',
    'save-conflict':'다른 기기에서 서버 기록이 바뀌었어요. 다시 불러와 비교해 주세요.',
    'invalid-save':'현재 기록을 서버에 저장할 수 없어요. 기존 기록은 유지돼요.',
    'profile-required':'닉네임을 먼저 등록해 주세요.',
    'account-deleting':'계정 삭제가 진행 중이에요.',
    'recent-login-required':'계정 삭제 전에 로그아웃 후 다시 로그인해 주세요.'})[error?.message]
      ?? '서버에 연결하지 못했어요. 인터넷 연결과 서버 준비 상태를 확인하고 다시 시도해 주세요. 기기 기록은 유지돼요.';
}
// The server derives UID from its verified auth token. No caller-selected UID is sent.
export function createCloudController({call, localSave, restore, requestId=()=>crypto.randomUUID(),onChange=()=>{}}) {
  let generation=0, pendingWrite=null;
  let state={uid:null,phase:'signed-out',profile:null,cloud:null,message:''};
  const publish=patch=>{state={...state,...patch};onChange(state);};
  async function run(operation) {
    if(!state.uid||state.phase==='busy')return false;
    const ticket=generation;
    publish({phase:'busy',message:''});
    try {
      const patch=await operation(()=>ticket===generation);
      if(ticket!==generation)return false;
      publish({phase:'ready',...patch});return true;
    } catch(error) {
      if(ticket!==generation)return false;
      publish({phase:'ready',message:cloudErrorMessage(error)});return false;
    }
  }
  return {
    get state(){return state;},
    setUser(user){
      if(state.uid===(user?.uid??null))return;
      generation++;pendingWrite=null;
      publish({uid:user?.uid??null,phase:user?'ready':'signed-out',profile:null,cloud:null,message:''});
    },
    refresh:()=>run(async current=>{
      const profile=await call('readProfile');
      if(!current())return {};
      return {profile,cloud:await call('readCloudSave')};
    }),
    createProfile:nickname=>run(async()=>({profile:await call('createProfile',{nickname}),message:'닉네임을 등록했어요. 변경 기능은 아직 제공하지 않아요.'})),
    upload:confirmedUid=>run(async current=>{
      if(confirmedUid!==state.uid)throw Error('account-changed');
      const raw=localSave();
      if(!raw)throw Error('invalid-save');
      // Keep the exact retry operation after an uncertain network result.
      if(!pendingWrite)pendingWrite={raw,expectedRevision:state.cloud?.revision??0,requestId:requestId()};
      const cloud=await call('saveCloudProgress',pendingWrite);
      if(current())pendingWrite=null;
      return {cloud,message:'서버에 저장했어요. 저장 후 더 진행한 기록은 다음 저장 때 반영돼요.'};
    }),
    restore:confirmedUid=>run(async current=>{
      if(confirmedUid!==state.uid||!state.cloud)throw Error('invalid-save');
      const latest=await call('readCloudSave');
      if(!current())return {};
      if(!latest||latest.revision!==state.cloud.revision)throw Error('save-conflict');
      if(!restore(latest.raw))throw Error('invalid-save');
      pendingWrite=null;
      return {cloud:latest,message:'서버 기록을 불러왔어요. 이전 기기 기록은 복구용으로 보관했어요.'};
    }),
    clearRetry(){pendingWrite=null;},
  };
}
