import test from 'node:test';
import assert from 'node:assert/strict';
import { drawEquipment, drawEquipmentOnGround } from '../src/equipment-art.js';
import { unitSprite, SPRITE_SIZE } from '../src/unit-sprites.js';
import { EQUIPMENT } from '../src/equipment.js';

const IDS=['carrier','flyingFortress','orbitalAssault'];
function canvas() {
  const ops=[],draws=[];
  const ctx={setTransform(){},clearRect(){},fillRect(...rect){ops.push([this.fillStyle,...rect]);},drawImage(...args){draws.push(args);}};
  return {width:440,height:248,ops,draws,getContext:()=>ctx};
}
function bounds(ops,width,height,message) {
  for(const [,x,y,w,h]of ops)assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=width&&y+h<=height,`${message}: ${[x,y,w,h]}`);
}

test('every military type has bounded and distinct red-gold trim from21 through30 in home and battle',()=>{
  const previous=globalThis.document;globalThis.document={createElement:canvas};
  try {
    for(const id of Object.keys(EQUIPMENT)) {
      const signatures=new Set();
      for(let level=21;level<=30;level++) {
        const target=canvas();drawEquipment(target,level,id);
        const source=target.draws.at(-1)[0];bounds(source.ops,110,62,id);
        assert.ok(source.ops.some(([color])=>color==='#c75140'));
        signatures.add(JSON.stringify(source.ops));
        const overhead=unitSprite(id,'player',level);bounds(overhead.ops,56,68,id);
        assert.ok(overhead.ops.some(([color])=>color==='#d65a46'));
        assert.equal(unitSprite(id,'player',level),overhead);
      }
      assert.equal(signatures.size,10);
    }
  } finally {if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
test('late ship home artwork keeps distinct detailed silhouettes, 31 cached stages and right-facing prows',()=>{
  const previous=globalThis.document;globalThis.document={createElement:canvas};
  try {
    const signatures=new Set();
    for(const id of IDS) {
      const stages=new Set();
      for(let level=0;level<=30;level++) {
        const target=canvas();assert.equal(drawEquipment(target,level,id),true);
        const [source,x,y,w,h]=target.draws.at(-1);
        assert.deepEqual([source.width,source.height],[330,186]);
        assert.ok(x>=0&&y>=0&&x+w<=target.width&&y+h<=target.height);
        bounds(source.ops,110,62,`${id}+${level}`);
        assert.equal(drawEquipment(target,level,id),false,'unchanged preview should not draw');
        const again=canvas();drawEquipment(again,level,id);assert.equal(again.draws.at(-1)[0],source);
        const ground=canvas();drawEquipmentOnGround(ground.getContext('2d'),level,2,4,48,25,id);
        assert.equal(ground.draws[0][0],source,'field uses the same cached artwork');
        stages.add(JSON.stringify(source.ops));
        if(level===0) {
          assert.ok(source.ops.length>95,'panels, bridge, engines or deck detail');
          assert.ok(source.ops.some(([,x,y,w])=>x>=100&&x+w>=107&&y<40),'bow faces right');
          signatures.add(JSON.stringify(source.ops));
        }
      }
      assert.equal(stages.size,31,'each upgrade changes the artwork');
    }
    assert.equal(signatures.size,3);
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
test('late ship battle artwork fits every upgrade and keeps enemy colors separate from allies',()=>{
  const previous=globalThis.document;globalThis.document={createElement:canvas};
  try {
    for(const id of IDS)for(const side of ['player','enemy']) {
      const stages=new Set();
      for(let level=0;level<=30;level++) {
        const asset=unitSprite(id,side,level);
        assert.equal(unitSprite(id,side,level),asset);
        assert.equal(asset.width,SPRITE_SIZE.width*3);assert.equal(asset.height,SPRITE_SIZE.height*3);
        bounds(asset.ops,SPRITE_SIZE.width,SPRITE_SIZE.height,`${id}/${side}+${level}`);
        assert.ok(asset.ops.length>70);
        const colors=new Set(asset.ops.map(([color])=>color));
        assert.ok(colors.has(side==='enemy'?'#bc8480':'#688768'));
        assert.equal(colors.has(side==='enemy'?'#688768':'#bc8480'),false);
        stages.add(JSON.stringify(asset.ops));
      }
      assert.equal(stages.size,31);
    }
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
