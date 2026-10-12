import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {UNIT_LIST} from '../src/units.js';
import {RANKS} from '../src/ranks.js';
import {characterAtlas,characterIndex,drawCharacterPortrait,characterSprite} from '../src/character-art.js';

test('all35 ranks and every recruited unit map to packaged RGBA atlases without missing cells',()=>{
  assert.equal(RANKS.length,35);
  const cells=new Set();
  for(let i=0;i<RANKS.length;i++) {
    const spec=characterAtlas(i);cells.add(`${spec.url}:${spec.cell}`);
    const png=readFileSync(new URL('../public'+spec.url,import.meta.url));
    assert.equal(png.toString('ascii',1,4),'PNG');
    assert.equal(png.readUInt32BE(16),1536);assert.equal(png.readUInt32BE(20),1024);
    assert.equal(png[25],6,'RGBA alpha must be retained');
  }
  assert.equal(cells.size,30);
  assert.equal(new Set(UNIT_LIST.map(u=>characterIndex(u.id))).size,UNIT_LIST.length);
  for(const u of UNIT_LIST)assert.ok(characterAtlas(characterIndex(u.id)),u.id);
});

test('one atlas loads once for six cells and a delayed portrait cannot overwrite a newer selection',async()=>{
  const oldDocument=globalThis.document,oldImage=globalThis.Image;
  const images=[];
  const makeCanvas=()=>{const draws=[];return {width:96,height:120,draws,getContext(){return {
    clearRect(){},drawImage(...args){draws.push(args);},getImageData(){return {data:new Uint8ClampedArray(16).fill(255)};}
  };}};};
  globalThis.document={createElement:makeCanvas};
  globalThis.Image=class{constructor(){this.naturalWidth=6;this.naturalHeight=4;images.push(this);}};
  try {
    const canvas=makeCanvas();drawCharacterPortrait(canvas,0);drawCharacterPortrait(canvas,1);drawCharacterPortrait(canvas,1);
    assert.equal(images.length,1);images[0].onload();await Promise.resolve();
    assert.equal(canvas.draws.length,1);assert.equal(canvas.draws[0][0],characterSprite(1));
    drawCharacterPortrait(canvas,6);assert.equal(images.length,2);
    drawCharacterPortrait(canvas,0);const last=canvas.draws.at(-1)[0];
    images[1].onload();await Promise.resolve();
    assert.equal(canvas.draws.at(-1)[0],last,'delayed old selection must not overwrite current');
    assert.equal(images.length,2);
  } finally {
    if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;
    if(oldImage===undefined)delete globalThis.Image;else globalThis.Image=oldImage;
  }
});
