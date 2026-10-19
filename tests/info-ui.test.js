import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from 'vite';

// Bundle the real controller to exercise its CSS import without adding a DOM package.
const builds = await build({configFile:false,logLevel:'silent',mode:'production',build:{write:false,minify:false,
  lib:{entry:fileURLToPath(new URL('../src/info-ui.js',import.meta.url)),formats:['es']}}});
const bundle = (Array.isArray(builds)?builds:[builds]).flatMap(result=>result.output).find(item=>item.type==='chunk'&&item.isEntry);
let instance = 0;

async function setup(t) {
  const previous = new Map(['document','window','navigator','localStorage'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  const errors = [], oldError = console.error;
  console.error = (...args)=>errors.push(args);
  t.after(()=>{
    console.error = oldError;
    for (const [key,descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis,key,descriptor);
      else delete globalThis[key];
    }
  });
  let storageReads = 0, selections = 0, fallbackCalls = 0, clipboard;
  const events = new Map(), children = new Map();
  const dialog = {
    open:false,scrollTop:0,setAttribute(){},
    addEventListener:(name,handler)=>events.set(name,handler),
    showModal(){this.open=true;},close(){this.open=false;},
    querySelector:selector=>children.get(selector)??null,
  };
  Object.defineProperty(dialog,'innerHTML',{set(html){
    children.clear();
    children.set('#detail-title',{});
    if (html.includes('id="error-report"')) {
      children.set('#error-report',{value:'diagnostic report',select(){selections++;}});
      children.set('[data-copy-status]',{textContent:''});
      children.set('.info-report',{open:false});
    }
  }});
  const noopControl = {addEventListener(){},querySelector(){return {textContent:''};}};
  const values = {
    document:{createElement:()=>dialog,body:{append(){}},querySelector:()=>noopControl,execCommand(){fallbackCalls++;return false;}},
    window:{innerWidth:360,innerHeight:780,devicePixelRatio:1},
    navigator:{userAgent:'test browser',clipboard:{writeText:()=>new Promise((resolve,reject)=>{clipboard={resolve,reject};})}},
    localStorage:{getItem(){storageReads++;return null;},setItem(){}},
  };
  for (const [key,value] of Object.entries(values)) Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  const code = bundle.code+`\n//# sourceURL=info-ui-controller-test-${instance++}.js`;
  const module = await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  const ui = module.createInfoPanel({status:'자동 저장',state:{version:42},saveNotice:null,retryLoad(){}});
  const action = name=>events.get('click')({target:{closest:selector=>selector==='[data-detail-action]'?{dataset:{detailAction:name}}:null}});
  return {ui,dialog,action,errors,get clipboard(){return clipboard;},counts:()=>({storageReads,selections,fallbackCalls})};
}
const settle = ()=>new Promise(resolve=>setImmediate(resolve));

test('opening the info summary does not read or format diagnostic records',async t=>{
  const f = await setup(t), before = f.counts().storageReads;
  f.ui.show();
  assert.equal(f.counts().storageReads,before);
  f.action('open-diagnostics');
  assert.ok(f.counts().storageReads>before);
});

test('a failed clipboard request after returning to info does not select stale text or update removed controls',async t=>{
  const f = await setup(t);f.ui.show();f.action('open-diagnostics');
  const status=f.dialog.querySelector('[data-copy-status]'),report=f.dialog.querySelector('.info-report');
  f.action('copy-error-log');f.action('back-info');
  f.clipboard.reject(new Error('clipboard unavailable'));
  await settle();
  assert.equal(status.textContent,'');assert.equal(report.open,false);
  assert.equal(f.counts().selections,0);assert.equal(f.counts().fallbackCalls,0);
});

test('late clipboard success after closing the popup leaves the closed screen untouched',async t=>{
  const f=await setup(t);f.ui.show();f.action('open-diagnostics');
  const status=f.dialog.querySelector('[data-copy-status]');
  f.action('copy-error-log');f.dialog.close();f.clipboard.resolve();
  await settle();
  assert.equal(status.textContent,'');assert.equal(f.counts().fallbackCalls,0);
});

test('clipboard failure on the same diagnostic screen still provides manual copy fallback',async t=>{
  const f=await setup(t);f.ui.show();f.action('open-diagnostics');
  f.action('copy-error-log');f.clipboard.reject(new Error('clipboard unavailable'));
  await settle();
  assert.equal(f.counts().selections,1);assert.equal(f.counts().fallbackCalls,1);
  assert.equal(f.dialog.querySelector('.info-report').open,true);
  assert.match(f.dialog.querySelector('[data-copy-status]').textContent,/길게 눌러 복사/);
});
