import test from 'node:test';
import assert from 'node:assert/strict';
import * as effects from '../src/weapon-fx.js';
import {createBattle,deploy,STAGES} from '../src/battle.js';
import {referenceArmy} from '../tools/campaign-sim.mjs';
import {recordBattleVictory} from '../src/battle-progress.js';

function context(){
  const operations=[],stack=[];
  const ctx={globalAlpha:1,fillStyle:'',strokeStyle:'',lineWidth:1,
    save(){stack.push({alpha:this.globalAlpha,fill:this.fillStyle});},restore(){const s=stack.pop();this.globalAlpha=s.alpha;this.fillStyle=s.fill;},
    fillRect(...args){operations.push(['rect',...args,this.fillStyle,this.globalAlpha]);},
    beginPath(){},moveTo(){},lineTo(){},stroke(){},translate(){},rotate(){},
    ellipse(...args){operations.push(['ellipse',...args,this.strokeStyle,this.globalAlpha]);},
  };
  return {ctx,operations};
}

test('transport support has an actual supply crate and green heal pulse, never a tracer fallback',()=>{
  assert.equal(typeof effects.drawSupportPulse,'function');
  const {ctx,operations}=context();
  effects.drawSupportPulse(ctx,150,90,240);
  assert.ok(operations.some(o=>o[0]==='ellipse'&&o.at(-2)==='#9df3c4'));
  assert.ok(operations.filter(o=>o[0]==='rect').length>=8,'crate, clasp and crosses are visibly separate parts');
  assert.equal(ctx.globalAlpha,1,'drawing cannot leak opacity into other units');
  for(const age of [-1,601]){const c=context();effects.drawSupportPulse(c.ctx,age,90,240);assert.equal(c.operations.length,0);}
});

test('destruction waits for the lethal ballistic, laser or nova projectile even with reduced motion',()=>{
  assert.equal(typeof effects.headquartersDestructionTiming,'function');
  for(const id of ['icbm','orbitalAssault','novaCannon'])for(const reduced of [false,true]){
    const battle={status:'victory',elapsedMs:5000,fx:[{kind:'strike',id,side:'player',at:5000}]};
    const timing=effects.headquartersDestructionTiming(battle,reduced),impact=effects.WEAPON_FX[id].travel;
    assert.equal(timing.impactDelayMs,impact);assert.equal(timing.durationMs,impact+(reduced?250:1500));
    assert.equal(effects.headquartersDestructionFrame(timing,impact-1),null);
    assert.deepEqual(effects.headquartersDestructionFrame(timing,impact),{side:'enemy',age:0,reduced});
    assert.equal(effects.headquartersDestructionFrame(timing,impact+200).age,200);
  }
});

test('only the finishing HQ hit delays the visual; stale or unit-target shots cannot add a wait',()=>{
  const base={status:'defeat',elapsedMs:1000,fx:[]};
  assert.equal(effects.headquartersDestructionTiming(base).impactDelayMs,0);
  const unrelated=[{at:950,kind:'strike',side:'enemy',id:'icbm'},{at:1000,kind:'shot',side:'enemy',id:'fighter',to:100}];
  assert.equal(effects.headquartersDestructionTiming({...base,fx:unrelated}).impactDelayMs,0);
  const current={at:1000,kind:'shot',side:'enemy',id:'railgunTank',to:0};
  const timing=effects.headquartersDestructionTiming({...base,fx:[...unrelated,current]});
  assert.equal(timing.impactDelayMs,70);assert.equal(timing.side,'player');
});

test('a finishing strike records its reward immediately, before visual impact and without changing combat time',()=>{
  const state=referenceArmy(STAGES[159]);state.gold=0;
  let battle=createBattle(state,160,{equipment:['novaCannon']});battle.mana=100;battle.enemy.hq.hp=1;
  battle=deploy(battle,'novaCannon');assert.equal(battle.status,'victory');
  const before=structuredClone(battle),timing=effects.headquartersDestructionTiming(battle);
  assert.equal(effects.headquartersDestructionFrame(timing,0),null);
  const reward=recordBattleVictory(state,battle,state.lastAccrual);
  assert.equal(reward.ok,true);assert.equal(state.campaignCleared,160);assert.ok(state.gold>0);
  assert.deepEqual(battle,before);
});

test('staggered volley opacity always stays in the canvas valid range',()=>{
  for(const id of ['rocketLauncher','helicopter','stellarBomber'])for(const age of [0,150,300,500]){
    const {ctx,operations}=context();effects.drawWeaponShot(ctx,{id},age,100,300,50);
    assert.ok(operations.every(o=>o.at(-1)>=0&&o.at(-1)<=1));
  }
});
