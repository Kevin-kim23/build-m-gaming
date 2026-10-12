import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
const root=fileURLToPath(new URL('../',import.meta.url));
const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const page=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>물약 검증</title>
<style>body{font:16px/1.7 system-ui;background:#24352c;color:#f2ead3;padding:20px}button,a{display:block;padding:16px;margin:16px;color:inherit;background:#556547}</style>
<h1>물약 · 4210 전용 검증</h1><p>실제 4196 플레이 저장과 분리한 기록입니다.</p>
<button data-seed="fresh">대위 · 물약 0개</button><button data-seed="expiry">중장 · 물약 종료 10초 전</button><p id="result" role="status"></p><a href="/">검증용 게임 열기</a><script type="module" src="/tools/potion-qa.mjs"></script></html>`;
export default {root,define:{__APP_VERSION__:JSON.stringify(version)},server:{host:'127.0.0.1',port:4210,strictPort:true},plugins:[{name:'potion-qa-only',configureServer(server){server.middlewares.use((req,res,next)=>{
  if(req.url!=='/__potion-check')return next();res.setHeader('Content-Type','text/html; charset=utf-8');res.end(page);
});}}]};
