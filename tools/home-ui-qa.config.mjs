// Isolated fixtures: the player's production origin must never be written here.
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
const root=fileURLToPath(new URL('../',import.meta.url));
const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const page=`<!doctype html><html lang="ko"><meta charset="utf-8"><title>홈·상점 UI 검증</title><style>body{background:#1e2a30;color:#e3e9e3;font:16px system-ui}button,a{padding:12px;margin:12px;display:inline-block}</style><h1>분리된 UI 검증</h1><p>4217 전용 가짜 저장. 실제 게임 저장에는 접근하지 않습니다.</p><button id="fixture">연합군 테스트 기록 준비</button><p id="result"></p><a href="/">검증용 게임 열기</a><script type="module" src="/tools/home-ui-qa.js"></script></html>`;
export default {root,define:{__APP_VERSION__:JSON.stringify(version)},server:{host:'127.0.0.1',port:4217,strictPort:true},
  plugins:[{name:'home-ui-qa-only',configureServer(server){server.middlewares.use((req,res,next)=>{
    if(req.url?.split('?')[0]==='/__store-sale-preview'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>상점 판매 화면 미리보기</title><script type="module" src="/tools/store-sale-qa.js"></script></html>');return;}
    if(req.url!=='/__home-ui-check')return next();res.setHeader('Content-Type','text/html; charset=utf-8');res.end(page);
  });}}]};
