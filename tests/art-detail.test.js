import test from 'node:test';
import assert from 'node:assert/strict';
import { insignia } from '../src/home-view.js';
import { RANK_DEFINITIONS } from '../src/ranks.js';
import { helicopterSprite } from '../src/helicopter-art.js';
import { drawFormationPortrait } from '../src/art.js';
import { FORMATIONS } from '../src/formations.js';
import { UNITS } from '../src/units.js';

test('rank insignia uses the original simple marks for all current ranks', () => {
  RANK_DEFINITIONS.forEach((rank,i) => {
    assert.equal(insignia(i), '<span class="insignia '+rank.kind+'">'+'<i></i>'.repeat(rank.marks)+'</span>');
  });
});

test('detailed helicopter faces right and every unit/building portrait fits its card', () => {
  const previous=globalThis.document;
  const make=()=>{
    const ops=[],draws=[];
    const ctx={setTransform(){},clearRect(){},fillRect(...rect){ops.push({color:this.fillStyle,rect});},drawImage(...args){draws.push(args);}};
    return {width:96,height:82,ops,draws,getContext:()=>ctx};
  };
  globalThis.document={createElement:make};
  try {
    for(const level of [0,10]) {
      const heli=helicopterSprite(level);
      assert.deepEqual([heli.width,heli.height],[330,186]);
      const cockpit=heli.ops.find(op=>op.color==='#91c6cd');
      assert.ok(cockpit.rect[0]>55,'cockpit must be on the right of the aircraft');
    }
    for(const id of new Set([...FORMATIONS.map(f=>f.id),...Object.keys(UNITS)])) {
      const target=make();drawFormationPortrait(target,id);
      const [source,x,y,w,h]=target.draws.at(-1);
      assert.ok(source.width>=48);
      assert.ok(x>=0 && y>=0 && x+w<=96 && y+h<=82,`${id} must fit`);
    }
  } finally {if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
