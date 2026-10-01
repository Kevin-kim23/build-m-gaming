import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../src/game.js';
import { createBattle, advanceBattle, equipmentCombatStats } from '../src/battle.js';
import { drawEquipment } from '../src/equipment-art.js';
import { EQUIPMENT } from '../src/equipment.js';
const T=1_800_000_000_000;
function supplyBattle(level=0,count=1){
  const s={...freshState(T),soldiers:78920,sergeants:300,ncoSchoolLevel:1};
  s.equipment.transport={level,count,deployed:true};
  const b=createBattle(s,1,{units:{},equipment:['transport']});
  b.enemy.units=[];b.enemy.equipment=[];return b;
}
function until(b,time){while(b.elapsedMs<time&&b.status==='running')b=advanceBattle(b,50);return b;}
test('transport heals its own damaged HQ on interval and never damages the opponent',()=>{
  const initial=supplyBattle(),g=initial.player.equipment[0];initial.player.hq.hp-=5000;
  const enemyHp=initial.enemy.hq.hp,damaged=initial.player.hq.hp;
  assert.equal(g.damage,0);assert.ok(g.healing>0);
  const before=until(initial,g.intervalMs-50);assert.equal(before.player.hq.hp,damaged);
  const after=advanceBattle(before,50);assert.equal(after.player.hq.hp,damaged+g.healing);
  assert.equal(after.enemy.hq.hp,enemyHp);assert.equal(initial.player.hq.hp,damaged);
});
test('transport counts and upgrades improve healing with no overheal or resurrection',()=>{
  const one=equipmentCombatStats('transport',0,81920),three=equipmentCombatStats('transport',20,81920,3);
  assert.ok(three.healing>one.healing*3);assert.ok(three.intervalMs<one.intervalMs);
  let b=supplyBattle(20,1000);b.player.hq.hp=1;b=until(b,b.player.equipment[0].intervalMs);
  assert.equal(b.player.hq.hp,b.player.hq.maxHp);
  b=supplyBattle();b.player.hq.hp=1;
  b.player.equipment[0].nextShotMs=50;b.enemy.equipment=[{damage:2,nextShotMs:50,intervalMs:1000}];
  const dead=advanceBattle(b,50);assert.equal(dead.status,'defeat');assert.equal(dead.player.hq.hp,0);
});
test('fighter attacks scale with copies and every upgrade through twenty improves aircraft effects',()=>{
  for(const id of ['transport','fighter']){
    let before=equipmentCombatStats(id,0);
    for(let level=1;level<=20;level++){
      const after=equipmentCombatStats(id,level);assert.ok((after.healing??after.damage)>(before.healing??before.damage));
      assert.ok(after.intervalMs<=before.intervalMs);before=after;
    }
  }
  const s={...freshState(T),soldiers:78920,sergeants:300};s.equipment.fighter={level:20,count:2,deployed:false};
  let b=createBattle(s,1,{units:{},equipment:['fighter']});b.enemy.hq.hp=b.enemy.hq.maxHp=100000;
  b.enemy.units=[];b.enemy.equipment=[];const stats=equipmentCombatStats('fighter',20,81920,2);
  b=until(b,stats.intervalMs);assert.equal(b.enemy.hq.hp,100000-stats.damage);assert.equal(b.player.hq.hp,81920);
});
test('all equipment stages have cached sprites and fit the preview including glowing upgrades',()=>{
  const previous=globalThis.document;
  const make=()=>{
    const ops=[],draws=[],ctx={setTransform(){},clearRect(){},fillRect(...args){ops.push([this.fillStyle,...args]);},drawImage(...args){draws.push(args);}};
    return {width:440,height:248,ops,draws,getContext:()=>ctx};
  };
  globalThis.document={createElement:make};
  try{
    for(const id of Object.keys(EQUIPMENT)){
      const sources=new Set(),signatures=new Set();
      for(let level=0;level<=20;level++){
        const target=make();drawEquipment(target,level,id);const [source,x,y,w,h]=target.draws.at(-1);
        assert.ok(x>=0&&y>=0&&x+w<=440&&y+h<=248);sources.add(source);
        signatures.add(JSON.stringify(source.ops));
        const again=make();drawEquipment(again,level,id);assert.equal(again.draws.at(-1)[0],source);
        if(['transport','fighter','railgunTank','icbm'].includes(id)||level>10)for(const [,x,y,w,h]of source.ops)assert.ok(x>=0&&y>=0&&w>=0&&h>=0&&x+w<=110&&y+h<=62,`${id} +${level} ${x},${y},${w},${h}`);
      }
      assert.equal(sources.size,21);assert.equal(signatures.size,21);
    }
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
