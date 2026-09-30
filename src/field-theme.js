import { rankForArmy, GENERAL_RANK } from './ranks.js';

export const FIELD_THEMES = Object.freeze({ earth: '흙 연병장', concrete: '회색 시멘트' });
export const canChooseFieldTheme = state => rankForArmy(state) >= GENERAL_RANK;
export const fieldTheme = state => canChooseFieldTheme(state) && state.fieldTheme === 'concrete' ? 'concrete' : 'earth';
export function setFieldTheme(state, theme) {
  if (!Object.hasOwn(FIELD_THEMES, theme)) return { ok: false, reason: 'invalid' };
  if (theme !== 'earth' && !canChooseFieldTheme(state)) return { ok: false, reason: 'locked' };
  state.fieldTheme = theme;
  return { ok: true, theme };
}

// Static concrete slabs, drainage and painted parking lines; generated only on theme/size changes.
export function concreteTerrain(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  const r = (x,y,w,h,color) => { ctx.fillStyle = color; ctx.fillRect(x,y,w,h); };
  r(0,0,width,height,'#aeb3b5');
  for (let y=0;y<height;y+=38) for(let x=8;x<width-8;x+=46) {
    r(x,y,45,37,((x+y)%3===0)?'#b9bdbf':'#b3b8ba');
    r(x,y,44,1,'#ccd0d1'); r(x,y+37,46,1,'#949da1');
  }
  r(0,0,7,height,'#7b878c'); r(width-7,0,7,height,'#7b878c');
  for(let y=4;y<height;y+=8) { r(2,y,3,4,'#536168'); r(width-5,y,3,4,'#536168'); }
  r(10,height-52,width-20,1,'#e9e8d5');
  for(let i=0;i<=4;i++)r(Math.round(10+(width-20)*i/4),height-52,1,27,'#e9e8d5');
  return canvas;
}
