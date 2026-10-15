import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const encodes=JSON.parse(readFileSync(new URL('../docs/image-encodes.json',import.meta.url)));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
import {UNIT_LIST} from '../src/units.js';
import {RANKS} from '../src/ranks.js';
import {characterAtlas,characterIndex,drawCharacterPortrait,characterSprite} from '../src/character-art.js';

test('all35 ranks and every recruited unit map to packaged RGBA atlases without missing cells',()=>{
  assert.equal(RANKS.length,35);
  const cells=new Set();
  for(let i=0;i<RANKS.length;i++) {
    const spec=characterAtlas(i);cells.add(`${spec.url}:${spec.cell}`);
    const webp=readFileSync(new URL('../public'+spec.url,import.meta.url));
    assert.equal(webp.toString('ascii',0,4),'RIFF');
    assert.equal(webp.toString('ascii',8,12),'WEBP');
    assert.equal(webp.toString('ascii',12,16),'VP8L','lossless encoding');
    assert.equal(webp[20],0x2f);
    const bits=webp.readUInt32LE(21);
    assert.equal((bits & 0x3fff)+1,1536);
    assert.equal(((bits >>> 14) & 0x3fff)+1,1024);
    assert.equal((bits >>> 28) & 1,1,'alpha must be retained');
    const manifest=encodes.assets.find(a=>a.path==='public'+spec.url);
    assert.equal(hash(webp),manifest.sha256);
    assert.equal(hash(readFileSync(new URL('../'+manifest.source,import.meta.url))),manifest.sourceSha256);
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
