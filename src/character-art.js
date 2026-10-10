import { UNITS } from './units.js';
import { RANKS } from './ranks.js';
import { reportError } from './diagnostics.js';

// Original AI-generated male pixel portraits, six cells per transparent atlas.
// One decoded atlas at a time, then only small, trimmed sprites remain cached.
const atlases = new Map(), sprites = new Map(), waiting = new WeakMap();
let revision = 0;
export const characterArtRevision = () => revision;
export function characterIndex(id) {
  const early = {soldier:0, administrator:1, driver:2, medic:3};
  return early[id] ?? RANKS.indexOf(UNITS[id]?.name);
}
export function characterAtlas(index) {
  if (!Number.isInteger(index) || index < 0 || index >= RANKS.length) return null;
  return {url:`${import.meta.env?.BASE_URL ?? '/'}characters/ranks-${Math.floor(index/6)+1}.png`, cell:index%6};
}
function load(index) {
  const atlas=characterAtlas(index);
  if (!atlas || typeof Image === 'undefined') return null;
  if (atlases.has(atlas.url)) return atlases.get(atlas.url);
  const promise=new Promise(resolve=>{
    const image=new Image();
    image.onload=()=>{
      try {
        const sheet=document.createElement('canvas');
        sheet.width=image.naturalWidth;sheet.height=image.naturalHeight;
        const ctx=sheet.getContext('2d',{willReadFrequently:true});
        ctx.drawImage(image,0,0);
        const w=sheet.width/3,h=sheet.height/2,start=Math.floor(index/6)*6;
        for(let cell=0;cell<6;cell++) {
          const sx=(cell%3)*w,sy=Math.floor(cell/3)*h;
          const pixels=ctx.getImageData(sx,sy,w,h).data;
          let left=w,top=h,right=0,bottom=0;
          for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(pixels[(y*w+x)*4+3]>=128){
            left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
          }
          if(right<left || bottom<top)throw Error('Empty character cell');
          const sw=right-left+1,sh=bottom-top+1;
          const sprite=document.createElement('canvas');
          sprite.height=192;sprite.width=Math.ceil(sw*192/sh);
          const c=sprite.getContext('2d');c.imageSmoothingEnabled=false;
          c.drawImage(image,sx+left,sy+top,sw,sh,0,0,sprite.width,sprite.height);
          sprites.set(start+cell,sprite);
        }
        sheet.width=sheet.height=1;
        revision++;
        globalThis.dispatchEvent?.(new Event('character-art-ready'));
        resolve(true);
      } catch(error) {reportError('characters.decode',error);resolve(false);}
    };
    image.onerror=()=>{reportError('characters.load',new Error(atlas.url));resolve(false);};
    image.src=atlas.url;
  });
  atlases.set(atlas.url,promise);
  return promise;
}
export function characterSprite(index) {
  if (!sprites.has(index)) load(index);
  return sprites.get(index) ?? null;
}
export function drawCharacterPortrait(canvas,index) {
  if (!characterAtlas(index)) return false;
  const previous=waiting.get(canvas);
  waiting.set(canvas,index);
  const asset=characterSprite(index);
  if (!asset) {
    if (previous!==index) {
      load(index)?.then(ready=>{if(ready && waiting.get(canvas)===index)drawCharacterPortrait(canvas,index);});
    }
    return false;
  }
  const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;
  const scale=Math.min((canvas.width-8)/asset.width,(canvas.height-8)/asset.height);
  const w=Math.round(asset.width*scale),h=Math.round(asset.height*scale);
  c.drawImage(asset,Math.floor((canvas.width-w)/2),canvas.height-h-4,w,h);
  return true;
}
