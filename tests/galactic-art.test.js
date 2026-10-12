import test from 'node:test';
import assert from 'node:assert/strict';
import { FORMATIONS } from '../src/formations.js';
import { drawHighCommand } from '../src/command-art.js';
import { drawFormationPortrait } from '../src/art.js';
import { baseSprite } from '../src/unit-sprites.js';
import { medalSvg } from '../src/achievement-art.js';
import { layoutFieldArmy } from '../src/field-layout.js';

const canvas=()=>{
  const ops=[],draws=[];
  const c={setTransform(){},clearRect(){},fillRect(...rect){ops.push([this.fillStyle,...rect]);},drawImage(...args){draws.push(args);}};
  return {width:96,height:82,ops,draws,getContext:()=>c};
};

test('galactic command has a distinct detailed citadel and all pixels fit its larger sprite',()=>{
  const definition=FORMATIONS.find(f=>f.id==='galacticCommand');
  assert.ok(definition);
  assert.ok(definition.width>FORMATIONS.find(f=>f.id==='supremeCommand').width);
  const signatures=[];
  for(const id of ['supremeCommand','galacticCommand']){
    const f=FORMATIONS.find(f=>f.id===id),target=canvas();
    assert.equal(drawHighCommand(target.getContext('2d'),id,f.width,f.height),true);
    assert.ok(target.ops.length>400);
    for(const [,x,y,w,h] of target.ops){
      assert.ok([x,y,w,h].every(Number.isFinite));
      assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=f.width&&y+h<=f.height,`${id}: ${[x,y,w,h]}`);
    }
    signatures.push(JSON.stringify(target.ops));
  }
  assert.notEqual(signatures[0],signatures[1]);
});

test('galactic portraits and battle headquarters are cached, fit, and distinguish teams',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:canvas};
  try{
    const first=canvas(),second=canvas();
    drawFormationPortrait(first,'galacticCommand');drawFormationPortrait(second,'galacticCommand');
    const [source,x,y,w,h]=first.draws.at(-1);
    assert.equal(source,second.draws.at(-1)[0]);
    assert.ok(x>=0&&y>=0&&x+w<=96&&y+h<=82);
    const player=baseSprite('galacticCommand','player'),enemy=baseSprite('galacticCommand','enemy');
    assert.equal(baseSprite('galacticCommand','player'),player);
    assert.ok(player.width>baseSprite('supremeCommand','player').width);
    assert.notDeepEqual(player.ops,enemy.ops);
    assert.ok(player.ops.some(([color])=>color==='#688768'));
    assert.ok(enemy.ops.some(([color])=>color==='#bc8480'));
    for(const target of [player,enemy])for(const [,xx,yy,ww,hh] of target.ops){
      assert.ok(xx>=0&&yy>=0&&ww>0&&hh>0&&xx+ww<=target.width/3&&yy+hh<=target.height/3);
    }
  } finally {if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('galactic medal is distinct, cached and fits the existing compact medal shelf',()=>{
  const svg=medalSvg('galacticCommand');
  assert.equal(medalSvg('galacticCommand'),svg);
  assert.match(svg,/viewBox="0 0 96 112"/);
  assert.match(svg,/data-galactic-emblem="true"/);
  assert.notEqual(svg,medalSvg('supremeCommand'));
  assert.doesNotMatch(svg,/undefined|NaN/);
  for(const match of svg.matchAll(/<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/g)){
    const [x,y,w,h]=match.slice(1).map(Number);
    assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=96&&y+h<=112);
  }
});

test('narrow fields keep the galaxy headquarters and its name instead of shrinking to a troop',()=>{
  const f=FORMATIONS.find(f=>f.id==='galacticCommand');
  const army={soldiers:f.size};
  for(const area of [{x:10,y:34,width:140,height:90},{x:106,y:22,width:46,height:45}]){
    const items=layoutFieldArmy(army,area);
    assert.ok(items.length);
    assert.equal(items[0].id,'galacticCommand');
    if(area.width===140)assert.equal(items[0].width,84);
    assert.equal(items[0].label,true);
    for(const item of items){
      assert.ok(item.x>=area.x&&item.y>=area.y);
      assert.ok(item.x+item.boxWidth<=area.x+area.width);
      assert.ok(item.y+item.boxHeight<=area.y+area.height);
    }
  }
  const compact=layoutFieldArmy({soldiers:f.size*3},{x:106,y:22,width:46,height:45});
  assert.equal(compact[0].id,'galacticCommand');
  assert.equal(compact[0].count,3);
  assert.equal(compact[0].label,true);
  assert.ok(compact[0].boxWidth<=46,'renamed regiment label still fits its compact area');
});
