const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function accountMarkup(state) {
  const ready = state.phase === 'ready';
  return {title: '구글 계정 연결', kicker: '개발용 · 클라우드 저장 준비 중', body: `
    <section class="account-panel" data-account-panel>
      <p class="account-summary">${state.user ? `로그인 계정<br><strong>${escape(state.user.email || '구글 계정')}</strong>` : '현재 기기에 저장하며 플레이 중이에요.'}</p>
      <p>이번 단계는 로그인 테스트입니다. 골드·병력·구매 기록의 서버 저장과 다른 폰에서 이어하기는 아직 지원하지 않아요. 계정을 바꿔도 현재 기기의 게임 기록은 바뀌지 않아요.</p>
      <p data-account-status role="status">${escape(state.message || (state.phase === 'loading' ? '연결 준비 중…' : state.phase === 'busy' ? '처리 중…' : ''))}</p>
      <div class="account-actions">
      ${state.user ? `<button type="button" data-detail-action="account-sign-out" ${ready ? '' : 'disabled'}>로그아웃</button>
        <button type="button" data-detail-action="account-delete-confirm" ${ready ? '' : 'disabled'}>개발용 로그인 계정 삭제</button>`
        : `<button type="button" data-detail-action="account-sign-in" ${ready ? '' : 'disabled'}>Google로 로그인</button>`}
      ${state.phase === 'error' ? '<button type="button" data-detail-action="account-retry">다시 연결</button>' : ''}
      </div>
      <details><summary>로그인 시 처리되는 정보</summary><p>Google·Firebase가 계정 식별자, 이메일, 이름·프로필 사진 주소, 인증 정보와 IP 주소를 계정 생성·로그인·보안 목적으로 처리합니다. 비밀번호는 게임이 받지 않으며 연락처·메일함 접근 권한은 요청하지 않습니다. Firebase Authentication 정보는 미국에서 처리됩니다.</p>
      <p>로그인은 선택 사항이에요. 로그인하지 않아도 기본 게임을 할 수 있어요. 로그인 상태는 이 기기에 유지되며, 로그아웃과 서버 계정 삭제는 서로 달라요. 개인정보처리방침과 별도 삭제 안내를 확인해 주세요.</p></details>
      <button class="detail-link" type="button" data-detail-action="settings-privacy">개인정보처리방침</button>
      <button class="detail-link" type="button" data-detail-action="settings-back">설정으로 돌아가기</button>
    </section>`};
}
export function accountDeleteMarkup() {
  return {title: '개발용 로그인 계정을 삭제할까요?', body: `<p>Firebase 개발 서버의 로그인 계정을 삭제합니다. Google 계정 자체와 이 기기의 골드·병력은 삭제하지 않아요. 삭제 후 다시 로그인하면 새 개발 계정이 만들어집니다.</p>
    <button type="button" data-detail-action="account-delete">개발 계정 삭제</button>
    <button type="button" data-detail-action="account-show">취소</button>`};
}
