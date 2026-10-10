import test from 'node:test';
import assert from 'node:assert/strict';
import {drawLane,LANE_CANVAS} from '../src/lane-art.js';
import {battleNumber} from '../src/battle-format.js';
function canvas(){
  const ops=[],lines=[],ctx={setTransform(){},save(){},restore(){},drawImage(){},translate(){},rotate(){},beginPath(){},moveTo(){},lineTo(){},ellipse(){},strokeRect(){},stroke(){lines.push(this.strokeStyle);},fillRect(...r){ops.push([this.fillStyle,...r]);}};
  return {width:360,height:440,clientWidth:360,ops,lines,getContext:()=>ctx};
}
test('strike weapons show charge beams or ballistic payloads and target the opposing HQ',()=>{
  const old=globalThis.document;globalThis.document={createElement:canvas};
  try{
    const army=()=>({hq:{id:'galacticGrandAlliedArmy',hp:1e17,maxHp:1e17},units:[]});
    const render=(id,age,side='player')=>{const c=canvas();drawLane(c,{elapsed:age,countryId:'noctaris',player:army(),enemy:army(),fx:[{kind:'strike',at:0,id,side}]});return c;};
    for(const id of ['icbm','orbitalAssault','novaCannon'])for(const side of ['player','enemy'])for(const age of [0,80,160,260,400,590]){
      for(const [,x,y,w,h]of render(id,age,side).ops){assert.ok([x,y,w,h].every(Number.isFinite));assert.ok(w>0&&h>0);}
    }
    assert.ok(render('orbitalAssault',320).lines.includes('#9cecff'));
    assert.ok(render('novaCannon',320).lines.includes('#e3b2ff'));
    assert.ok(render('icbm',160).ops.some(([c])=>c==='#ffad65'));
    assert.notDeepEqual(render('orbitalAssault',80).ops,render('icbm',80).ops);
    assert.deepEqual(render('orbitalAssault',601).ops,[]);
    assert.match(battleNumber(7.2e16),/경/);
  }finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}
});
