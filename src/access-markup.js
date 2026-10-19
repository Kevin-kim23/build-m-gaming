export const AGE_DETAILS = '<p>생년월일·입력한 숫자는 저장하지 않습니다. 연령 구간(14~18세 / 19세 이상), 확인 시점과 동의 버전만 기기에 저장합니다. 본인인증은 아닙니다.</p><p>연령 확인 후 1년이 지나면 다시 확인합니다. 앱 데이터를 지우면 게임 기록도 함께 사라질 수 있습니다.</p>';

export function startConsentMarkup() {
  return `<div class="access-head"><small data-access-step-label>시작 안내 · 1 / 2</small><h2 id="access-title" tabindex="-1">만 나이를 알려주세요</h2><p data-access-subtitle>대한민국 만 14세 이상 이용할 수 있어요.</p></div>
  <div class="access-body">
    <form id="access-age-form" data-age-form data-access-stage="age">
      <label class="access-input-label" for="access-age">현재 만 나이</label><div class="access-age-input"><input id="access-age" name="age" type="number" inputmode="numeric" min="0" max="120" step="1" autocomplete="off" placeholder="나이 입력" required aria-describedby="access-age-note"><span aria-hidden="true">세</span></div>
      <p id="access-age-note" class="access-note">정확한 나이는 저장하지 않아요.<br>연령 구간과 확인 기록만 기기에 보관해요.</p><button type="button" class="access-text-link" data-access-age-details>연령·기기 기록 상세보기</button>
    </form>
    <form id="access-start-form" data-access-form data-access-stage="consent" hidden>
      <div class="access-consent-row"><label class="access-check"><input type="checkbox" name="terms"><span><b class="access-badge">필수</b> 서비스 이용약관 동의</span></label><button type="button" class="access-detail-link" data-access-terms aria-label="서비스 이용약관 상세보기">보기</button></div>
      <div class="access-consent-row"><label class="access-check"><input type="checkbox" name="privacy"><span><b class="access-badge">필수 확인</b> 개인정보·기기 기록 안내 확인</span></label><button type="button" class="access-detail-link" data-access-policy aria-label="개인정보처리방침 상세보기">보기</button></div>
      <p class="access-note access-quiet">기본 플레이는 무료예요. 유료 상품은 Google Play에서 별도로 구매하며, 이 동의로 결제되지 않아요.</p>
    </form>
  </div>
  <div class="access-footer"><p class="access-error" data-access-error role="alert"></p>
    <div class="access-step-actions" data-access-stage="age"><button type="submit" class="access-primary" form="access-age-form">다음</button><button type="button" class="access-text-link" data-access-exit>나가기</button></div>
    <div class="access-choice-actions" data-access-stage="consent" hidden><button type="button" class="access-secondary" data-access-back>이전</button><button class="access-primary" type="submit" form="access-start-form">동의하고 시작</button></div>
  </div>`;
}

export function adConsentMarkup() {
  return `<div class="access-head"><small>선택 사항</small><h2 id="ad-choice-title" tabindex="-1">광고를 이용할까요?</h2><p>광고 없이도 기본 게임을 즐길 수 있어요.</p></div>
  <div class="access-body">
    <p class="access-ad-intro">원할 때 광고를 보고<br><strong>부스터·추가 보상</strong>을 받을 수 있어요.</p>
    <p class="access-summary">Google이 광고 제공·분석·부정행위 방지를 위해 IP 주소, 이용·진단 정보, 기기 식별자와 동의 정보를 처리하며 해외로 전송할 수 있어요.</p>
    <button type="button" class="access-detail-link access-wide-link" data-access-ad-details>처리 정보·보관·철회 상세보기 <span>›</span></button>
    <div class="access-consent-row"><label class="access-check"><input type="checkbox" data-ad-agree><span><b class="access-badge is-optional">선택</b> 광고 정보 처리에 동의</span></label><button type="button" class="access-detail-link" data-access-policy aria-label="개인정보처리방침 상세보기">보기</button></div>
    <p class="access-note access-quiet">설정에서 언제든 철회할 수 있어요.<br>이미 전송된 정보가 삭제되는 것은 아니에요.</p>
  </div>
  <div class="access-footer"><p class="access-error" data-access-error role="alert"></p><div class="access-choice-actions"><button type="button" class="access-secondary" data-ad-disable>광고 없이 이용</button><button type="button" class="access-primary" data-ad-enable disabled>동의하고 이용</button></div><button type="button" class="access-text-link" data-ad-choice-cancel>돌아가기</button></div>`;
}
