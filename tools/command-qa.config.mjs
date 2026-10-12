import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
const root=fileURLToPath(new URL('../',import.meta.url));
const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const page=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>지휘 사관학교 · 시설 검증</title><style>
*{box-sizing:border-box}body{margin:16px;background:#182c37;color:#eceddf;font:14px/1.5 system-ui}h1{font-size:21px}h2{font-size:17px}button,a{display:inline-block;background:#3b5e68;color:#fff;padding:12px;border:1px solid #9fb1a6;border-radius:5px;margin:4px}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px}figure{margin:0;text-align:center;padding:12px 5px;background:#28424b;border-radius:8px}figure svg{width:96px;height:80px}canvas{width:100%;image-rendering:pixelated}small{display:block;color:#c0d6d6}</style>
<h1>지휘 사관학교 · 부사령관 · 시설19종</h1><p>4209 전용 검증. 실제 플레이 저장은 변경하지 않습니다.</p>
<button data-seed="junior">준원수 · 학교 건설 직전</button><button data-seed="top">부사령관 · 전체 시설</button><p id="result" role="status"></p><a href="/">검증용 게임 열기</a>
<h2>소원수~부사령관 · 같은 배경</h2><section id="ranks"></section>
<h2>사단~집단군 · 은하단 사령부</h2><section id="formations"></section>
<h2>시설 Lv.1 → Lv.20</h2><section id="facilities"></section>
<script type="module" src="/tools/command-qa.mjs"></script></html>`;
export default {root,define:{__APP_VERSION__:JSON.stringify(version)},server:{host:'127.0.0.1',port:4209,strictPort:true},
  plugins:[{name:'command-qa-only',configureServer(server){server.middlewares.use((req,res,next)=>{
    if(req.url!=='/__command-check')return next();res.setHeader('Content-Type','text/html; charset=utf-8');res.end(page);
  });}}]};
