import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STAGES,BATTLE_RULES} from '../src/battle.js';

// Exercise the real UI click controller with a small inert DOM and canvas-free
// renderer. CSS imports are removed solely for Node; no user's browser or save is touched.
function controller(){
  const listeners={},shown=[],classes={add(){},remove(){},toggle(){}};
  const nodes=new Map(),node=()=>({textContent:'',hidden:false,disabled:false,classList:classes,setAttribute(){}});
  const dialog={open:false,classList:classes,scrollTop:0,
    showModal(){this.open=true;},addEventListener(name,fn){listeners[name]=fn;},
    querySelector(selector){if(selector==='#battle-canvas')return null;if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);},
    querySelectorAll(selector){return selector==='[data-battle-gear]:checked'?[{dataset:{battleGear:'icbm'}}]:[];},
  };
  const map={countryId:'norgard',stop(){},handle(){return false;},show(id){shown.push(id);if(id)this.countryId=id;}};
  const deps={
    document:{hidden:false,querySelector:()=>dialog},STAGES,BATTLE_RULES,
    createCampaignMap:()=>map,createBattleAudioEvents:()=>({reset(){}}),
    battleAccess:()=>({visible:true,unlocked:true}),normalizeLoadout:(_s,input)=>input??{equipment:['icbm']},defaultLoadout:()=>({equipment:['icbm']}),
    createBattle:(_s,id)=>({stageId:id,countryId:STAGES[id-1].countryId,status:'running',deck:[]}),
    battlefieldMarkup:()=>'',UNITS:{},EQUIPMENT:{},requestAnimationFrame:()=>1,cancelAnimationFrame(){},
    performance:{now:()=>100},matchMedia:()=>({matches:true}),reportError(_area,error){throw error;},
  };
  const source=readFileSync(new URL('../src/battle-ui.js',import.meta.url),'utf8').replace(/^import .*;\r?$/gm,'').replace('export function createBattleUI','function createBattleUI');
  const create=Function(...Object.keys(deps),source+'\nreturn createBattleUI;')(...Object.values(deps));
  const ui=create({active:true,state:{campaignCleared:160}});ui.open();
  const click=(attr,value='')=>{
    const key=attr.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
    const target={disabled:false,dataset:{[key]:value},getAttribute(){return null;},hasAttribute:name=>name===attr};
    listeners.click({target:{closest:()=>target}});
  };
  return {click,shown,map};
}

test('next-region battles return to their current country when crossing a nation or continent',()=>{
  for(const [from,previous,next]of [[20,'serdin','veloc'],[80,'norgard','elysia'],[100,'elysia','varkion']]){
    const {click,shown,map}=controller();map.countryId=previous;
    click('data-stage',String(from));click('data-battle-next');click('data-battle-back');
    assert.equal(shown.at(-1),next,`return map after stage ${from+1}`);
  }
});
