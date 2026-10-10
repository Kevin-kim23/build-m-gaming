import test from 'node:test';
import assert from 'node:assert/strict';
import { drawHighCommand } from '../src/command-art.js';
import { battleHeadquartersSize, drawBattleHeadquarters, battleHeadquartersSprite } from '../src/battle-hq-art.js';
import { FORMATIONS } from '../src/formations.js';
import { layoutFieldArmy } from '../src/field-layout.js';
import { schoolIcon } from '../src/school-art.js';

const newIds=['galacticCorps','galacticFieldArmy','galacticArmyGroup','galacticAlliedArmy','galacticGrandAlliedArmy'];
const canvas=()=>{
  const ops=[],draws=[],ctx={setTransform(){},fillRect(...rect){ops.push([this.fillStyle,...rect]);},drawImage(...args){draws.push(args);}};
  return {ops,draws,width:0,height:0,getContext:()=>ctx};
};
function within(ops,width,height,id){
  for(const [,x,y,w,h] of ops)assert.ok([x,y,w,h].every(Number.isFinite)&&x>=0&&y>=0&&w>0&&h>0&&x+w<=width+1e-8&&y+h<=height+1e-8,`${id}: ${x},${y},${w},${h}`);
}

test('five larger galactic citadels have original distinct silhouettes with shared silver/cyan/violet materials',()=>{
  const signatures=[];
  for(const id of newIds){
    const f=FORMATIONS.find(f=>f.id===id),target=canvas();
    assert.ok(f,`${id} definition`);
    assert.equal(drawHighCommand(target.getContext('2d'),id,f.width,f.height),true);
    assert.ok(target.ops.length>500,`${id} retains detailed cladding, bridges and windows`);
    within(target.ops,f.width,f.height,id);
    for(const material of ['#a395d7','#9ceff1','#c9d9e8'])assert.ok(target.ops.some(([color])=>color===material),`${id} ${material}`);
    signatures.push(JSON.stringify(target.ops.map(([color,x,y,w,h])=>[color,x/f.width,y/f.height,w/f.width,h/f.height])));
    const compact=layoutFieldArmy({soldiers:f.size},{x:10,y:34,width:140,height:110});
    assert.equal(compact[0].id,id);assert.equal(compact[0].width,84);assert.equal(compact[0].label,true);
  }
  assert.equal(new Set(signatures).size,newIds.length,'different architecture, not scaled copies');
});

test('each formation has a distinct overhead headquarters with contained roofs, paths and subordinate buildings',()=>{
  const signatures=[];
  for(const f of FORMATIONS){
    const size=battleHeadquartersSize(f.id),player=canvas(),enemy=canvas();
    assert.ok(size.width>0&&size.height>0);
    drawBattleHeadquarters(player.getContext('2d'),f.id,'player');
    drawBattleHeadquarters(enemy.getContext('2d'),f.id,'enemy');
    within(player.ops,size.width,size.height,f.id);within(enemy.ops,size.width,size.height,f.id);
    assert.notDeepEqual(player.ops,enemy.ops,'teams retain readable different colors');
    assert.ok(player.ops.some(([color])=>color==='#688768'));
    assert.ok(enemy.ops.some(([color])=>color==='#bc8480'));
    signatures.push(JSON.stringify(player.ops.map(([color,x,y,w,h])=>[color,x/size.width,y/size.height,w/size.width,h/size.height])));
  }
  assert.equal(new Set(signatures).size,FORMATIONS.length);
  assert.throws(()=>battleHeadquartersSize('missing'),/Unknown/);
  assert.throws(()=>drawBattleHeadquarters(canvas().getContext('2d'),'squad','neutral'),/side/);
});

test('overhead headquarters geometry is rendered only once per formation/team and reused',()=>{
  const previous=globalThis.document;globalThis.document={createElement:canvas};
  try{
    for(const f of FORMATIONS){
      const size=battleHeadquartersSize(f.id),first=battleHeadquartersSprite(f.id,'player');
      assert.equal(first,battleHeadquartersSprite(f.id,'player'));
      assert.equal(first.width,size.width*3);assert.equal(first.height,size.height*3);
      assert.notEqual(first,battleHeadquartersSprite(f.id,'enemy'));
      within(first.ops,size.width,size.height,f.id);
    }
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('galactic academy has five cached campus expansions with contained silver/violet original artwork',()=>{
  const icons=[];
  for(let level=0;level<=5;level++){
    const art=schoolIcon('galactic',level);assert.equal(schoolIcon('galactic',level),art);
    assert.match(art,new RegExp(`data-galactic-school="${level}"`));
    assert.match(art,/viewBox="0 0 96 72"/);assert.match(art,/#a395d7/);assert.match(art,/#9ceff1/);
    assert.doesNotMatch(art,/undefined|NaN|url\(#|\sid="/);
    const rects=[...art.matchAll(/<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/g)].map(match=>['',...match.slice(1).map(Number)]);
    within(rects,96,72,'galactic academy');icons.push(art);
  }
  assert.equal(new Set(icons).size,6);
  assert.notEqual(icons[1],schoolIcon('command',1));
});
