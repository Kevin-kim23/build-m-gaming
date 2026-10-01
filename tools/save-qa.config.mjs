// Repeatable manual checks on a separate origin. Never seed the player's 4173 save.
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
const root = fileURLToPath(new URL('../', import.meta.url));
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const page = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>저장·작은 화면 검증</title><h1>4198 전용 테스트 기록</h1><p>실제 4173 기록과 분리된 테스트입니다.</p>
<button data-case="normal">정상 원수</button><button data-case="recover">손상 + 보조 복구</button><button data-case="blocked">둘 다 손상</button><button data-case="future">새 버전 기록</button><button data-case="missing">주 저장 누락</button>
<p id="result" role="status"></p><a href="/">게임 확인</a>
<script type="module">
import { freshState, SAVE_KEY, SAVE_VERSION } from '/src/state.js';
import { MAX_GOLD, serializeSave } from '/src/money.js';
document.querySelectorAll('[data-case]').forEach(button => button.onclick = () => {
  if (location.hostname !== '127.0.0.1' || location.port !== '4198') throw Error('Separate QA origin required');
  const s = { ...freshState(), soldiers: 1307720, sergeants: 300, gold: MAX_GOLD - 1n };
  const mode = button.dataset.case;
  localStorage.removeItem(SAVE_KEY + '-backup');
  if (mode === 'normal') localStorage.setItem(SAVE_KEY, serializeSave(s));
  else if (mode === 'future') {
    localStorage.setItem(SAVE_KEY, serializeSave({ ...s, version: SAVE_VERSION + 1 }));
    localStorage.setItem(SAVE_KEY + '-backup', serializeSave(s));
  } else {
    if (mode === 'missing') localStorage.removeItem(SAVE_KEY);
    else localStorage.setItem(SAVE_KEY, '{broken-test-record');
    localStorage.setItem(SAVE_KEY + '-backup', mode === 'blocked' ? '{broken-test-backup' : serializeSave(s));
  }
  document.querySelector('#result').textContent = button.textContent + ' 준비 완료';
});
</script></html>`;
export default {
  root, define: { __APP_VERSION__: JSON.stringify(version) },
  server: { host: '127.0.0.1', port: 4198, strictPort: true },
  plugins: [{ name: 'save-qa-only', configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url !== '/__save-check') return next();
      res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(page);
    });
  } }],
};
