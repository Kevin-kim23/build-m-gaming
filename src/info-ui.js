import { Capacitor } from '@capacitor/core';
import { APP_VERSION } from './version.js';
import { errorLog, formatReport } from './error-log.js';
import { infoPanelMarkup } from './info-panel.js';
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
  const show = () => openDetail(infoPanelMarkup(snapshot()));
  async function copy(dialog) {
    const area = dialog.querySelector('#error-report'), status = dialog.querySelector('[data-copy-status]');
    let copied = false;
    try {
      await navigator.clipboard.writeText(area.value);
      copied = true;
    } catch (error) {
      reportError('info.copy', error);
      try { area.select(); copied = document.execCommand('copy'); } catch (fallback) { reportError('info.copyFallback', fallback); }
    }
    status.textContent = copied ? '복사했어요. 문의할 때 붙여넣어 주세요.' : '자동 복사가 안 돼요. "복사할 내용 보기"를 열어 글을 길게 눌러 복사해 주세요.';
    if (!copied) dialog.querySelector('.info-report').open = true;
  }
  onDetailAction((action, data, dialog) => {
    if (action === 'copy-error-log') copy(dialog);
    else if (action === 'clear-error-log') { errorLog.clear(); show(); }
    else if (action === 'retry-save') { session.retryLoad(); show(); }
  });
  document.querySelector('#open-info').addEventListener('click', show);
  const notice = document.querySelector('#save-notice');
  document.querySelector('#review-save').addEventListener('click', show);
  let lastTitle;
  return { sync() {
    const current = session.saveNotice, title = current?.title ?? '';
    if (title === lastTitle) return;
    lastTitle = title;
    notice.hidden = !current;
    notice.querySelector('[data-save-notice-title]').textContent = title;
  } };
}
