import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CONSTELLATION_FORMATIONS} from '../src/constellation-formations.js';
import {CONSTELLATION_OFFICERS,CONSTELLATION_POWERS} from '../src/constellation-officers.js';
import {groupArmy} from '../src/formations.js';
import {fieldArmy} from '../src/field-layout.js';
import {freshState} from '../src/state.js';
import {createBattle} from '../src/battle.js';
import {drawHighCommand} from '../src/command-art.js';
import {galacticRankBadge} from '../src/rank-frame.js';

test('session lock explanation is present before campaign and battle controls',()=>{
 for(const file of ['campaign-map.js','battle-markup.js']){
  const source=readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
  assert.match(source,/<\/header>\s*<p[^>]*role="status"[^>]*data-battle-session/);
 }
 const source=readFileSync(new URL('../src/battle-ui.js',import.meta.url),'utf8');
 assert.match(source,/querySelectorAll\('\[data-battle-retry\], \[data-battle-next\]'\)/);
});
test('five ranks get exact sixteenfold formations, compact field groups and matching battle headquarters',()=>{
 for(const [i,f] of CONSTELLATION_FORMATIONS.entries()){
  const s={...freshState(),soldiers:5000,sergeants:300,[CONSTELLATION_OFFICERS[i].field]:64};s.equipment.tank={level:50,count:1,deployed:true};
  assert.equal(f.size,CONSTELLATION_POWERS[i]);assert.equal(groupArmy(s)[0].id,f.id);assert.equal(groupArmy(s)[0].count,1);
  assert.ok(fieldArmy(s).hiddenPower>=0);assert.equal(createBattle(s,1).player.hq.id,f.id);
 }
});
test('five original obsidian ruby buildings have distinct detailed silhouettes within bounds',()=>{
 const shapes=[];
 for(const f of CONSTELLATION_FORMATIONS){const ops=[],c={fillRect(...args){ops.push([this.fillStyle,...args]);}};
  assert.equal(drawHighCommand(c,f.id,f.width,f.height),true);assert.ok(ops.length>200);
  for(const [,x,y,w,h]of ops)assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=f.width+.001&&y+h<=f.height+.001);
  shapes.push(JSON.stringify(ops));
 }
 assert.equal(new Set(shapes).size,5);
 for(let tier=16;tier<=20;tier++){assert.match(galacticRankBadge(tier),/#343842/);assert.match(galacticRankBadge(tier),/data-metal="ruby"/);assert.match(galacticRankBadge(tier),/#d93650/);}
});
