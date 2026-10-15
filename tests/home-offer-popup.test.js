import test from 'node:test';
import assert from 'node:assert/strict';
import {createHomeOfferPopup,homeOfferMarkup} from '../src/home-offer-popup.js';
function setup(watch){
  let handler,calls=0,shown;
  const button={disabled:false,textContent:''},message={textContent:''};
  const card={dataset:{homeOffer:'red'},isConnected:true,querySelector:q=>q==='[data-detail-action]'?button:message};
  const dialog={querySelector:()=>card};
  const ui=createHomeOfferPopup({watch,buy:()=>{throw Error('not a purchase');},register:fn=>handler=fn,show:content=>shown=content,onSuccess:()=>calls++});
  return {ui,card,button,message,run:()=>handler('home-offer-claim',{item:'red'},dialog),calls:()=>calls,shown:()=>shown};
}
test('independent ad popup debounces repeated clicks and grants through the existing controller once',async()=>{
  let resolve,watches=0;const fixture=setup(()=>{watches++;return new Promise(r=>resolve=r);});
  fixture.ui.open('red');assert.equal(fixture.shown().title,'터치 부스터');assert.equal(watches,0);
  const pending=fixture.run();await fixture.run();assert.equal(watches,1);assert.equal(fixture.button.disabled,true);
  resolve({ok:true});await pending;assert.equal(fixture.calls(),1);assert.equal(fixture.button.textContent,'획득 완료');
  await fixture.run();assert.equal(watches,1);
});

test('home purchase buttons call auto/starter directly, never a store navigation',async()=>{
  for(const item of ['auto','max']){
    let handler,resolve,calls=0,received;
    const attributes={'aria-label':`${item==='auto'?'자동터치':'스타터팩'} 가격 구매`};
    const button={disabled:false,textContent:'',setAttribute:(name,value)=>attributes[name]=value},message={textContent:''};
    const card={dataset:{homeOffer:item},isConnected:true,querySelector:q=>q==='[data-detail-action]'?button:message};
    const dialog={querySelector:()=>card,close:()=>assert.fail('must stay in popup')};
    createHomeOfferPopup({watch:()=>assert.fail('not an ad'),buy:id=>{received=id;calls++;return new Promise(r=>resolve=r);},register:fn=>handler=fn});
    const p=handler('home-offer-claim',{item},dialog);await handler('home-offer-claim',{item},dialog);
    assert.equal(calls,1);assert.equal(received,item==='auto'?'auto':'starter');resolve({ok:false,reason:'pending'});await p;
    assert.match(message.textContent,/대기/);assert.equal(button.disabled,false);
    const completed=handler('home-offer-claim',{item},dialog);resolve({ok:true});await completed;
    assert.equal(button.disabled,true);assert.equal(button.textContent,'획득 완료');
    assert.equal(attributes['aria-label'],`${item==='auto'?'자동터치':'스타터팩'} 획득 완료`);
    const markup=homeOfferMarkup(item,{billing:{configured:true,price:'<fake>'},allowTestGrant:false}).body;
    assert.match(markup,/>&lt;fake&gt;<\/button>/);assert.match(markup,/aria-label="(?:자동터치|스타터팩) &lt;fake&gt; 구매"/);assert.doesNotMatch(markup,/max-store|<fake>/);
    assert.match(homeOfferMarkup(item,{owned:true,billing:{configured:true,price:'test'}}).body,/disabled/);
  }
});
test('home purchase CTA shows the fetched price once visually and names the product for accessibility',()=>{
  for(const [item,product,price,label] of [['auto','자동터치','₩4,900','4,900₩'],['max','스타터팩','KRW 5,900','5,900₩']]){
    const markup=homeOfferMarkup(item,{billing:{configured:true,price},allowTestGrant:false}).body;
    assert.ok(markup.includes(`aria-label="${product} ${label} 구매"`));
    assert.ok(markup.includes(`>${label}</button>`));
    assert.equal(markup.split(label).length-1,2,'one visible price plus its accessible label');
    assert.doesNotMatch(markup,/Google Play로 구매|예정 가격/);
    const foreign=homeOfferMarkup(item,{billing:{configured:true,price:'US$4.99'},allowTestGrant:false}).body;
    assert.ok(foreign.includes('>US$4.99</button>'));
    const missing=homeOfferMarkup(item,{billing:{configured:true,price:''},allowTestGrant:false}).body;
    assert.match(missing,/<button[^>]+disabled[^>]*>상품 확인 필요<\/button>/);
    assert.doesNotMatch(missing,/>[45],900₩<\/button>/);
    const owned=homeOfferMarkup(item,{billing:{configured:true,price},owned:true}).body;
    assert.match(owned,/<button[^>]+disabled[^>]*>보유 중<\/button>/);
  }
});
test('purchase price is escaped in visible text and the accessible attribute',()=>{
  const markup=homeOfferMarkup('auto',{billing:{configured:true,price:'" onfocus="bad"><script>bad</script>'},allowTestGrant:false}).body;
  assert.doesNotMatch(markup,/<script>|" onfocus="/);
  assert.match(markup,/aria-label="자동터치 &quot; onfocus=&quot;bad&quot;&gt;&lt;script&gt;bad&lt;\/script&gt; 구매"/);
});
test('ad cancellation permits retry and a closed popup never rewrites a different dialog',async()=>{
  const cancelled=setup(async()=>({ok:false,reason:'cancelled'}));await cancelled.run();
  assert.equal(cancelled.calls(),0);assert.equal(cancelled.button.disabled,false);assert.match(cancelled.message.textContent,/지급되지/);
  let resolve;const closed=setup(()=>new Promise(r=>resolve=r));const pending=closed.run();closed.card.isConnected=false;
  resolve({ok:true});await pending;assert.equal(closed.calls(),1);assert.notEqual(closed.button.textContent,'획득 완료');
});
