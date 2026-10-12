const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function accountMarkup(state, development = false, hasSession = false) {
  const ready = state.phase === 'ready';
  return {title: '구글 계정 연결', kicker: development ? '개발용 · 서버 연결 검증' : '구글 계정 · 서버 기록', body: `
    <section class="account-panel" data-account-panel>
      <p class="account-summary">${state.user ? `로그인 계정<br><strong>${escape(state.user.email || '구글 계정')}</strong>` : '현재 기기에 저장하며 플레이 중이에요.'}</p>
      <p>로그인만으로 게임 기록이 서버에 저장되지는 않아요. 닉네임·서버 기록 화면에서 직접 저장하거나 불러오기를 선택해야 해요. 계정을 바꿔도 현재 기기의 게임 기록은 자동으로 바뀌지 않아요.</p>
      <p>${development ? "개발 서버 기능을 검증 중입니다. " : ""}서버에 연결되지 않으면 기기 기록을 유지합니다. 랭킹과 실제 구매 복원은 아직 제공하지 않아요.</p>
      <p data-account-status role="status">${escape(state.message || (state.phase === 'loading' ? '연결 준비 중…' : state.phase === 'busy' ? '처리 중…' : ''))}</p>
      <div class="account-actions">
      ${state.user ? `<button type="button" data-detail-action="cloud-show" ${ready ? '' : 'disabled'}>닉네임 · 서버 기록</button>
        <button type="button" data-detail-action="nickname-report-show" ${ready ? '' : 'disabled'}>닉네임 신고</button>
        <button type="button" data-detail-action="account-sign-out" ${ready ? '' : 'disabled'}>로그아웃</button>
        <button type="button" data-detail-action="account-delete-confirm" ${ready ? '' : 'disabled'}>서버 계정·기록 삭제</button>`
        : `<button type="button" data-detail-action="account-sign-in" ${ready ? '' : 'disabled'}>Google로 로그인</button>`}
      ${state.phase === 'error' ? '<button type="button" data-detail-action="account-retry">다시 연결</button>' : ''}
      ${hasSession ? '<button type="button" data-detail-action="local-backups-show">이 기기의 복원 전 백업</button>' : ''}
      </div>
      <details><summary>로그인 시 처리되는 정보</summary><p>Google·Firebase가 계정 식별자, 이메일, 이름·프로필 사진 주소, 인증 정보와 IP 주소를 계정 생성·로그인·보안 목적으로 처리합니다. 비밀번호는 게임이 받지 않으며 연락처·메일함 접근 권한은 요청하지 않습니다. Firebase Authentication 정보는 미국에서 처리됩니다.</p>
      <p>로그인은 선택 사항이에요. 로그인하지 않아도 기본 게임을 할 수 있어요. 로그인 상태는 이 기기에 유지되며, 로그아웃과 서버 계정 삭제는 서로 달라요. 개인정보처리방침과 별도 삭제 안내를 확인해 주세요.</p></details>
      <button class="detail-link" type="button" data-detail-action="settings-privacy">개인정보처리방침</button>
      <button class="detail-link" type="button" data-detail-action="settings-back">설정으로 돌아가기</button>
    </section>`};
}
export function accountDeleteMarkup(development = false) {
  return {title: development ? '개발 서버 계정과 기록을 삭제할까요?' : '서버 계정과 기록을 삭제할까요?', body: `<p>서버의 로그인 계정·닉네임·게임 저장·최초 연결 기록·직전 백업·랭킹 검토 정보와 이 계정이 신고자 또는 대상인 닉네임 신고를 삭제합니다. Google 계정 자체와 이 기기의 골드·병력·복원 전 백업은 삭제하지 않아요. 삭제 후 다시 로그인하면 새 게임 계정이 만들어집니다.</p><p>삭제 중 오류가 발생하면 서버 기록은 이미 삭제되었을 수 있습니다. 미완료 삭제 요청을 남겨 기록이 다시 생성되지 않게 차단하고 실패한 처리를 재시도합니다. 완료 후에는 삭제 처리 확인에 필요한 최소 기록을 90일 보관한 뒤 정리합니다. 이 기간은 기기의 복원 전 백업 보관과 별개예요. 삭제된 서버 기록은 복구할 수 없어요.</p>
    <button type="button" data-detail-action="account-delete">서버 계정 삭제</button>
    <button type="button" data-detail-action="account-show">취소</button>`};
}
