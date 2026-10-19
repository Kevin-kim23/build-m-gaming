import { licenseListMarkup, licenseDetailMarkup } from './license-panel.js';
import { Capacitor } from '@capacitor/core';
import { APP_VERSION } from './version.js';
import { errorLog, formatReport } from './error-log.js';
import './preferences-ui.css';
import { infoPanelMarkup, diagnosticsPanelMarkup, gameAboutMarkup } from './info-panel.js';
import { privacyPolicyMarkup } from './privacy-policy.js';
import { openDetail, onDetailAction } from './detail-popup.js';
import { reportError } from './diagnostics.js';

// The "정보" button in the footer: version, recent errors, and a copy button for bug reports.
export function createInfoPanel(session) {
  function snapshot() {
    const entries = errorLog.list();
    const info = {
      version: APP_VERSION,
      platform: Capacitor.getPlatform(),
      status: session.status,
      saveVersion: session.state.version,
      saveNotice: session.saveNotice,
      entries,
    };
    info.report = formatReport({
      ...info,
      viewport: `${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio}`,
      userAgent: navigator.userAgent,
    });
    return info;
  }
  const show = () => openDetail(infoPanelMarkup({
    version: APP_VERSION, status: session.status, saveNotice: session.saveNotice,
  }));
  const showDiagnostics = () => openDetail(diagnosticsPanelMarkup(snapshot()));
  let notices;
  async function showLicenses() {
    if (!notices) {
      const dialog = openDetail({layout:'preferences',title:'오픈소스 라이선스', body:'<p>앱에 포함된 고지를 불러오고 있어요.</p>'});
      const loadingTitle = dialog.querySelector('#detail-title');
      try {
        // Packaged local chunk: no external request and no large startup parse.
        notices = (await import('../docs/licenses/runtime-notices.json')).default;
      } catch (error) {
        reportError('info.licenses', error);
        if (dialog.open && dialog.querySelector('#detail-title') === loadingTitle)
          openDetail({layout:'preferences',title:'오픈소스 라이선스', body:'<p>고지를 열지 못했어요. 다시 시도해 주세요.</p><button type="button" class="detail-link" data-detail-action="open-licenses">다시 열기</button>'});
        return;
      }
      if (!dialog.open || dialog.querySelector('#detail-title') !== loadingTitle) return;
    }
    openDetail({...licenseListMarkup(notices),layout:'preferences'});
  }
  async function copy(dialog) {
    const area = dialog.querySelector('#error-report'), status = dialog.querySelector('[data-copy-status]');
    const report = dialog.querySelector('.info-report');
    const isCurrent = () => dialog.open && dialog.querySelector('#error-report') === area;
    if (!area || !status || !report || !isCurrent()) return;
    let copied = false;
    try {
      await navigator.clipboard.writeText(area.value);
      copied = true;
    } catch (error) {
      reportError('info.copy', error);
      // Clipboard permission may finish after the user has left this detail.
      if (!isCurrent()) return;
      try {
        area.select();
        if (!isCurrent()) return;
        copied = document.execCommand('copy');
      } catch (fallback) { reportError('info.copyFallback', fallback); }
    }
    if (!isCurrent()) return;
    status.textContent = copied ? '복사했어요. 문의할 때 붙여넣어 주세요.' : '자동 복사가 안 돼요. "복사할 내용 보기"를 열어 글을 길게 눌러 복사해 주세요.';
    if (!copied) report.open = true;
  }
  onDetailAction((action, data, dialog) => {
    if (action === 'open-diagnostics') showDiagnostics();
    else if (action === 'open-game-about') openDetail(gameAboutMarkup());
    else if (action === 'copy-error-log') copy(dialog);
    else if (action === 'clear-error-log') { errorLog.clear(); showDiagnostics(); }
    else if (action === 'open-privacy') {const policy=privacyPolicyMarkup();openDetail({...policy,layout:'preferences',body:policy.body+'<button type="button" class="preference-back" data-detail-action="back-info">게임 정보로 돌아가기</button>'});}
    else if (action === 'open-licenses') showLicenses();
    else if (action === 'license-entry' && notices) openDetail({...licenseDetailMarkup(notices, Number(data.licenseIndex)),layout:'preferences'});
    else if (action === 'back-info') show();
    else if (action === 'retry-save') { session.retryLoad(); show(); }
  });

  const notice = document.querySelector('#save-notice');
  document.querySelector('#review-save').addEventListener('click', show);
  let lastTitle;
  return { show, sync() {
    const current = session.saveNotice, title = current?.title ?? '';
    if (title === lastTitle) return;
    lastTitle = title;
    notice.hidden = !current;
    notice.querySelector('[data-save-notice-title]').textContent = title;
  } };
}
