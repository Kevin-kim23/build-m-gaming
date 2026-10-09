import { formatTime } from './error-log.js';
import { FICTION_NOTICE } from './privacy-policy.js';

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const row = (name, value) => `<dt>${name}</dt><dd>${escapeHtml(value)}</dd>`;

// Content of the "게임 정보" popup. Error text comes from the running app, so it is always escaped.
export function infoPanelMarkup({ version, platform, status, saveVersion, entries, report, saveNotice = null }) {
  const guidance = saveNotice ? `<section class="save-guidance"><h3>${escapeHtml(saveNotice.title)}</h3><p>${escapeHtml(saveNotice.message)}</p>${saveNotice.canRetry ? '<button type="button" class="detail-link" data-detail-action="retry-save">저장 다시 확인</button>' : ''}</section>` : '';
  const list = entries.length
    ? `<ol class="error-list">${entries.slice().reverse().map((e) => `<li><time>${formatTime(e.at)}</time> <b>${escapeHtml(e.area)}</b>${(e.count ?? 1) > 1 ? ` ×${e.count}` : ''}<span>${escapeHtml(e.message)}</span></li>`).join('')}</ol>`
    : '<p>기록된 오류가 없어요. 문제가 생기면 여기에 쌓입니다.</p>';
  return {
    kicker: 'INFO',
    title: '게임 정보',
    body: `${guidance}<dl class="detail-stats">${row('버전', `v${version}`)}${row('실행 환경', platform)}${row('저장 상태', status)}${row('저장 형식', saveVersion)}</dl>
      <h3 class="info-title">최근 오류 기록 · ${entries.length}개</h3>${list}
      <div class="info-actions"><button type="button" class="detail-link" data-detail-action="copy-error-log">문의용 정보 복사</button><button type="button" class="detail-link" data-detail-action="clear-error-log"${entries.length ? '' : ' disabled'}>기록 지우기</button></div>
      <p class="info-status" data-copy-status role="status"></p>
      <details class="info-report"><summary>복사할 내용 보기</summary><textarea id="error-report" readonly rows="8">${escapeHtml(report)}</textarea></details>
      <h3 class="info-title">안내</h3>
      <p class="fiction-notice">${escapeHtml(FICTION_NOTICE)}</p>
      <button type="button" class="detail-link" data-detail-action="open-privacy">개인정보처리방침 보기</button>
      <button type="button" class="detail-link" data-detail-action="open-licenses">오픈소스 라이선스</button>
      <p>오류 기록과 문의용 정보에는 게임 저장 내용(골드·병력 등)이 들어 있지 않습니다. 이 기기 밖으로 자동 전송되지 않습니다.</p>`,
  };
}
