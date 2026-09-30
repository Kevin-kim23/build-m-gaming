import test from 'node:test';
import assert from 'node:assert/strict';
import { ownedSchools, layoutFieldSchools } from '../src/field-schools.js';
import { layoutFieldEquipment, layoutFieldArmy } from '../src/field-layout.js';

test('only built schools appear, in NCO then officer order with their actual levels', () => {
  assert.deepEqual(ownedSchools({}),[]);
  assert.equal(ownedSchools({ncoSchoolLevel:5}).length,1);
  assert.deepEqual(ownedSchools({ncoSchoolLevel:5,officerSchoolLevel:1}).map(s=>[s.id,s.level]),[['nco',5],['officer',1]]);
});

test('campuses fit narrow fields above zero to four weapons and below packed armies', () => {
  for(const width of [160,180,240]) for(const height of [170,210]) for(const count of [0,1,4]) {
    const gear=layoutFieldEquipment(Array.from({length:count},()=>({})),width,height);
    const schools=layoutFieldSchools(ownedSchools({ncoSchoolLevel:5,officerSchoolLevel:1}),gear,width,height);
    assert.ok(schools[0].x+schools[0].width<schools[1].x);
    for(const s of schools){
      assert.ok(s.x>=0 && s.x+s.width<=width && s.y>=0);
      assert.ok(s.y+s.height+7 < (gear.length?gear[0].y:height-16));
    }
    const area={x:13,y:34,width:width-26,height:schools[0].y-34-8};
    const army=layoutFieldArmy({soldiers:17000},area);
    assert.ok(army.length>0);
    assert.ok(army.every(item=>item.y+item.boxHeight<schools[0].y));
  }
});

test('short general fields keep army labels beside the campus and above all four vehicles', async () => {
  const { fieldArmyArea } = await import('../src/field-schools.js');
  for(const width of [160,195,240]) for(const height of [100,120,140]) for(const officer of [0,1]) {
    const gear=layoutFieldEquipment(Array.from({length:4},()=>({})),width,height);
    const schools=layoutFieldSchools(ownedSchools({ncoSchoolLevel:5,officerSchoolLevel:officer}),gear,width,height);
    const area=fieldArmyArea(schools,gear,width,height);
    const army=layoutFieldArmy({soldiers:12440},area);
    assert.ok(army.length>0);
    for(const item of army) {
      assert.ok(item.y+item.boxHeight < gear[0].y);
      for(const school of schools)assert.ok(item.x>=school.x+school.width+4 || item.y+item.boxHeight<school.y);
    }
  }
});
