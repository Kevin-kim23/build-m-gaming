import test from 'node:test';
import assert from 'node:assert/strict';
import {drawLane,LANE_CANVAS} from '../src/lane-art.js';

function canvas() {
  const ops=[],ctx={setTransform(){},save(){},restore(){},drawImage(){},fillRect(...rect){ops.push([this.fillStyle,...rect]);}};
  return {width:360,height:440,clientWidth:360,ops,getContext:()=>ctx};
}
test('orbital strike renders a descending blue beam on the enemy HQ, distinct from the unchanged ICBM effect',()=>{
  const previous=globalThis.document;globalThis.document={createElement:canvas};
  try {
    const army=()=>({hq:{id:'battalion',hp:100,maxHp:100},units:[]});
    const render=(id,age,side='player')=>{
      const target=canvas();drawLane(target,{elapsed:age,countryId:'serdin',player:army(),enemy:army(),fx:[{kind:'strike',at:0,id,side}]});return target.ops;
    };
    for(const side of ['player','enemy'])for(const age of [0,50,160,200,320,590,600]) {
      const ops=render('orbitalAssault',age,side);assert.ok(ops.length>0);
      for(const [,x,y,w,h]of ops) {
        assert.ok([x,y,w,h].every(Number.isFinite));
        assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=LANE_CANVAS.width&&y+h<=LANE_CANVAS.height);
      }
    }
    const early=render('orbitalAssault',50),later=render('orbitalAssault',160);
    assert.ok(early[0][2]===0&&later[0][4]>early[0][4],'beam descends from the top edge');
    const blue=render('orbitalAssault',320),orange=render('icbm',320);
    assert.ok(blue.some(([color])=>color==='#82eaff'));
    assert.ok(orange.some(([color])=>color==='#ffd9a0'));
    assert.ok(!orange.some(([color])=>color==='#82eaff'));
    assert.ok(blue.some(([color,x,y,w,h])=>color==='#edffff'&&x<=180&&x+w>=180&&y<=56&&y+h>=56),'impact hits the upper enemy HQ center');
    assert.deepEqual(render('orbitalAssault',601),[],'expired effects do not render');
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
