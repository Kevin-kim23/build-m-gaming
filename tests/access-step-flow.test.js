import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from 'vite';
import {ACCESS_KEY,acceptAccess} from '../src/access-rules.js';

// Exercise the real controller, including its CSS import, through the same browser
// bundle path used by the game. DOM stand-ins only provide the controls it touches.
const builds=await build({configFile:false,logLevel:'silent',mode:'production',build:{write:false,minify:false,
  lib:{entry:fileURLToPath(new URL('../src/access-ui.js',import.meta.url)),formats:['es']}}});
const bundle=(Array.isArray(builds)?builds:[builds]).flatMap(result=>result.output).find(item=>item.type==='chunk'&&item.isEntry);
const {createAccessUI}=await import('data:text/javascript;base64,'+Buffer.from(bundle.code).toString('base64'));

function control(){
  return {value:'',checked:false,disabled:false,hidden:false,dataset:{},textContent:'',scrollTop:0,focused:false,
    focus(){this.focused=true;},addEventListener(type,listener){this['on'+type]=listener;}};
}
function dialog(){
  const node=control(),children=new Map();
  node.open=false;
  node.setAttribute=()=>{};
  node.showModal=()=>{node.open=true;};
  node.close=()=>{node.open=false;node.onclose?.();};
  node.querySelector=selector=>{
    if(!children.has(selector))children.set(selector,control());
    return children.get(selector);
  };
  node.stages=['age','consent','age','consent'].map(step=>({...control(),dataset:{accessStage:step}}));
  node.querySelectorAll=selector=>selector==='[data-access-stage]'?node.stages:[];
  Object.defineProperty(node,'innerHTML',{set(value){
    children.clear();
    node.querySelector('[data-ad-enable]').disabled=/data-ad-enable disabled/.test(value);
  }});
  return node;
}
async function setup(t,{stored=null,failWrite=false}={}){
  const previousWindow=globalThis.window;
  globalThis.window={addEventListener(){}};
  t.after(()=>{if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;});
  const nodes=[],writes=[],errors=[];
  const root={body:{append:node=>nodes.push(node)},createElement:()=>dialog()};
  const storage={getItem:key=>key===ACCESS_KEY?stored:null,setItem(key,value){
    if(failWrite)throw Error('storage full');
    writes.push([key,value]);stored=value;
  }};
  const ui=createAccessUI({root,storage,onError:(area,error)=>errors.push([area,error.message])});
  const started=ui.ensureStart();
  await new Promise(resolve=>setImmediate(resolve));
  const gate=nodes.find(node=>node.id==='access-gate');
  return {ui,started,gate,nodes,writes,errors,get:selector=>gate.querySelector(selector)};
}
const submit=node=>node.onsubmit({preventDefault(){}});
function advance(context,age='19'){
  context.get('[name=age]').value=age;
  submit(context.get('[data-age-form]'));
}

test('age step rejects invalid and under-14 input and never records consent',async t=>{
  const context=await setup(t);
  for(const age of ['', '13', '14.5', '121', '1e2']){
    advance(context,age);
    assert.equal(context.gate.dataset.step,'age');
    assert.ok(context.get('[data-access-error]').textContent);
    assert.equal(context.ui.store.accepted,false);
  }
  context.get('[name=terms]').checked=true;context.get('[name=privacy]').checked=true;
  submit(context.get('[data-access-form]'));
  assert.equal(context.gate.open,true);
  assert.deepEqual(context.writes,[],'submitting the hidden consent form cannot bypass the age step');
});

test('Next only changes the visible step; Back clears checks and preserves editable age',async t=>{
  const context=await setup(t);
  advance(context,'18');
  assert.equal(context.gate.dataset.step,'consent');
  assert.deepEqual(context.gate.stages.map(node=>node.hidden),[true,false,true,false]);
  assert.deepEqual(context.writes,[]);
  assert.equal(context.ui.store.adsAllowed,false);
  context.get('[name=terms]').checked=true;context.get('[name=privacy]').checked=true;
  context.get('[data-access-back]').onclick();
  assert.equal(context.gate.dataset.step,'age');
  assert.equal(context.get('[name=age]').value,'18');
  assert.equal(context.get('[name=age]').focused,true);
  assert.equal(context.get('[name=terms]').checked,false);
  assert.equal(context.get('[name=privacy]').checked,false);
  assert.deepEqual(context.writes,[]);
});

test('both required choices must be explicit; successful final consent stores only the age band',async t=>{
  const context=await setup(t);
  advance(context,'14');
  for(const [terms,privacy] of [[false,false],[true,false],[false,true]]){
    context.get('[name=terms]').checked=terms;context.get('[name=privacy]').checked=privacy;
    submit(context.get('[data-access-form]'));
    assert.equal(context.gate.open,true);assert.deepEqual(context.writes,[]);
  }
  context.get('[name=terms]').checked=true;context.get('[name=privacy]').checked=true;
  submit(context.get('[data-access-form]'));
  assert.equal(await context.started,true);
  assert.equal(context.gate.open,false);
  assert.equal(context.writes.length,1);
  assert.equal(context.writes[0][0],ACCESS_KEY);
  const saved=JSON.parse(context.writes[0][1]);
  assert.equal(saved.ageBand,'teen');assert.equal('age' in saved,false);
  assert.equal(saved.adsConsent,false);
  assert.equal(context.get('[name=age]').value,'');
});

test('final submission rechecks age instead of trusting the earlier Next result',async t=>{
  const context=await setup(t);
  advance(context,'19');
  context.get('[name=terms]').checked=true;context.get('[name=privacy]').checked=true;
  context.get('[name=age]').value='13';
  submit(context.get('[data-access-form]'));
  assert.equal(context.gate.dataset.step,'age');
  assert.equal(context.gate.open,true);
  assert.match(context.get('[data-access-error]').textContent,/14세 미만/);
  assert.deepEqual(context.writes,[]);
  assert.equal(context.ui.store.accepted,false);
});

test('failed consent persistence keeps the dialog open and game access denied',async t=>{
  const context=await setup(t,{failWrite:true});
  advance(context);
  context.get('[name=terms]').checked=true;context.get('[name=privacy]').checked=true;
  submit(context.get('[data-access-form]'));
  assert.equal(context.gate.open,true);
  assert.equal(context.ui.store.accepted,false);
  assert.match(context.get('[data-access-error]').textContent,/저장하지 못/);
  assert.equal(context.errors[0][0],'access.save');
});

test('current consent skips both steps without rewriting preferences',async t=>{
  const record=acceptAccess({age:19,terms:true,privacy:true});
  const context=await setup(t,{stored:JSON.stringify(record)});
  assert.equal(await context.started,true);
  assert.equal(context.gate,undefined);
  assert.deepEqual(context.writes,[]);
});

test('compact advertising popup still allows refusal without advertising consent',async t=>{
  const record=acceptAccess({age:19,terms:true,privacy:true});
  const context=await setup(t,{stored:JSON.stringify(record)});
  const choice=context.ui.chooseAds();
  const ads=context.nodes.find(node=>node.id==='ad-choice-modal');
  assert.equal(ads.querySelector('[data-ad-agree]').checked,false);
  assert.equal(ads.querySelector('[data-ad-enable]').disabled,true);
  await ads.querySelector('[data-ad-disable]').onclick();
  assert.equal(await choice,null);
  assert.equal(ads.open,false);
  assert.equal(context.ui.store.accepted,true);
  assert.equal(context.ui.store.adsAllowed,false);
});
