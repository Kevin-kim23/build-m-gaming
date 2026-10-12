const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function licenseListMarkup(notices) {
  return { kicker:'LICENSES', title:'오픈소스 라이선스', body:
    '<p>앱에 포함된 라이브러리와 SDK의 고지입니다. 항목을 누르면 라이선스 원문을 볼 수 있습니다. 인터넷 연결 없이 열립니다.</p>' +
    notices.entries.map((entry, i) => `<p style="overflow-wrap:anywhere"><button type="button" class="detail-link" data-detail-action="license-entry" data-license-index="${i}" style="max-width:100%;overflow-wrap:anywhere;text-align:left">${esc(entry.name)}</button><br><small>${esc(entry.license)}</small></p>`).join('') +
    '<button type="button" class="detail-link" data-detail-action="back-info">게임 정보로</button>' };
}

export function licenseDetailMarkup(notices, index) {
  const entry = Number.isInteger(index) && notices.entries[index];
  if (!entry) return licenseListMarkup(notices);
  const text = entry.textIds.map(id => notices.texts[id]).join('\n\n');
  return { kicker:'LICENSE', title:'라이선스 원문', body:
    `<h3 style="overflow-wrap:anywhere">${esc(entry.name)}</h3><p style="overflow-wrap:anywhere">${esc(entry.license)}</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.65 system-ui,sans-serif">${esc(text)}</pre>` +
    '<button type="button" class="detail-link" data-detail-action="open-licenses">라이선스 목록으로</button>' };
}
