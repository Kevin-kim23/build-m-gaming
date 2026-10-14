import test from 'node:test';
import assert from 'node:assert/strict';
import { guideRoute,spotlightLayout } from '../src/guide-route.js';
const school={ready:true,panel:'shop',category:'recruit',selector:'[data-upgrade-school="nco"]',text:'건설'};
test('school guide closes another standalone popup before using the home recruit shortcut',()=>{
  assert.equal(guideRoute(school).selector,'#open-recruit');
  assert.equal(guideRoute(school,{panel:'equipment',category:'military'}).selector,'#close-equipment');
  assert.equal(guideRoute(school,{panel:'shop',category:'store'}).selector,'#close-shop');
  assert.equal(guideRoute(school,{panel:'shop',category:'recruit'}).selector,school.selector);
  assert.equal(guideRoute(school,{panel:'shop',category:'facilities'}).selector,'#close-shop');
  assert.equal(guideRoute(school,{panel:'shop',category:'items'}).selector,'#close-shop');
  assert.equal(guideRoute(school).selector,'#open-recruit','closing another screen does not complete the lesson');
});
test('promotion, reward, battle, settings and inactive funds block the spotlight',()=>{
  assert.equal(guideRoute(school,{blocked:true}),null);
  assert.equal(guideRoute({...school,ready:false}),null);
});
test('equipment guide closes the personal screen and targets the exact military list row',()=>{
  const step={...school,panel:'equipment',category:'military',item:'artillery',selector:'[data-enhance-equipment="artillery"]'};
  assert.equal(guideRoute(step).selector,'#open-equipment');
  assert.equal(guideRoute(step,{panel:'equipment',category:'personal'}).selector,'#close-equipment');
  assert.equal(guideRoute(step,{panel:'shop',category:'recruit'}).selector,'#close-shop');
  assert.equal(guideRoute(step,{panel:'equipment',category:'military',item:'tank'}).selector,step.selector);
  assert.equal(guideRoute(step,{panel:'equipment',category:'military'}).selector,step.selector);
});
test('each standalone home destination is reached without removed integrated tabs',()=>{
  for(const [panel,category,selector] of [
    ['shop','recruit','#open-recruit'],['shop','store','#open-shop'],
    ['shop','facilities','#open-facilities'],['shop','items','#open-items'],
    ['equipment','military','#open-equipment'],['equipment','personal','#open-personal'],
  ]) {
    const step={...school,panel,category};
    assert.equal(guideRoute(step).selector,selector);
    assert.equal(guideRoute(step,{panel:panel==='shop'?'equipment':'shop',category:'other'}).selector,
      panel==='shop'?'#close-equipment':'#close-shop');
  }
});
test('spotlight shades leave the target exposed and dialogue avoids it at mobile sizes',()=>{
  for(const [w,h] of [[320,480],[360,800],[412,915],[844,390]])for(const y of [30,h/2,h-60]) {
    const layout=spotlightLayout({left:24,right:w-24,top:y,bottom:y+44},w,h,180,{top:24,bottom:24});
    const hole=layout.hole;
    for(const r of layout.shades) {
      assert.ok(r.width>=0&&r.height>=0);
      const overlap=Math.max(0,Math.min(r.x+r.width,hole.x+hole.width)-Math.max(r.x,hole.x))*Math.max(0,Math.min(r.y+r.height,hole.y+hole.height)-Math.max(r.y,hole.y));
      assert.equal(overlap,0);
    }
    const b=layout.bubble,height=Math.min(180,b.maxHeight);
    assert.ok(b.top>=24&&b.top+height<=h-24);
    assert.ok(b.top+height<=hole.y||b.top>=hole.y+hole.height);
  }
});
