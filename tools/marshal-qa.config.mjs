// Isolated fixtures: the player's production origin must never be written here.
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
const root=fileURLToPath(new URL('../',import.meta.url));
const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const page=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>원수 계열 · 사령부 검증</title><style>
*{box-sizing:border-box}body{max-width:850px;margin:24px auto;padding:0 16px;background:#14232a;color:#e7e5d6;font:14px/1.5 system-ui}h1{font-size:22px}h2{font-size:17px}p{color:#aabbbd}button,a{padding:10px 8px;border:1px solid #617b84;background:#2a424d;color:#fff;border-radius:5px;cursor:pointer}a{display:inline-block;margin:10px 0}.ranks{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.buildings{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}figure{margin:0;padding:12px 4px;background:#20353e;border:1px solid #405962;border-radius:8px;text-align:center}figure svg{display:block;width:64px;height:64px;margin:auto}canvas{width:100%;max-width:240px;image-rendering:pixelated}figcaption{font-weight:700;margin:8px 0}small{color:#b4c4c5}figure button{display:block;width:100%;font-size:11px;margin-top:6px}#result{min-height:24px}</style>
<h1>원수 계열과 최고 사령부</h1><p>4197 전용 검증 · 실제 플레이 기록과 분리</p>
<div id="ranks" class="ranks"></div><h2>상위 편제</h2><div id="buildings" class="buildings"></div>
<p id="result" role="status"></p><a href="/">검증용 게임 열기</a>
<script type="module" src="/tools/marshal-qa.js"></script></html>`;
export default {root,define:{__APP_VERSION__:JSON.stringify(version)},server:{host:'127.0.0.1',port:4197,strictPort:true},
  plugins:[{name:'marshal-qa-only',configureServer(server){server.middlewares.use((req,res,next)=>{
    if(req.url!=='/__marshal-check')return next();res.setHeader('Content-Type','text/html; charset=utf-8');res.end(page);
  });}}]};
