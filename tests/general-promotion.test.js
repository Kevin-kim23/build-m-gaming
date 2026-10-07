import test from 'node:test';
import assert from 'node:assert/strict';
import { RANK_DEFINITIONS, RANKS } from '../src/ranks.js';
import { promotionProfile, showPromotion, hidePromotion } from '../src/promotion.js';
import { generalPromotionMarkup } from '../src/general-promotion.js';
import { generalEmblem } from '../src/general-promotion-art.js';

test('only general ranks gain wings and bilateral salutes with all shots finished before fadeout',()=>{
  for(const [rank,definition] of RANK_DEFINITIONS.entries()){
    const p=promotionProfile(rank);
    if(definition.kind!=='general') { assert.equal(p.generalTier,0);assert.equal(p.salvos,0);continue; }
    assert.equal(p.generalTier,definition.marks);
    assert.equal(p.salvos,definition.marks+2);
    assert.ok(p.saluteDelay+140+(p.salvos-1)*p.salvoInterval+1150<p.duration*.89);
    const html=generalPromotionMarkup(rank,p);
    assert.match(html,/general-salute left/);assert.match(html,/general-salute right/);
    assert.equal((html.match(/class="salute-shot"/g)||[]).length,2*p.salvos);
    assert.match(html,new RegExp(`${definition.name}<span>진급을 명합니다`));
    assert.match(html,/data-dismiss-promotion/);assert.doesNotMatch(html,/undefined|NaN|진급!/);
  }
});

test('general artwork is cached, tier-specific and resolves every unique gradient reference',()=>{
  const art=[];
  for(let tier=1;tier<=9;tier++){
    const svg=generalEmblem(tier);art.push(svg);assert.equal(generalEmblem(tier),svg);
    const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(ids.length,new Set(ids).size);
    for(const [,id] of svg.matchAll(/url\(#([^)]*)\)/g))assert.ok(ids.includes(id));
    assert.equal((svg.match(/<g class="general-rank-stars">([^]*?)<\/g>/)[1].match(/<polygon/g)||[]).length,tier>=6?tier-5:tier);
    assert.match(svg,/viewBox="0 0 600 330"/);assert.doesNotMatch(svg,/<image|https?:|<script/);
  }
  assert.equal(new Set(art).size,9);
  for(const value of [0,10,NaN,1.5])assert.throws(()=>generalEmblem(value),RangeError);
});

test('repeated ceremonies reuse one dialog, replace one timeout and clear general styling for normal promotions',()=>{
  const prior={document:global.document,setTimeout:global.setTimeout,clearTimeout:global.clearTimeout};
  const pending=new Map(),events=new Map(),classes=new Set();let next=0,created=0,attached=0,normalIcons=0;
  const dialog={open:false,attributes:{},style:{setProperty(){}},classList:{toggle(key,on){on?classes.add(key):classes.delete(key);}},
    setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,fn){assert.ok(!events.has(k));events.set(k,fn);},
    showModal(){this.open=true;},close(){this.open=false;events.get('close')();}};
  global.document={createElement(tag){assert.equal(tag,'dialog');created++;return dialog;},body:{appendChild(){attached++;}}};
  global.setTimeout=(fn,ms)=>{pending.set(++next,{fn,ms});return next;};
  global.clearTimeout=id=>pending.delete(id);
  const insignia=()=>{normalIcons++;return '<span>normal rank</span>';};
  try{
    showPromotion(RANKS.indexOf('준장'),insignia);assert.ok(classes.has('is-general'));assert.equal(pending.size,1);assert.equal(normalIcons,0);
    showPromotion(RANKS.indexOf('대장'),insignia);assert.equal(pending.size,1);assert.equal(created,1);assert.equal(attached,1);
    assert.match(dialog.innerHTML,/대장<span>/);assert.equal(dialog.attributes['aria-label'],'대장 장성 진급식');
    events.get('click')({target:{closest:()=>true}});assert.equal(dialog.open,false);assert.equal(pending.size,0);
    showPromotion(RANKS.indexOf('대령'),insignia);assert.ok(!classes.has('is-general'));assert.ok(classes.has('is-field'));assert.equal(normalIcons,1);assert.match(dialog.innerHTML,/대령 진급!/);
    const timeout=[...pending.values()][0];assert.equal(timeout.ms,3000);timeout.fn();assert.equal(dialog.open,false);assert.equal(pending.size,0);
    showPromotion(RANKS.indexOf('병장'),insignia);assert.ok(classes.has('is-simple'));assert.ok(!classes.has('is-field'));assert.equal(normalIcons,1);assert.doesNotMatch(dialog.innerHTML,/wing/);assert.equal(pending.size,1);
    showPromotion(RANKS.indexOf('소장'),insignia);dialog.close();assert.equal(pending.size,0);
    assert.ok(!classes.has('is-simple'));assert.ok(!classes.has('is-field'));
    hidePromotion();assert.equal(dialog.open,false);
  } finally { hidePromotion();Object.assign(global,prior); }
});
