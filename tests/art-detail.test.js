import test from 'node:test';
import assert from 'node:assert/strict';
import { rankInsignia } from '../src/rank-art.js';
import { RANK_DEFINITIONS } from '../src/ranks.js';
import { helicopterSprite } from '../src/helicopter-art.js';
import { drawFormationPortrait } from '../src/art.js';
import { FORMATIONS } from '../src/formations.js';
import { UNITS } from '../src/units.js';

test('every rank has a distinct bounded insignia; officer ornaments grow by tier', () => {
  const pictures = RANK_DEFINITIONS.map((rank,i) => {
    const svg=rankInsignia(i);
    assert.equal(svg,rankInsignia(i));
    assert.ok(svg.includes(`data-rank-kind="${rank.kind}"`));
    for(const [,x,y,w,h] of svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)) {
      assert.ok(+x + +w <=72 && +y + +h <=72);
    }
    return svg;
  });
  assert.equal(new Set(pictures).size,RANK_DEFINITIONS.length);
  const counts=['officer','field','general'].map(kind => pictures[RANK_DEFINITIONS.findIndex(r=>r.kind===kind)].split('<rect').length);
  assert.ok(counts[0]<counts[1] && counts[1]<counts[2]);
  assert.throws(()=>rankInsignia(-1),RangeError);
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
