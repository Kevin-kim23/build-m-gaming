import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
const root=fileURLToPath(new URL('../',import.meta.url));
const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const page=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>자동터치 검증</title>
<style>body{font:16px/1.7 system-ui;background:#24352c;color:#f2ead3;padding:20px}button,a{display:block;padding:16px;margin:16px;color:inherit;background:#556547}</style>
<h1>자동터치 · 4211 전용 검증</h1><p>실제 4196 플레이 저장과 분리한 기록입니다.</p>
<button data-seed="fresh">병력 0 · 자동터치 미보유</button><button data-seed="recruits">상병 · 모집 계급장</button><button data-seed="general">중장 · 사지방·전투</button><p id="result" role="status"></p><a href="/">검증용 게임 열기</a><script type="module" src="/tools/auto-tap-qa.mjs"></script></html>`;
export default {root,define:{__APP_VERSION__:JSON.stringify(version)},server:{host:'127.0.0.1',port:4211,strictPort:true},plugins:[{name:'auto-tap-qa-only',configureServer(server){server.middlewares.use((req,res,next)=>{
  if(req.url!=='/__auto-tap-check')return next();res.setHeader('Content-Type','text/html; charset=utf-8');res.end(page);
});}}]};
