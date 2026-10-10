import test from 'node:test';
import assert from 'node:assert/strict';
import {ACHIEVEMENTS,FORMATION_ACHIEVEMENTS,BATTLE_ACHIEVEMENTS} from '../src/achievements.js';
import {medalSvg} from '../src/achievement-art.js';
import {battleMedalSvg} from '../src/battle-medal-art.js';
import {COUNTRIES} from '../src/campaign.js';

test('every medal renders after the five formations and four nations expand the catalog',()=>{
  for(const award of ACHIEVEMENTS){
    const svg=medalSvg(award.id);
    assert.match(svg,/<svg[^>]*viewBox="0 0 96 112"/);assert.doesNotMatch(svg,/undefined|NaN|Infinity/);
    assert.equal(medalSvg(award.id),svg);
    assert.doesNotMatch(svg,/\bid=|url\(#|href=|<image|<script/,'self-contained medals cannot refer to a hidden copy');
  }
});

test('five galactic formation medals have distinct copper stars, purple enamel and correct renamed titles',()=>{
  const newAwards=FORMATION_ACHIEVEMENTS.slice(-5),svgs=newAwards.map(a=>medalSvg(a.id));
  assert.equal(newAwards.length,5);assert.equal(new Set(svgs.map(svg=>svg.replace(/#[\da-f]{6}/gi,'color'))).size,5);
  for(const [i,svg]of svgs.entries()){
    assert.equal((svg.match(/class="galactic-medal-star"/g)??[]).length,i+1);
    assert.match(svg,/#69478e/);assert.match(svg,/#bb8253/);
    assert.ok((svg.match(/<(?:path|polygon|rect|circle|ellipse)\b/g)??[]).length>=50);
  }
  assert.equal(FORMATION_ACHIEVEMENTS.find(a=>a.id==='galacticCommand').title,'은하 연대장');
  assert.equal(FORMATION_ACHIEVEMENTS.find(a=>a.id==='galacticGroupCommand').title,'은하 사단장');
  assert.deepEqual(newAwards.map(a=>a.title),['은하 군단장','은하 야전군사령관','은하 집단군 사령관','은하 연합군 사령관','은하 대연합군 사령관']);
});

test('all ten nation conquest medals have distinct silhouettes and no off-canvas ornaments',()=>{
  const art=COUNTRIES.map(c=>medalSvg('conquer-'+c.id));
  assert.equal(new Set(art.map(svg=>svg.replace(/#[\da-f]{6}/gi,'color'))).size,10);
  for(const svg of art){
    for(const rect of svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)){
      const [,x,y,w,h]=rect.map(Number);assert.ok(x>=0&&y>=0&&x+w<=96&&y+h<=112);
    }
    for(const [,raw]of svg.matchAll(/<polygon points="([^"]+)"/g))for(const point of raw.split(' ')){
      const [x,y]=point.split(',').map(Number);assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=96&&y>=0&&y<=112);
    }
  }
  for(const bad of [-1,BATTLE_ACHIEVEMENTS.length,1.5,undefined])assert.throws(()=>battleMedalSvg(bad),RangeError);
});
